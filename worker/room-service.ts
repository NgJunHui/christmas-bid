/**
 * Everything a game room does, independent of the Cloudflare runtime.
 * The GameRoom Durable Object plugs in real storage, sockets, and alarms;
 * integration tests plug in in-memory fakes.
 *
 * Every mutation runs through `exclusive()`, so even across `await`s
 * (hashing, storage) two commands can never interleave. A change is
 * persisted with a single write before it is broadcast; a failed write
 * leaves the in-memory state untouched.
 */
import { CLOSE_CODES, LIMITS } from "../lib/game/constants";
import {
  addPlayer,
  applyCommand,
  createRoom,
  currentRound,
  hasProcessed,
  recordRequest,
  removePlayer,
  settle,
  type EngineContext,
} from "../lib/game/engine";
import { cryptoRandom } from "../lib/game/order";
import { clientMessageSchema, type ServerMessage, type SessionResponse } from "../lib/game/protocol";
import type { GameCommand, GameError, RoomState, StateCause } from "../lib/game/types";
import { toClientView } from "../lib/game/view";
import { formatToken, hashSecret, newSecret, parseToken, safeEqual } from "./tokens";

export interface RoomStorage {
  load(): Promise<RoomState | null>;
  save(state: RoomState): Promise<void>;
  setAlarm(at: number | null): Promise<void>;
  destroy(): Promise<void>;
}

export interface SocketLike {
  send(message: string): void;
  close(code?: number, reason?: string): void;
}

export interface Connection {
  socket: SocketLike;
  playerId: string;
}

export interface SocketHub {
  list(): Connection[];
}

export interface RoomServiceDeps {
  storage: RoomStorage;
  hub: SocketHub;
  now?: () => number;
  random?: () => number;
  newId?: () => string;
  /** Called once when an expired room is torn down (e.g. to free its code). */
  onExpire?: (state: RoomState) => Promise<void>;
}

export type Outcome<T> = ({ ok: true } & T) | { ok: false; error: GameError };

const fail = (code: GameError["code"], message: string) => ({ ok: false as const, error: { code, message } });

/** Token bucket per socket: bursts of 10, refilling 5 messages per second. */
const BUCKET_CAPACITY = 10;
const BUCKET_REFILL_PER_MS = 5 / 1000;

export class RoomService {
  private state: RoomState | null = null;
  private loaded = false;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly buckets = new WeakMap<SocketLike, { tokens: number; at: number }>();
  private readonly storage: RoomStorage;
  private readonly hub: SocketHub;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly newId: () => string;
  private readonly onExpire?: (state: RoomState) => Promise<void>;

