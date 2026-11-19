/**
 * Integration tests for the room service: the full server path (sessions,
 * sockets, persistence, alarms) with in-memory fakes for the Cloudflare runtime.
 */
import { describe, expect, it } from "vitest";
import { CLOSE_CODES, ROOM_TTL_MS } from "../../lib/game/constants";
import type { ServerMessage } from "../../lib/game/protocol";
import type { ClientView, RoomState } from "../../lib/game/types";
import { RoomService, type Connection, type RoomStorage, type SocketLike } from "../../worker/room-service";
import { seeded } from "../helpers";

class FakeSocket implements SocketLike {
  sent: ServerMessage[] = [];
  raw: string[] = [];
  closed: { code?: number; reason?: string } | null = null;
  send(message: string) {
    this.raw.push(message);
    this.sent.push(JSON.parse(message) as ServerMessage);
  }
  close(code?: number, reason?: string) {
    this.closed = { code, reason };
  }
  lastView(): ClientView {
    const states = this.sent.filter((m) => m.type === "ROOM_STATE");
    const last = states.at(-1);
    if (!last || last.type !== "ROOM_STATE") throw new Error("No state received");
    return last.view;
  }
  lastReply(requestId: string) {
    return this.sent.findLast((m) => (m.type === "ACK" || m.type === "ERROR") && m.requestId === requestId);
  }
}

class MemoryStorage implements RoomStorage {
  data: RoomState | null = null;
  alarm: number | null = null;
  destroyed = false;
  async load() {
    return this.data ? structuredClone(this.data) : null;
  }
  async save(state: RoomState) {
    this.data = structuredClone(state);
  }
  async setAlarm(at: number | null) {
    this.alarm = at;
  }
  async destroy() {
    this.data = null;
    this.alarm = null;
    this.destroyed = true;
  }
}

function harness(storage = new MemoryStorage(), clockStart = 1_700_000_000_000) {
  const connections: Connection[] = [];
  const clock = { now: clockStart };
  let id = 0;
  const expired: string[] = [];
  const make = () =>
    new RoomService({
      storage,
      hub: { list: () => [...connections] },
      now: () => clock.now,
      random: seeded(7),
      newId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
      onExpire: async (state) => {
        expired.push(state.code);
      },
    });
  const service = make();
  let request = 0;

  const connect = async (svc: RoomService, playerId: string) => {
    const socket = new FakeSocket();
    connections.push({ socket, playerId });
    await svc.connect(socket, playerId);
    return socket;
  };
  const disconnect = async (svc: RoomService, socket: FakeSocket) => {
    const index = connections.findIndex((c) => c.socket === socket);
    if (index >= 0) connections.splice(index, 1);
    await svc.disconnect(socket);
  };
  const send = async (svc: RoomService, socket: FakeSocket, playerId: string, message: Record<string, unknown>) => {
    const requestId = (message.requestId as string) ?? `request-${++request}`;
    await svc.message(socket, playerId, JSON.stringify({ requestId, ...message }));
    return socket.lastReply(requestId);
  };
  return { service, make, storage, clock, connect, disconnect, send, expired, connections };
}

const ROOM_ID = "11111111-1111-4111-8111-111111111111";

async function roomWithPlayers(names: string[]) {
  const h = harness();
  const host = await h.service.init({ roomId: ROOM_ID, code: "4821", displayName: names[0]!, startingCredits: 20 });
  const players = [{ name: names[0]!, ...host }];
  for (const name of names.slice(1)) {
    const joined = await h.service.join({ code: "4821", displayName: name });
    if (!joined.ok) throw new Error(joined.error.message);
    players.push({ name, playerId: joined.playerId, token: joined.token });
  }
  return { ...h, players };
}

