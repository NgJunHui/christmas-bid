/**
 * Wire protocol: Zod schemas for everything a client sends (HTTP bodies and
 * WebSocket frames), plus the TypeScript shape of server messages.
 */
import { z } from "zod";
import { LIMITS } from "./constants";
import { isValidName, NAME_RULE_MESSAGE, normalizeName } from "./names";
import type { ClientView, ErrorCode, StateCause } from "./types";

export const roomCodeSchema = z.string().regex(/^\d{4}$/, "Room codes are 4 digits.");

export const displayNameSchema = z
  .string()
  .max(200)
  .transform(normalizeName)
  .refine(isValidName, NAME_RULE_MESSAGE);

export const createRoomSchema = z.object({
  displayName: displayNameSchema,
  startingCredits: z
    .number()
    .int("Credits must be a whole number.")
    .min(LIMITS.creditsMin, `At least ${LIMITS.creditsMin} credit.`)
    .max(LIMITS.creditsMax, `At most ${LIMITS.creditsMax} credits.`),
  /** Honoured only when the server has test timers enabled (local e2e runs). */
  biddingSeconds: z.number().int().min(LIMITS.testBiddingSecondsMin).max(LIMITS.biddingSeconds).optional(),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({ displayName: displayNameSchema });
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

const id = z.string().min(1).max(64);
const requestId = z.string().min(8).max(64);

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PING"), requestId, t: z.number() }),
  z.object({ type: z.literal("STATE_REQUEST"), requestId }),
  z.object({ type: z.literal("GAME_START"), requestId }),
  z.object({ type: z.literal("BIDDING_START"), requestId, roundId: id }),
  z.object({
    type: z.literal("BID_SUBMIT"),
    requestId,
    roundId: id,
    attemptId: id,
    amount: z.number().int().min(0).max(1_000_000),
  }),
  z.object({ type: z.literal("BID_WITHDRAW"), requestId, roundId: id, attemptId: id }),
  z.object({ type: z.literal("BIDDING_RESTART"), requestId, roundId: id }),
  z.object({ type: z.literal("WINNER_CONFIRM"), requestId, roundId: id, winnerId: id }),
  z.object({ type: z.literal("NEXT_ROUND"), requestId, roundId: id }),
  z.object({ type: z.literal("GAME_END"), requestId }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerMessage =
  | { type: "ROOM_STATE"; cause: StateCause; view: ClientView }
  | { type: "ACK"; requestId: string; duplicate: boolean }
  | { type: "ERROR"; requestId: string | null; code: ErrorCode; message: string }
  | { type: "PONG"; requestId: string; t: number; serverNow: number };

/** HTTP API response shapes. */
export interface SessionResponse {
  roomId: string;
  code: string;
  playerId: string;
  phase: ClientView["room"]["phase"];
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

/** First readable validation message from a Zod error. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Something about that input isn't right.";
}
