/**
 * HTTP API for rooms. Everything here is a thin shell: validate input, find
 * the right Durable Object, and translate its result into a response.
 *
 *   POST /api/rooms                 create a room (caller becomes host)
 *   GET  /api/rooms/:code           can a new player join with this PIN? (checked before the nickname)
 *   POST /api/rooms/:code/join      join, or rejoin with an existing session
 *   GET  /api/rooms/:code/session   who am I in this room?
 *   POST /api/rooms/:code/leave     leave the lobby (host: close the room)
 *   GET  /api/rooms/:code/ws        WebSocket for live game state
 *
 * The session lives in an HttpOnly, SameSite=Lax cookie scoped to
 * /api/rooms/:code, so page scripts never see it.
 */
import { CLOSE_CODES } from "../lib/game/constants";
import {
  createRoomSchema,
  firstIssue,
  joinRoomSchema,
  roomCodeSchema,
  type ApiErrorBody,
} from "../lib/game/protocol";
import type { ErrorCode } from "../lib/game/types";
import { gameRoomStub, registryStub } from "./bindings";
import { CODE_HEADER, SESSION_HEADER } from "./game-room";
import { parseToken } from "./tokens";

const MAX_BODY_BYTES = 4096;
const COOKIE_MAX_AGE_S = 3 * 24 * 60 * 60;

const STATUS: Partial<Record<ErrorCode, number>> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  NAME_TAKEN: 409,
  ROOM_FULL: 409,
  GAME_STARTED: 409,
  ROOM_ENDED: 410,
  EXPIRED: 410,
  RATE_LIMITED: 429,
  ROOMS_FULL: 503,
};

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function error(code: ErrorCode, message: string, extraHeaders?: HeadersInit): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return json(body, { status: STATUS[code] ?? 500, headers: extraHeaders });
}

/* Cookies ------------------------------------------------------------ */

const cookieName = (code: string) => `cb_${code}`;

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return rest.join("=") || null;
  }
  return null;
}