  constructor(deps: RoomServiceDeps) {
    this.storage = deps.storage;
    this.hub = deps.hub;
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? cryptoRandom;
    this.newId = deps.newId ?? (() => crypto.randomUUID());
    this.onExpire = deps.onExpire;
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  async hydrate(): Promise<void> {
    if (this.loaded) return;
    this.state = await this.storage.load();
    this.loaded = true;
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private context(): EngineContext {
    return { now: this.now(), random: this.random, newId: this.newId };
  }

  /** Current state, tearing the room down first if it has expired. */
  private async current(): Promise<RoomState | null> {
    await this.hydrate();
    if (this.state && this.now() >= this.state.expiresAt) await this.expire();
    return this.state;
  }

  private async expire(): Promise<void> {
    const expired = this.state;
    if (!expired) return;
    for (const { socket } of this.hub.list()) {
      try {
        socket.close(CLOSE_CODES.expired, "Room expired");
      } catch {
        /* already closed */
      }
    }
    this.state = null;
    await this.storage.destroy();
    await this.onExpire?.(expired);
  }

  private nextAlarm(state: RoomState): number {
    const round = currentRound(state);
    if (state.phase === "BIDDING" && round?.timerEndsAt) return round.timerEndsAt;
    return state.expiresAt;
  }

  private async commit(next: RoomState, cause: StateCause): Promise<void> {
    await this.storage.save(next);
    this.state = next;
    await this.storage.setAlarm(this.nextAlarm(next));
    this.broadcast(cause);
  }

  /* ---------------------------------------------------------------- */
  /* Sessions                                                          */
  /* ---------------------------------------------------------------- */

  private async verify(state: RoomState, token: string | null | undefined): Promise<string | null> {
    const parsed = parseToken(token);
    if (!parsed || parsed.roomId !== state.id) return null;
    const player = state.players.find((p) => p.id === parsed.playerId);
    if (!player) return null;
    return safeEqual(await hashSecret(parsed.secret), player.tokenHash) ? player.id : null;
  }

  async init(input: {
    roomId: string;
    code: string;
    displayName: string;
    startingCredits: number;
    biddingSeconds?: number;
  }): Promise<{ playerId: string; token: string }> {
    return this.exclusive(async () => {
      await this.hydrate();
      if (this.state) throw new Error("Room already initialised");
      const playerId = this.newId();
      const secret = newSecret();
      const state = createRoom(
        {
          roomId: input.roomId,
          code: input.code,
          startingCredits: input.startingCredits,
          biddingSeconds: input.biddingSeconds,
          host: { id: playerId, displayName: input.displayName, tokenHash: await hashSecret(secret) },
        },
        { now: this.now() },
      );
      await this.commit(state, "ROOM_CREATED");
      return { playerId, token: formatToken(input.roomId, playerId, secret) };
    });
  }

  async join(input: {
    code: string;
    displayName: string;
    token?: string | null;
  }): Promise<Outcome<{ playerId: string; token: string; rejoined: boolean }>> {
    return this.exclusive(async () => {
      const state = await this.current();
      if (!state || state.code !== input.code) return fail("NOT_FOUND", "We couldn't find a room with that code.");

      // Same browser coming back: restore the existing seat, no new credits.
      const existing = await this.verify(state, input.token);
      if (existing && input.token) return { ok: true, playerId: existing, token: input.token, rejoined: true };

      const playerId = this.newId();
      const secret = newSecret();
      const result = addPlayer(
        state,
        { id: playerId, displayName: input.displayName, tokenHash: await hashSecret(secret) },
        { now: this.now() },
      );
      if (!result.ok) return { ok: false, error: result.error };
      await this.commit(result.state, "PLAYER_JOINED");
      return { ok: true, playerId, token: formatToken(state.id, playerId, secret), rejoined: false };
    });
  }

  async session(token: string | null, code: string): Promise<SessionResponse | null> {
    const state = await this.current();
    if (!state || state.code !== code) return null;
    const playerId = await this.verify(state, token);
    return playerId ? { roomId: state.id, code: state.code, playerId, phase: state.phase } : null;
  }

  async authenticate(
    token: string | null,
    code: string,
  ): Promise<{ ok: true; playerId: string } | { ok: false; closeCode: number; reason: string }> {
    const state = await this.current();
    if (!state || state.code !== code) return { ok: false, closeCode: CLOSE_CODES.notFound, reason: "Room not found" };
    const playerId = await this.verify(state, token);
    return playerId
      ? { ok: true, playerId }
      : { ok: false, closeCode: CLOSE_CODES.unauthorized, reason: "Not a player in this room" };
  }

  /**
   * Leaving the lobby frees a guest's seat; the host leaving closes the room.
   * Once the game has started, seats are kept so people can come back.
   */
  async leave(token: string | null, code: string): Promise<Outcome<{ left: boolean }>> {
    return this.exclusive(async () => {
      const state = await this.current();
      if (!state || state.code !== code) return fail("NOT_FOUND", "We couldn't find that room.");
      const playerId = await this.verify(state, token);
      if (!playerId) return fail("UNAUTHORIZED", "You're not in this room.");
      if (state.phase !== "LOBBY") return { ok: true, left: false };

      const result =
        playerId === state.hostPlayerId
          ? applyCommand(state, playerId, { type: "GAME_END" }, this.context())
          : removePlayer(state, playerId, { now: this.now() });
      if (!result.ok) return { ok: false, error: result.error };
      if (result.duplicate) return { ok: true, left: true };
      await this.commit(result.state, result.cause);
      for (const connection of this.hub.list()) {
        if (connection.playerId === playerId) connection.socket.close(CLOSE_CODES.leftRoom, "Left the room");
      }
      return { ok: true, left: true };
    });
  }

  /* ---------------------------------------------------------------- */
  /* Sockets                                                           */
  /* ---------------------------------------------------------------- */

  private send(socket: SocketLike, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      /* socket closed mid-send; it will reconnect and resync */
    }
  }

  /** Send every connected player their own sanitized snapshot. */
  private broadcast(cause: StateCause, exclude?: SocketLike): void {
    const state = this.state;
    if (!state) return;
    const connections = this.hub.list().filter((c) => c.socket !== exclude);
    const connected = new Set(connections.map((c) => c.playerId));
    const now = this.now();
    for (const { socket, playerId } of connections) {
      if (!state.players.some((p) => p.id === playerId)) continue;
      this.send(socket, { type: "ROOM_STATE", cause, view: toClientView(state, playerId, connected, now) });
    }
  }

  async connect(socket: SocketLike, playerId: string): Promise<void> {
    await this.exclusive(async () => {
      const state = await this.current();
      if (!state) return;
      const settled = settle(state, this.now());
      if (settled) await this.commit(settled.state, settled.cause);
      // Everyone (including the new socket) gets a fresh snapshot with updated presence.
      this.broadcast("CONNECTION_CHANGED");
    });
  }

  async disconnect(socket: SocketLike): Promise<void> {
    await this.exclusive(async () => {
      if (!(await this.current())) return;
      this.broadcast("CONNECTION_CHANGED", socket);
    });
  }

  private allow(socket: SocketLike): boolean {
    const now = this.now();
    const bucket = this.buckets.get(socket) ?? { tokens: BUCKET_CAPACITY, at: now };
    bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + (now - bucket.at) * BUCKET_REFILL_PER_MS);
    bucket.at = now;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(socket, bucket);
    return allowed;
  }