describe("joining", () => {
  it("broadcasts each arrival to everyone connected", async () => {
    const h = harness();
    const host = await h.service.init({ roomId: ROOM_ID, code: "4821", displayName: "Host", startingCredits: 20 });
    const hostSocket = await h.connect(h.service, host.playerId);
    expect(hostSocket.lastView().players).toHaveLength(1);

    const alex = await h.service.join({ code: "4821", displayName: "Alex" });
    expect(alex.ok).toBe(true);
    expect(hostSocket.lastView().players.map((p) => p.displayName)).toEqual(["Host", "Alex"]);
    expect(hostSocket.sent.at(-1)).toMatchObject({ type: "ROOM_STATE", cause: "PLAYER_JOINED" });

    if (!alex.ok) return;
    const alexSocket = await h.connect(h.service, alex.playerId);
    expect(hostSocket.lastView().players.find((p) => p.displayName === "Alex")!.isConnected).toBe(true);
    await h.disconnect(h.service, alexSocket);
    expect(hostSocket.lastView().players.find((p) => p.displayName === "Alex")!.isConnected).toBe(false);
  });

  it("restores an existing seat instead of adding a new player", async () => {
    const { service, players } = await roomWithPlayers(["Host", "Alex"]);
    const again = await service.join({ code: "4821", displayName: "Someone Else", token: players[1]!.token });
    expect(again).toMatchObject({ ok: true, rejoined: true, playerId: players[1]!.playerId });
    const state = await service.snapshot();
    expect(state!.players).toHaveLength(2);
    expect(state!.players[1]!.credits).toBe(20);
  });

  it("leaving a running game is for good: no session, no rejoining", async () => {
    const { service, players, connect, send } = await roomWithPlayers(["Host", "Alex", "Jamie"]);
    const hostSocket = await connect(service, players[0]!.playerId);
    await send(service, hostSocket, players[0]!.playerId, { type: "GAME_START" });
    const alex = players[1]!;
    expect(await service.leave(alex.token, "4821")).toEqual({ ok: true, left: true });
    expect(await service.session(alex.token, "4821")).toBeNull();
    const back = await service.join({ code: "4821", displayName: "Alex", token: alex.token });
    expect(!back.ok && back.error.code).toBe("GAME_STARTED");
    expect(hostSocket.lastView().players.find((p) => p.id === alex.playerId)!.hasLeft).toBe(true);
  });

  it("checks a PIN before asking for a nickname", async () => {
    const { service, players, connect, send } = await roomWithPlayers(["Host", "Alex"]);
    expect(await service.status("4821")).toEqual({ ok: true, joinable: true });
    expect(await service.status("9999")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const hostSocket = await connect(service, players[0]!.playerId);
    await send(service, hostSocket, players[0]!.playerId, { type: "GAME_START" });
    expect(await service.status("4821")).toMatchObject({ ok: false, error: { code: "GAME_STARTED" } });
  });

  it("rejects wrong codes, forged tokens, and late joiners", async () => {
    const { service, players, connect, send } = await roomWithPlayers(["Host", "Alex"]);
    expect((await service.join({ code: "9999", displayName: "X" })).ok).toBe(false);
    const forged = players[1]!.token.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    expect(await service.session(forged, "4821")).toBeNull();
    expect(await service.authenticate(forged, "4821")).toMatchObject({ ok: false, closeCode: CLOSE_CODES.unauthorized });

    const hostSocket = await connect(service, players[0]!.playerId);
    await send(service, hostSocket, players[0]!.playerId, { type: "GAME_START" });
    const late = await service.join({ code: "4821", displayName: "Late" });
    expect(!late.ok && late.error.code).toBe("GAME_STARTED");
  });

  it("frees a guest's seat when they leave the lobby; the host leaving closes the room", async () => {
    const { service, players, connect } = await roomWithPlayers(["Host", "Alex", "Jamie"]);
    const alexSocket = await connect(service, players[1]!.playerId);
    expect(await service.leave(players[1]!.token, "4821")).toMatchObject({ ok: true, left: true });
    expect(alexSocket.closed?.code).toBe(CLOSE_CODES.leftRoom);
    expect((await service.snapshot())!.players.map((p) => p.displayName)).toEqual(["Host", "Jamie"]);

    expect(await service.leave(players[0]!.token, "4821")).toMatchObject({ ok: true, left: true });
    const state = await service.snapshot();
    expect(state).toMatchObject({ phase: "ENDED", endReason: "CLOSED" });
  });
});

describe("a full round over sockets", () => {
  it("keeps bids private, syncs the deadline, reveals, and transfers once", async () => {
    const h = await roomWithPlayers(["Host", "Alex", "Jamie", "Sam"]);
    const sockets = new Map<string, FakeSocket>();
    for (const p of h.players) sockets.set(p.playerId, await h.connect(h.service, p.playerId));
    const hostId = h.players[0]!.playerId;
    const hostSocket = sockets.get(hostId)!;

    // Non-host can't start.
    const alexId = h.players[1]!.playerId;
    expect(await h.send(h.service, sockets.get(alexId)!, alexId, { type: "GAME_START" })).toMatchObject({ type: "ERROR", code: "NOT_HOST" });

    expect(await h.send(h.service, hostSocket, hostId, { type: "GAME_START" })).toMatchObject({ type: "ACK" });
    const round = hostSocket.lastView().round!;
    expect(await h.send(h.service, hostSocket, hostId, { type: "BIDDING_START", roundId: round.id })).toMatchObject({ type: "ACK" });

    // Everyone gets the same server deadline.
    const deadlines = [...sockets.values()].map((s) => s.lastView().round!.timerEndsAt);
    expect(new Set(deadlines).size).toBe(1);
    expect(h.storage.alarm).toBe(deadlines[0]);

    const bidders = h.players.filter((p) => p.playerId !== round.pitcherId);
    const [a, b, c] = bidders;
    const attemptId = hostSocket.lastView().round!.attemptId;
    await h.send(h.service, sockets.get(a!.playerId)!, a!.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId, amount: 6 });
    await h.send(h.service, sockets.get(a!.playerId)!, a!.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId, amount: 11 }); // update
    await h.send(h.service, sockets.get(b!.playerId)!, b!.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId, amount: 9 });
    expect(
      await h.send(h.service, sockets.get(c!.playerId)!, c!.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId, amount: 25 }),
    ).toMatchObject({ type: "ERROR", code: "BID_TOO_HIGH" });

    // Nothing on the wire to anyone else reveals an amount while bidding is open.
    for (const [playerId, socket] of sockets) {
      for (const raw of socket.raw) {
        if (!raw.includes('"ROOM_STATE"')) continue;
        expect(raw).not.toMatch(/"amount"|"bids"|"topBidderIds"|"bidCount"/);
        const view = (JSON.parse(raw) as { view: ClientView }).view;
        if (view.round?.status === "BIDDING" && playerId !== a!.playerId && playerId !== b!.playerId) {
          expect(view.me.myBid).toBeNull();
        }
      }
    }
    expect(sockets.get(a!.playerId)!.lastView().me.myBid).toBe(11);

    // Deadline passes; the alarm closes bidding and everyone sees the same reveal.
    h.clock.now = deadlines[0]!;
    await h.service.alarm();
    const reveals = [...sockets.values()].map((s) => s.lastView().round!.reveal);
    for (const reveal of reveals) expect(reveal).toEqual(reveals[0]);
    expect(reveals[0]).toMatchObject({ kind: "SINGLE", highestAmount: 11, topBidderIds: [a!.playerId] });

    // Late bid after the deadline is rejected.
    expect(
      await h.send(h.service, sockets.get(c!.playerId)!, c!.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId, amount: 1 }),
    ).toMatchObject({ type: "ERROR", code: "BIDDING_CLOSED" });

    // Two confirms (a retry and a double click) transfer once.
    const confirm = { type: "WINNER_CONFIRM", roundId: round.id, winnerId: a!.playerId };
    expect(await h.send(h.service, hostSocket, hostId, { ...confirm, requestId: "confirm-request-1" })).toMatchObject({ type: "ACK", duplicate: false });
    expect(await h.send(h.service, hostSocket, hostId, { ...confirm, requestId: "confirm-request-1" })).toMatchObject({ type: "ACK", duplicate: true });
    expect(await h.send(h.service, hostSocket, hostId, { ...confirm, requestId: "confirm-request-2" })).toMatchObject({ type: "ACK", duplicate: true });

    const state = (await h.service.snapshot())!;
    expect(state.transactions).toHaveLength(1);
    const credits = Object.fromEntries(state.players.map((p) => [p.id, p.credits]));
    // The winner spends their bid; the pitcher isn't paid.
    expect(credits[a!.playerId]).toBe(9);
    expect(credits[round.pitcherId]).toBe(20);
    expect(credits[b!.playerId]).toBe(20);
    expect(Object.values(credits).reduce((x, y) => x + y, 0)).toBe(80 - 11);
  });
});

