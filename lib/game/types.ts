/**
 * Domain model for a Bidmas room. `RoomState` is the authoritative,
 * persisted record owned by the room's Durable Object. It never leaves the
 * server; clients receive a sanitized `ClientView` (see view.ts).
 */

export const PHASES = [
  "LOBBY",
  "PITCHING",
  "BIDDING",
  "REVEAL",
  "TIEBREAKER",
  "NO_BIDS",
  "WINNER_CONFIRMED",
  "AWAITING_END",
  "ENDED",
] as const;
export type Phase = (typeof PHASES)[number];

export type EndReason = "COMPLETED" | "ENDED_EARLY" | "CLOSED";

export interface Player {
  id: string;
  displayName: string;
  /** Integer credit balance. Never negative. */
  credits: number;
  /** Join order, starting at 1. Picks the player's festive avatar. */
  paddle: number;
  /** True once this player's pitching round has begun. */
  hasPitched: boolean;
  joinedAt: number;
  /** SHA-256 (base64url) of the player's session secret. */
  tokenHash: string;
}

export interface Bid {
  playerId: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}

export type RoundStatus = "PITCHING" | "BIDDING" | "CLOSED" | "CONFIRMED" | "CANCELLED";

export type BidOutcomeKind = "NO_BIDS" | "SINGLE" | "TIE";

export interface BidOutcome {
  kind: BidOutcomeKind;
  highestAmount: number | null;
  /** Everyone tied at the highest amount (one ID for a clear winner). */
  topBidderIds: string[];
  closedAt: number;
}

export interface Round {
  id: string;
  number: number;
  pitcherId: string;
  status: RoundStatus;
  /** Changes on every bidding restart so stale commands cannot touch a new attempt. */
  attemptId: string;
  attemptNumber: number;
  timerStartedAt: number | null;
  /** Exclusive deadline: a bid received at or after this instant is rejected. */
  timerEndsAt: number | null;
  /** Bids for the current attempt only. */
  bids: Bid[];
  outcome: BidOutcome | null;
  winnerId: string | null;
  winningAmount: number | null;
  transactionId: string | null;
  completedAt: number | null;
}

export interface CreditTransaction {
  id: string;
  roundId: string;
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  fromBalanceBefore: number;
  fromBalanceAfter: number;
  toBalanceBefore: number;
  toBalanceAfter: number;
  createdAt: number;
}

export interface RoomState {
  schemaVersion: 1;
  id: string;
  code: string;
  hostPlayerId: string;
  startingCredits: number;
  biddingSeconds: number;
  phase: Phase;
  endReason: EndReason | null;
  /** Monotonically increasing; bumped on every persisted change. */
  revision: number;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  endedAt: number | null;
  expiresAt: number;
  players: Player[];
  /** Random permutation of player IDs, fixed when the game starts. */
  pitchingOrder: string[];
  /** Index into `rounds` of the current round, or -1 before the game starts. */
  currentRoundIndex: number;
  rounds: Round[];
  transactions: CreditTransaction[];
  /** Recently applied client request IDs, for idempotent retries. */
  processedRequests: string[];
}

/** Commands a client may send. Identity always comes from the session, never the payload. */
export type GameCommand =
  | { type: "GAME_START" }
  | { type: "BIDDING_START"; roundId: string }
  | { type: "BID_SUBMIT"; roundId: string; attemptId: string; amount: number }
  | { type: "BID_WITHDRAW"; roundId: string; attemptId: string }
  | { type: "BIDDING_RESTART"; roundId: string }
  | { type: "WINNER_CONFIRM"; roundId: string; winnerId: string }
  | { type: "NEXT_ROUND"; roundId: string }
  | { type: "GAME_END" };

export type CommandType = GameCommand["type"];

/** What caused a state change. Clients use it to pick feedback and animations. */
export type StateCause =
  | "SNAPSHOT"
  | "ROOM_CREATED"
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "CONNECTION_CHANGED"
  | "GAME_STARTED"
  | "BIDDING_STARTED"
  | "BID_ACCEPTED"
  | "BID_WITHDRAWN"
  | "BIDDING_ENDED"
  | "BIDDING_RESTARTED"
  | "WINNER_CONFIRMED"
  | "ROUND_CHANGED"
  | "AWAITING_END"
  | "GAME_ENDED";

export type ErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "EXPIRED"
  | "RATE_LIMITED"
  | "ROOMS_FULL"
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "GAME_STARTED"
  | "ROOM_ENDED"
  | "NOT_HOST"
  | "INVALID_PHASE"
  | "STALE_ROUND"
  | "NOT_ENOUGH_PLAYERS"
  | "BIDDING_CLOSED"
  | "IS_PITCHER"
  | "BID_TOO_HIGH"
  | "BID_TOO_LOW"
  | "NO_BID"
  | "NOT_ELIGIBLE_WINNER"
  | "ALREADY_CONFIRMED"
  | "INSUFFICIENT_CREDITS"
  | "OFFLINE"
  | "INTERNAL";

export interface GameError {
  code: ErrorCode;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Client-facing view                                                  */
/* ------------------------------------------------------------------ */

export interface PlayerView {
  id: string;
  displayName: string;
  credits: number;
  paddle: number;
  isHost: boolean;
  isConnected: boolean;
  hasPitched: boolean;
}

export interface RevealedBid {
  playerId: string;
  amount: number;
}

export interface TransferView {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  fromBefore: number;
  fromAfter: number;
  toBefore: number;
  toAfter: number;
}

export interface RoundView {
  id: string;
  number: number;
  totalRounds: number;
  pitcherId: string;
  status: RoundStatus;
  attemptId: string;
  attemptNumber: number;
  timerStartedAt: number | null;
  timerEndsAt: number | null;
  // No bid count while bidding is open: bidding is fully anonymous until the reveal.
  /** Present only after bidding has closed. */
  reveal: {
    kind: BidOutcomeKind;
    bids: RevealedBid[];
    highestAmount: number | null;
    topBidderIds: string[];
  } | null;
  winnerId: string | null;
  winningAmount: number | null;
  transfer: TransferView | null;
}

export interface HistoryEntry {
  number: number;
  pitcherId: string;
  status: RoundStatus;
  winnerId: string | null;
  winningAmount: number | null;
}

export interface ClientView {
  revision: number;
  serverNow: number;
  room: {
    id: string;
    code: string;
    phase: Phase;
    endReason: EndReason | null;
    hostPlayerId: string;
    startingCredits: number;
    biddingSeconds: number;
    createdAt: number;
    startedAt: number | null;
    endedAt: number | null;
    expiresAt: number;
  };
  me: {
    id: string;
    isHost: boolean;
    credits: number;
    /** My provisional bid in the current attempt, or null. Never shown as spent. */
    myBid: number | null;
  };
  players: PlayerView[];
  round: RoundView | null;
  history: HistoryEntry[];
}
