/**
 * One Durable Object per room: the single source of truth for that game.
 * Uses the WebSocket Hibernation API so idle rooms cost nothing; each socket
 * carries its player ID as a serialized attachment, which survives hibernation.
 */
import { DurableObject } from "cloudflare:workers";
import type { RoomState } from "../lib/game/types";
import { RoomService, type Connection } from "./room-service";
import { registryStub } from "./bindings";

export const SESSION_HEADER = "x-cb-session";
export const CODE_HEADER = "x-cb-code";

interface Attachment {
  playerId: string;
}

export class GameRoom extends DurableObject<Env> {
  private readonly service: RoomService;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.service = new RoomService({
      storage: {
        load: async () => (await ctx.storage.get<RoomState>("state")) ?? null,
        save: (state) => ctx.storage.put("state", state),
        setAlarm: async (at) => {
          if (at === null) await ctx.storage.deleteAlarm();
          else await ctx.storage.setAlarm(at);
        },
        destroy: async () => {
          await ctx.storage.deleteAlarm();
          await ctx.storage.deleteAll();
        },
      },
      hub: {
        list: () =>
          ctx.getWebSockets().flatMap((socket): Connection[] => {
            const attachment = socket.deserializeAttachment() as Attachment | null;
            return attachment ? [{ socket, playerId: attachment.playerId }] : [];
          }),
      },
      onExpire: async (state) => {
        await registryStub(env).release(state.code, state.id);
      },
    });
    void ctx.blockConcurrencyWhile(() => this.service.hydrate());
  }

  /* RPC, called by the Worker's HTTP API. */

  init(input: Parameters<RoomService["init"]>[0]) {
    return this.service.init(input);
  }

  join(input: Parameters<RoomService["join"]>[0]) {
    return this.service.join(input);
  }

  status(code: string) {
    return this.service.status(code);
  }

  session(token: string | null, code: string) {
    return this.service.session(token, code);
  }

  leave(token: string | null, code: string) {
    return this.service.leave(token, code);
  }

  /* WebSocket upgrade. The Worker has already checked the origin and copied the session cookie into a header. */

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const auth = await this.service.authenticate(
      request.headers.get(SESSION_HEADER),
      request.headers.get(CODE_HEADER) ?? "",
    );
    if (!auth.ok) {
      // Accept, then close with an application code the client can act on.
      server.accept();
      server.close(auth.closeCode, auth.reason);
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server, [auth.playerId]);
    server.serializeAttachment({ playerId: auth.playerId } satisfies Attachment);
    await this.service.connect(server, auth.playerId);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = socket.deserializeAttachment() as Attachment | null;
    if (!attachment) return socket.close(4401, "Unknown socket");
    await this.service.message(socket, attachment.playerId, message);
  }

  override async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    try {
      socket.close(code === 1005 || code === 1006 ? 1000 : code, reason);
    } catch {
      /* already closed */
    }
    await this.service.disconnect(socket);
  }

  override async webSocketError(socket: WebSocket): Promise<void> {
    await this.service.disconnect(socket);
  }

  override async alarm(): Promise<void> {
    await this.service.alarm();
  }
}
