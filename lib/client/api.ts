import type { ApiErrorBody, CreateRoomInput, SessionResponse } from "@/lib/game/protocol";
import type { ErrorCode } from "@/lib/game/types";

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("OFFLINE", "Can't reach the game. Check your connection and try again.", 0);
  }
  const body = (await response.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!response.ok || !body) {
    const error = body?.error;
    throw new ApiError(error?.code ?? "INTERNAL", error?.message ?? "Something went wrong. Try again.", response.status);
  }
  return body;
}

export function createRoom(input: CreateRoomInput) {
  return request<{ code: string; playerId: string }>("/api/rooms", { method: "POST", body: JSON.stringify(input) });
}

export function joinRoom(code: string, displayName: string) {
  return request<{ code: string; playerId: string; rejoined: boolean }>(`/api/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
}

/**
 * Resolves if a new player can join with this PIN right now; otherwise throws an
 * ApiError with the reason (NOT_FOUND, GAME_STARTED, ROOM_ENDED, ROOM_FULL, RATE_LIMITED).
 */
export function checkRoom(code: string) {
  return request<{ joinable: true }>(`/api/rooms/${code}`);
}

/** My seat in this room, or null if this browser hasn't joined it. */
export async function getSession(code: string): Promise<SessionResponse | null> {
  return (await request<{ session: SessionResponse | null }>(`/api/rooms/${code}/session`)).session;
}

export function leaveRoom(code: string) {
  return request<{ left: boolean }>(`/api/rooms/${code}/leave`, { method: "POST", body: "{}" });
}