describe("recovery", () => {
  it("restores identity, bid, and remaining time after a reconnect", async () => {
    const h = await roomWithPlayers(["Host", "Alex"]);
    const hostId = h.players[0]!.playerId;
    const hostSocket = await h.connect(h.service, hostId);
    await h.send(h.service, hostSocket, hostId, { type: "GAME_START" });
    const round = hostSocket.lastView().round!;
    await h.send(h.service, hostSocket, hostId, { type: "BIDDING_START", roundId: round.id });
    const bidder = h.players.find((p) => p.playerId !== round.pitcherId)!;
    const first = await h.connect(h.service, bidder.playerId);
    const attemptId = first.lastView().round!.attemptId;
    await h.send(h.service, first, bidder.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId, amount: 7 });
    await h.disconnect(h.service, first);

    h.clock.now += 10_000;
    const auth = await h.service.authenticate(bidder.token, "4821");
    expect(auth).toMatchObject({ ok: true, playerId: bidder.playerId });
    const second = await h.connect(h.service, bidder.playerId);
    const view = second.lastView();
    expect(view.me.myBid).toBe(7);
    expect(view.round!.timerEndsAt).toBe(round.timerEndsAt ?? hostSocket.lastView().round!.timerEndsAt);
    expect(view.me.credits).toBe(20);
  });

  it("rehydrates after a restart and finalizes a countdown that expired while it was down", async () => {
    const h = await roomWithPlayers(["Host", "Alex", "Jamie"]);
    const hostId = h.players[0]!.playerId;
    const hostSocket = await h.connect(h.service, hostId);
    await h.send(h.service, hostSocket, hostId, { type: "GAME_START" });
    const round = hostSocket.lastView().round!;
    await h.send(h.service, hostSocket, hostId, { type: "BIDDING_START", roundId: round.id });
    const endsAt = hostSocket.lastView().round!.timerEndsAt!;
    const bidder = h.players.find((p) => p.playerId !== round.pitcherId && p.playerId !== hostId) ?? h.players.find((p) => p.playerId !== round.pitcherId)!;
    const s = await h.connect(h.service, bidder.playerId);
    await h.send(h.service, s, bidder.playerId, { type: "BID_SUBMIT", roundId: round.id, attemptId: s.lastView().round!.attemptId, amount: 5 });

    // "Restart" the Durable Object: a brand-new service over the same storage, after the deadline.
    h.connections.length = 0;
    h.clock.now = endsAt + 5_000;
    const revived = h.make();
    await revived.hydrate();
    const before = await revived.snapshot();
    expect(before!.phase).toBe("BIDDING");
    expect(before!.pitchingOrder).toEqual((await h.service.snapshot())!.pitchingOrder);
    await revived.alarm();
    const after = (await revived.snapshot())!;
    expect(after.phase).toBe("REVEAL");
    expect(after.rounds[0]!.outcome).toMatchObject({ highestAmount: 5, topBidderIds: [bidder.playerId] });
  });
});