function sessionCookie(code: string, token: string, secure: boolean): string {
  return [
    `${cookieName(code)}=${token}`,
    `Path=/api/rooms/${code}`,
    `Max-Age=${COOKIE_MAX_AGE_S}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function clearedCookie(code: string, secure: boolean): string {
  return [`${cookieName(code)}=`, `Path=/api/rooms/${code}`, "Max-Age=0", "HttpOnly", "SameSite=Lax", secure ? "Secure" : ""]
    .filter(Boolean)
    .join("; ");
}

/* Request helpers ---------------------------------------------------- */

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local";
}

/** Reject cross-site writes and WebSocket hijacking: the Origin must be us. */
function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("Origin");
  return origin === null || origin === url.origin;
}

async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (declared > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/* Handlers ----------------------------------------------------------- */

async function createRoom(request: Request, env: Env, url: URL): Promise<Response> {
  const parsed = createRoomSchema.safeParse(await readJson(request));
  if (!parsed.success) return error("INVALID_INPUT", firstIssue(parsed.error));
  const { displayName, startingCredits } = parsed.data;
  const biddingSeconds = env.TEST_TIMERS === "1" ? parsed.data.biddingSeconds : undefined;

  const roomId = crypto.randomUUID();
  const registry = registryStub(env);
  const allocation = await registry.allocate(roomId, clientIp(request));
  if (!allocation.ok) return error(allocation.error.code, allocation.error.message);

  try {
    const created = await gameRoomStub(env, roomId).init({
      roomId,
      code: allocation.code,
      displayName,
      startingCredits,
      biddingSeconds,
    });
    return json(
      { code: allocation.code, playerId: created.playerId },
      { status: 201, headers: { "Set-Cookie": sessionCookie(allocation.code, created.token, url.protocol === "https:") } },
    );
  } catch (err) {
    await registry.release(allocation.code, roomId);
    throw err;
  }
}

async function joinRoom(request: Request, env: Env, url: URL, code: string): Promise<Response> {
  const parsed = joinRoomSchema.safeParse(await readJson(request));
  if (!parsed.success) return error("INVALID_INPUT", firstIssue(parsed.error));

  const lookup = await registryStub(env).lookup(code, clientIp(request));
  if (!lookup.ok) return error(lookup.error.code, lookup.error.message);

  const result = await gameRoomStub(env, lookup.roomId).join({
    code,
    displayName: parsed.data.displayName,
    token: readCookie(request, cookieName(code)),
  });
  if (!result.ok) return error(result.error.code, result.error.message);
  return json(
    { code, playerId: result.playerId, rejoined: result.rejoined },
    { headers: { "Set-Cookie": sessionCookie(code, result.token, url.protocol === "https:") } },
  );
}

/**
 * "Is there a game with this PIN I can join?" 200 if so; otherwise the reason
 * (NOT_FOUND, GAME_STARTED, ROOM_ENDED, ROOM_FULL). Goes through the same rate-limited
 * registry lookup as joining, so it can't be used to scan PINs any faster.
 */
async function roomStatus(request: Request, env: Env, code: string): Promise<Response> {
  const lookup = await registryStub(env).lookup(code, clientIp(request));
  if (!lookup.ok) return error(lookup.error.code, lookup.error.message);
  const result = await gameRoomStub(env, lookup.roomId).status(code);
  if (!result.ok) return error(result.error.code, result.error.message);
  return json({ joinable: true });
}

/** "Do I have a seat here?" Having none is a normal answer, so it's a 200 with `session: null`. */
async function getSession(request: Request, env: Env, url: URL, code: string): Promise<Response> {
  const token = readCookie(request, cookieName(code));
  const parsed = parseToken(token);
  if (!parsed) return json({ session: null });
  const session = await gameRoomStub(env, parsed.roomId).session(token, code);
  if (!session) {
    return json({ session: null }, { headers: { "Set-Cookie": clearedCookie(code, url.protocol === "https:") } });
  }
  return json({ session });
}

async function leaveRoom(request: Request, env: Env, url: URL, code: string): Promise<Response> {
  const token = readCookie(request, cookieName(code));
  const parsed = parseToken(token);
  if (!parsed) return json({ left: true }, { headers: { "Set-Cookie": clearedCookie(code, url.protocol === "https:") } });
  const result = await gameRoomStub(env, parsed.roomId).leave(token, code);
  if (!result.ok) return error(result.error.code, result.error.message);
  return json(
    { left: result.left },
    // Keep the cookie when the seat is kept, so they can come back mid-game.
    result.left ? { headers: { "Set-Cookie": clearedCookie(code, url.protocol === "https:") } } : {},
  );
}

function rejectSocket(closeCode: number, reason: string): Response {
  const pair = new WebSocketPair();
  pair[1].accept();
  pair[1].close(closeCode, reason);
  return new Response(null, { status: 101, webSocket: pair[0] });
}

async function connectSocket(request: Request, env: Env, code: string): Promise<Response> {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return error("INVALID_INPUT", "Expected a WebSocket upgrade.");
  }
  const token = readCookie(request, cookieName(code));
  const parsed = parseToken(token);
  if (!parsed || !token) return rejectSocket(CLOSE_CODES.unauthorized, "Join the room to play");

  const headers = new Headers(request.headers);
  headers.set(SESSION_HEADER, token);
  headers.set(CODE_HEADER, code);
  return gameRoomStub(env, parsed.roomId).fetch(new Request(request.url, { method: "GET", headers }));
}

/* Router ------------------------------------------------------------- */

export async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const [, , code, action, ...extra] = url.pathname.split("/").filter(Boolean);
  const method = request.method.toUpperCase();

  if (method !== "GET" && !sameOrigin(request, url)) return error("UNAUTHORIZED", "Cross-site request blocked.");

  try {
    if (code === undefined) {
      if (method === "POST") return await createRoom(request, env, url);
      return error("NOT_FOUND", "Not found.");
    }
    if (!roomCodeSchema.safeParse(code).success || extra.length > 0) return error("NOT_FOUND", "Not found.");

    if (action === undefined && method === "GET") return await roomStatus(request, env, code);
    if (action === "join" && method === "POST") return await joinRoom(request, env, url, code);
    if (action === "session" && method === "GET") return await getSession(request, env, url, code);
    if (action === "leave" && method === "POST") return await leaveRoom(request, env, url, code);
    if (action === "ws" && method === "GET") {
      if (!sameOrigin(request, url)) return error("UNAUTHORIZED", "Cross-site request blocked.");
      return await connectSocket(request, env, code);
    }
    return error("NOT_FOUND", "Not found.");
  } catch (err) {
    // Never log request bodies or cookies: they contain session secrets.
    console.error("api_error", { path: url.pathname, message: err instanceof Error ? err.message : String(err) });
    return error("INTERNAL", "Something went wrong on our end. Try again.");
  }
}
