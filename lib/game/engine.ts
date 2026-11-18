/**
 * The authoritative game state machine. Pure functions: every input
 * (time, randomness, IDs) is passed in, so the rules can be unit-tested
 * and the Durable Object stays a thin persistence and transport layer.
 */
import { isBeforeDeadline, resolveBids, upsertBid, validateBidAmount } from "./bidding";
import { LIMITS, ROOM_TTL_MS } from "./constants";
import { transferCredits } from "./credits";
import { isValidName, NAME_RULE_MESSAGE, nameKey, normalizeName } from "./names";
import { shuffle } from "./order";
import type {
  EndReason,
  GameCommand,
  GameError,
  ErrorCode,
  Phase,
  Player,
  RoomState,
  Round,
  StateCause,
} from "./types";

export interface EngineContext {
  now: number;
  random: () => number;
  newId: () => string;
}

export type EngineResult =
  | { ok: true; state: RoomState; cause: StateCause; duplicate: false }
  | { ok: true; state: RoomState; cause: null; duplicate: true }
  | { ok: false; error: GameError };

/** Every legal phase change. Anything else is a bug or a forged command. */
export const TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  LOBBY: ["PITCHING", "ENDED"],
  PITCHING: ["BIDDING", "ENDED"],
  BIDDING: ["REVEAL", "TIEBREAKER", "NO_BIDS", "ENDED"],
  REVEAL: ["WINNER_CONFIRMED", "ENDED"],
  TIEBREAKER: ["WINNER_CONFIRMED", "ENDED"],
  NO_BIDS: ["BIDDING", "ENDED"],
  WINNER_CONFIRMED: ["PITCHING", "AWAITING_END", "ENDED"],
  AWAITING_END: ["ENDED"],
  ENDED: [],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to);
}

function fail(code: ErrorCode, message: string): EngineResult {
  return { ok: false, error: { code, message } };
}

function done(state: RoomState, cause: StateCause): EngineResult {
  return { ok: true, state, cause, duplicate: false };
}

function noop(state: RoomState): EngineResult {
  return { ok: true, state, cause: null, duplicate: true };
}

function moveTo(state: RoomState, to: Phase): void {
  if (!canTransition(state.phase, to)) {
    throw new Error(`Illegal transition ${state.phase} → ${to}`);
  }
  state.phase = to;
}

/** Record a change: bump the revision and push the expiry window forward. */
function touch(state: RoomState, now: number): RoomState {
  state.revision += 1;
  state.updatedAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
  return state;
}

export function currentRound(state: RoomState): Round | null {
  return state.rounds[state.currentRoundIndex] ?? null;
}

export function findPlayer(state: RoomState, playerId: string): Player | undefined {
  return state.players.find((player) => player.id === playerId);
}

/* ------------------------------------------------------------------ */
/* Room lifecycle                                                      */
/* ------------------------------------------------------------------ */

export function createRoom(
  input: {
    roomId: string;
    code: string;
    startingCredits: number;
    biddingSeconds?: number;
    host: { id: string; displayName: string; tokenHash: string };
  },
  ctx: Pick<EngineContext, "now">,
): RoomState {
  const host: Player = {
    id: input.host.id,
    displayName: normalizeName(input.host.displayName),
    credits: input.startingCredits,
    paddle: 1,
    hasPitched: false,
    joinedAt: ctx.now,
    tokenHash: input.host.tokenHash,
  };
  return {
    schemaVersion: 1,
    id: input.roomId,
    code: input.code,
    hostPlayerId: host.id,
    startingCredits: input.startingCredits,
    biddingSeconds: input.biddingSeconds ?? LIMITS.biddingSeconds,
    phase: "LOBBY",
    endReason: null,
    revision: 1,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    startedAt: null,
    endedAt: null,
    expiresAt: ctx.now + ROOM_TTL_MS,
    players: [host],
    pitchingOrder: [],
    currentRoundIndex: -1,
    rounds: [],
    transactions: [],
    processedRequests: [],
  };
}