describe("hygiene", () => {
  it("expires stale rooms, frees the code, and closes sockets", async () => {
    const h = await roomWithPlayers(["Host", "Alex"]);
    const socket = await h.connect(h.service, h.players[0]!.playerId);
    h.clock.now += ROOM_TTL_MS + 1;
    await h.service.alarm();
    expect(h.storage.destroyed).toBe(true);
    expect(h.expired).toEqual(["4821"]);
    expect(socket.closed?.code).toBe(CLOSE_CODES.expired);
    expect(await h.service.session(h.players[0]!.token, "4821")).toBeNull();
  });

  it("rejects malformed, oversized, and floods of messages", async () => {
    const h = await roomWithPlayers(["Host", "Alex"]);
    const id = h.players[1]!.playerId;
    const socket = await h.connect(h.service, id);
    await h.service.message(socket, id, "not json");
    await h.service.message(socket, id, JSON.stringify({ type: "BID_SUBMIT", requestId: "abcdefgh", amount: "lots" }));
    await h.service.message(socket, id, "x".repeat(5000));
    const errors = socket.sent.filter((m) => m.type === "ERROR");
    expect(errors).toHaveLength(3);
    for (let i = 0; i < 30; i++) await h.service.message(socket, id, JSON.stringify({ type: "STATE_REQUEST", requestId: `flood-${i}-xx` }));
    expect(socket.sent.some((m) => m.type === "ERROR" && m.code === "RATE_LIMITED")).toBe(true);
  });

  it("ignores a forged identity: commands act as the socket's own player", async () => {
    const h = await roomWithPlayers(["Host", "Alex"]);
    const alexId = h.players[1]!.playerId;
    const socket = await h.connect(h.service, alexId);
    // Extra fields such as playerId or role are stripped by validation; the host check still fails.
    const reply = await h.send(h.service, socket, alexId, { type: "GAME_START", playerId: h.players[0]!.playerId, role: "host" });
    expect(reply).toMatchObject({ type: "ERROR", code: "NOT_HOST" });
  });
});