  async message(socket: SocketLike, playerId: string, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string" || raw.length > LIMITS.maxMessageBytes) {
      return this.send(socket, { type: "ERROR", requestId: null, code: "INVALID_INPUT", message: "Message rejected." });
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return this.send(socket, { type: "ERROR", requestId: null, code: "INVALID_INPUT", message: "Message rejected." });
    }
    const parsed = clientMessageSchema.safeParse(json);
    const requestId =
      typeof (json as { requestId?: unknown })?.requestId === "string"
        ? ((json as { requestId: string }).requestId.slice(0, 64))
        : null;
    if (!parsed.success) {
      return this.send(socket, { type: "ERROR", requestId, code: "INVALID_INPUT", message: "Message rejected." });
    }
    const msg = parsed.data;

    // Clock sync is cheap and doesn't count against the rate limit.
    if (msg.type === "PING") {
      return this.send(socket, { type: "PONG", requestId: msg.requestId, t: msg.t, serverNow: this.now() });
    }
    if (!this.allow(socket)) {
      return this.send(socket, {
        type: "ERROR",
        requestId: msg.requestId,
        code: "RATE_LIMITED",
        message: "Whoa, slow down a little.",
      });
    }

    await this.exclusive(async () => {
      const state = await this.current();
      if (!state) {
        this.send(socket, { type: "ERROR", requestId: msg.requestId, code: "NOT_FOUND", message: "This room is gone." });
        socket.close(CLOSE_CODES.notFound, "Room not found");
        return;
      }
      if (!state.players.some((p) => p.id === playerId)) {
        socket.close(CLOSE_CODES.unauthorized, "Not a player in this room");
        return;
      }

      // Finalize an expired countdown before judging the command against it.
      const settled = settle(state, this.now());
      const base = settled?.state ?? state;

      if (msg.type === "STATE_REQUEST") {
        if (settled) await this.commit(settled.state, settled.cause);
        const connected = new Set(this.hub.list().map((c) => c.playerId));
        this.send(socket, {
          type: "ROOM_STATE",
          cause: "SNAPSHOT",
          view: toClientView(base, playerId, connected, this.now()),
        });
        this.send(socket, { type: "ACK", requestId: msg.requestId, duplicate: false });
        return;
      }

      if (hasProcessed(base, msg.requestId)) {
        if (settled) await this.commit(settled.state, settled.cause);
        this.send(socket, { type: "ACK", requestId: msg.requestId, duplicate: true });
        return;
      }

      const { requestId: id, ...command } = msg;
      const result = applyCommand(base, playerId, command as GameCommand, this.context());
      if (!result.ok || result.duplicate) {
        if (settled) await this.commit(settled.state, settled.cause);
        this.send(
          socket,
          result.ok
            ? { type: "ACK", requestId: id, duplicate: true }
            : { type: "ERROR", requestId: id, code: result.error.code, message: result.error.message },
        );
        return;
      }
      await this.commit(recordRequest(result.state, id), result.cause);
      this.send(socket, { type: "ACK", requestId: id, duplicate: false });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Alarm                                                             */
  /* ---------------------------------------------------------------- */

  async alarm(): Promise<void> {
    await this.exclusive(async () => {
      const state = await this.current();
      if (!state) return;
      const settled = settle(state, this.now());
      if (settled) await this.commit(settled.state, settled.cause);
      else await this.storage.setAlarm(this.nextAlarm(state));
    });
  }

  /** Test/debug helper: the raw state. Never sent to clients. */
  async snapshot(): Promise<RoomState | null> {
    await this.hydrate();
    return this.state ? structuredClone(this.state) : null;
  }
}