export function addPlayer(
  prev: RoomState,
  input: { id: string; displayName: string; tokenHash: string },
  ctx: Pick<EngineContext, "now">,
): EngineResult {
  if (prev.phase === "ENDED") return fail("ROOM_ENDED", "This game has already finished.");
  if (prev.phase !== "LOBBY") return fail("GAME_STARTED", "This game has already started. Ask the host for the next one!");

  const displayName = normalizeName(input.displayName);
  if (!isValidName(displayName)) {
    return fail("INVALID_INPUT", NAME_RULE_MESSAGE);
  }
  if (prev.players.length >= LIMITS.maxPlayers) {
    return fail("ROOM_FULL", `This room is full (${LIMITS.maxPlayers} players max).`);
  }
  const key = nameKey(displayName);
  if (prev.players.some((player) => nameKey(player.displayName) === key)) {
    return fail("NAME_TAKEN", `Someone's already called ${displayName}. Try a nickname?`);
  }

  const state = structuredClone(prev);
  const paddle = Math.max(0, ...state.players.map((p) => p.paddle)) + 1;
  state.players.push({
    id: input.id,
    displayName,
    credits: state.startingCredits,
    paddle,
    hasPitched: false,
    joinedAt: ctx.now,
    tokenHash: input.tokenHash,
  });
  return done(touch(state, ctx.now), "PLAYER_JOINED");
}

/** A guest leaving the lobby frees their seat. The host leaving closes the room instead. */
export function removePlayer(prev: RoomState, playerId: string, ctx: Pick<EngineContext, "now">): EngineResult {
  if (prev.phase !== "LOBBY") return fail("GAME_STARTED", "The game has started, so your seat is saved.");
  if (playerId === prev.hostPlayerId) return fail("INVALID_INPUT", "The host closes the room instead of leaving it.");
  if (!findPlayer(prev, playerId)) return fail("NOT_FOUND", "You're not in this room.");

  const state = structuredClone(prev);
  state.players = state.players.filter((player) => player.id !== playerId);
  return done(touch(state, ctx.now), "PLAYER_LEFT");
}

/* ------------------------------------------------------------------ */
/* Timer                                                               */
/* ------------------------------------------------------------------ */

/**
 * Close bidding if its deadline has passed. Called by the alarm and before
 * every command, so an expired countdown is finalized even if the alarm is late.
 */
export function settle(prev: RoomState, now: number): { state: RoomState; cause: StateCause } | null {
  const round = currentRound(prev);
  if (prev.phase !== "BIDDING" || !round || round.status !== "BIDDING") return null;
  if (isBeforeDeadline(now, round.timerEndsAt)) return null;

  const state = structuredClone(prev);
  const live = currentRound(state)!;
  const outcome = resolveBids(live.bids, now);
  live.status = "CLOSED";
  live.outcome = outcome;
  moveTo(state, outcome.kind === "NO_BIDS" ? "NO_BIDS" : outcome.kind === "TIE" ? "TIEBREAKER" : "REVEAL");
  return { state: touch(state, now), cause: "BIDDING_ENDED" };
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

const HOST_ONLY: ReadonlySet<GameCommand["type"]> = new Set([
  "GAME_START",
  "BIDDING_START",
  "BIDDING_RESTART",
  "WINNER_CONFIRM",
  "NEXT_ROUND",
  "GAME_END",
]);

export function applyCommand(prev: RoomState, actorId: string, command: GameCommand, ctx: EngineContext): EngineResult {
  const actor = findPlayer(prev, actorId);
  if (!actor) return fail("UNAUTHORIZED", "You're not part of this room.");
  if (HOST_ONLY.has(command.type) && actorId !== prev.hostPlayerId) {
    return fail("NOT_HOST", "Only the host can do that.");
  }
  if (prev.phase === "ENDED") return fail("ROOM_ENDED", "This game has finished.");

  switch (command.type) {
    case "GAME_START":
      return startGame(prev, ctx);
    case "BIDDING_START":
      return startBidding(prev, command.roundId, ctx);
    case "BID_SUBMIT":
      return submitBid(prev, actor, command, ctx);
    case "BID_WITHDRAW":
      return withdrawBid(prev, actor, command, ctx);
    case "BIDDING_RESTART":
      return restartBidding(prev, command.roundId, ctx);
    case "WINNER_CONFIRM":
      return confirmWinner(prev, command.roundId, command.winnerId, ctx);
    case "NEXT_ROUND":
      return nextRound(prev, command.roundId, ctx);
    case "GAME_END":
      return endGame(prev, ctx);
  }
}

function startGame(prev: RoomState, ctx: EngineContext): EngineResult {
  if (prev.phase !== "LOBBY") return fail("INVALID_PHASE", "The game has already started.");
  if (prev.players.length < LIMITS.minPlayersToStart) {
    return fail("NOT_ENOUGH_PLAYERS", "You need at least two players to start.");
  }
  const state = structuredClone(prev);
  state.pitchingOrder = shuffle(
    state.players.map((player) => player.id),
    ctx.random,
  );
  state.startedAt = ctx.now;
  openRound(state, ctx);
  return done(touch(state, ctx.now), "GAME_STARTED");
}

/** Create the next round from the fixed pitching order. */
function openRound(state: RoomState, ctx: EngineContext): void {
  const pitcherId = state.pitchingOrder[state.rounds.length];
  if (!pitcherId) throw new Error("No pitcher left to open a round for");
  const pitcher = findPlayer(state, pitcherId)!;
  if (pitcher.hasPitched) throw new Error("Pitcher already had a round");
  pitcher.hasPitched = true;
  state.rounds.push({
    id: ctx.newId(),
    number: state.rounds.length + 1,
    pitcherId,
    status: "PITCHING",
    attemptId: ctx.newId(),
    attemptNumber: 1,
    timerStartedAt: null,
    timerEndsAt: null,
    bids: [],
    outcome: null,
    winnerId: null,
    winningAmount: null,
    transactionId: null,
    completedAt: null,
  });
  state.currentRoundIndex = state.rounds.length - 1;
  moveTo(state, "PITCHING");
}

function guardRound(state: RoomState, roundId: string): Round | EngineResult {
  const round = currentRound(state);
  if (!round || round.id !== roundId) {
    return fail("STALE_ROUND", "That round has already moved on.");
  }
  return round;
}

function isResult(value: Round | EngineResult): value is EngineResult {
  return "ok" in value;
}

function startTimer(round: Round, state: RoomState, now: number): void {
  round.status = "BIDDING";
  round.timerStartedAt = now;
  round.timerEndsAt = now + state.biddingSeconds * 1000;
}

function startBidding(prev: RoomState, roundId: string, ctx: EngineContext): EngineResult {
  const guarded = guardRound(prev, roundId);
  if (isResult(guarded)) return guarded;
  if (prev.phase === "BIDDING") return fail("INVALID_PHASE", "Bidding is already open.");
  if (prev.phase !== "PITCHING") return fail("INVALID_PHASE", "Bidding can only start after the pitch.");

  const state = structuredClone(prev);
  const round = currentRound(state)!;
  startTimer(round, state, ctx.now);
  moveTo(state, "BIDDING");
  return done(touch(state, ctx.now), "BIDDING_STARTED");
}

function guardBidding(
  prev: RoomState,
  actor: Player,
  command: { roundId: string; attemptId: string },
  now: number,
): Round | EngineResult {
  const guarded = guardRound(prev, command.roundId);
  if (isResult(guarded)) return guarded;
  if (guarded.attemptId !== command.attemptId) {
    return fail("STALE_ROUND", "Bidding was restarted. Place your bid again.");
  }
  if (prev.phase !== "BIDDING" || !isBeforeDeadline(now, guarded.timerEndsAt)) {
    return fail("BIDDING_CLOSED", "Too late! Bidding has closed for this gift.");
  }
  if (actor.id === guarded.pitcherId) {
    return fail("IS_PITCHER", "You can't bid on your own gift.");
  }
  return guarded;
}

function submitBid(
  prev: RoomState,
  actor: Player,
  command: Extract<GameCommand, { type: "BID_SUBMIT" }>,
  ctx: EngineContext,
): EngineResult {
  const guarded = guardBidding(prev, actor, command, ctx.now);
  if (isResult(guarded)) return guarded;
  if (actor.credits <= 0) return fail("BID_TOO_HIGH", "You have no credits to bid this round.");
  const valid = validateBidAmount(command.amount, actor.credits);
  if (!valid.ok) return fail(valid.code, valid.message);

  const state = structuredClone(prev);
  const round = currentRound(state)!;
  round.bids = upsertBid(round.bids, actor.id, command.amount, ctx.now);
  return done(touch(state, ctx.now), "BID_ACCEPTED");
}

function withdrawBid(
  prev: RoomState,
  actor: Player,
  command: Extract<GameCommand, { type: "BID_WITHDRAW" }>,
  ctx: EngineContext,
): EngineResult {
  const guarded = guardBidding(prev, actor, command, ctx.now);
  if (isResult(guarded)) return guarded;
  if (!guarded.bids.some((bid) => bid.playerId === actor.id)) return noop(prev);

  const state = structuredClone(prev);
  const round = currentRound(state)!;
  round.bids = round.bids.filter((bid) => bid.playerId !== actor.id);
  return done(touch(state, ctx.now), "BID_WITHDRAWN");
}

function restartBidding(prev: RoomState, roundId: string, ctx: EngineContext): EngineResult {
  const guarded = guardRound(prev, roundId);
  if (isResult(guarded)) return guarded;
  if (prev.phase !== "NO_BIDS") {
    return fail("INVALID_PHASE", "Bidding can only restart when nobody bid.");
  }
  if (guarded.bids.length > 0) return fail("INVALID_PHASE", "This round already has bids.");

  const state = structuredClone(prev);
  const round = currentRound(state)!;
  round.attemptId = ctx.newId();
  round.attemptNumber += 1;
  round.bids = [];
  round.outcome = null;
  startTimer(round, state, ctx.now);
  moveTo(state, "BIDDING");
  return done(touch(state, ctx.now), "BIDDING_RESTARTED");
}

function confirmWinner(prev: RoomState, roundId: string, winnerId: string, ctx: EngineContext): EngineResult {
  const guarded = guardRound(prev, roundId);
  if (isResult(guarded)) return guarded;

  // Idempotent: confirming the same winner again changes nothing and transfers nothing.
  if (guarded.status === "CONFIRMED") {
    return guarded.winnerId === winnerId
      ? noop(prev)
      : fail("ALREADY_CONFIRMED", "A winner has already been confirmed for this gift.");
  }
  if (prev.phase !== "REVEAL" && prev.phase !== "TIEBREAKER") {
    return fail("INVALID_PHASE", "Wait for bidding to close before confirming a winner.");
  }
  const outcome = guarded.outcome;
  if (!outcome || outcome.kind === "NO_BIDS" || !outcome.topBidderIds.includes(winnerId)) {
    return fail("NOT_ELIGIBLE_WINNER", "Only a highest bidder can win this gift.");
  }
  const winningBid = guarded.bids.find((bid) => bid.playerId === winnerId);
  if (!winningBid || winningBid.amount !== outcome.highestAmount) {
    return fail("NOT_ELIGIBLE_WINNER", "Only a highest bidder can win this gift.");
  }

  const state = structuredClone(prev);
  const round = currentRound(state)!;
  const transfer = transferCredits(state.players, {
    id: ctx.newId(),
    roundId: round.id,
    fromPlayerId: winnerId,
    toPlayerId: round.pitcherId,
    amount: winningBid.amount,
    now: ctx.now,
  });
  if (!transfer.ok) return fail(transfer.code, transfer.message);

  state.players = transfer.players;
  state.transactions.push(transfer.transaction);
  round.status = "CONFIRMED";
  round.winnerId = winnerId;
  round.winningAmount = winningBid.amount;
  round.transactionId = transfer.transaction.id;
  round.completedAt = ctx.now;
  moveTo(state, "WINNER_CONFIRMED");
  return done(touch(state, ctx.now), "WINNER_CONFIRMED");
}

function nextRound(prev: RoomState, roundId: string, ctx: EngineContext): EngineResult {
  const guarded = guardRound(prev, roundId);
  if (isResult(guarded)) return guarded;
  if (prev.phase !== "WINNER_CONFIRMED" || guarded.status !== "CONFIRMED") {
    return fail("INVALID_PHASE", "Confirm a winner before moving on.");
  }
  const state = structuredClone(prev);
  if (state.rounds.length >= state.pitchingOrder.length) {
    moveTo(state, "AWAITING_END");
    return done(touch(state, ctx.now), "AWAITING_END");
  }
  openRound(state, ctx);
  return done(touch(state, ctx.now), "ROUND_CHANGED");
}

function endGame(prev: RoomState, ctx: EngineContext): EngineResult {
  const state = structuredClone(prev);
  const round = currentRound(state);
  // An unfinished round is cancelled: no credits move and its bids are discarded unseen.
  if (round && round.status !== "CONFIRMED") {
    round.status = "CANCELLED";
    round.bids = [];
    round.outcome = null;
    round.completedAt = ctx.now;
  }
  const reason: EndReason =
    prev.phase === "LOBBY" ? "CLOSED" : prev.phase === "AWAITING_END" ? "COMPLETED" : "ENDED_EARLY";
  state.endReason = reason;
  state.endedAt = ctx.now;
  moveTo(state, "ENDED");
  return done(touch(state, ctx.now), "GAME_ENDED");
}

/* ------------------------------------------------------------------ */
/* Idempotency                                                         */
/* ------------------------------------------------------------------ */

export function hasProcessed(state: RoomState, requestId: string): boolean {
  return state.processedRequests.includes(requestId);
}

/** Remember a request ID on an already-cloned state. */
export function recordRequest(state: RoomState, requestId: string): RoomState {
  state.processedRequests = [...state.processedRequests, requestId].slice(-LIMITS.processedRequestsCap);
  return state;
}
