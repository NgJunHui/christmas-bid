import type { Bid, BidOutcome, BidOutcomeKind } from "./types";

export type BidValidation =
  | { ok: true }
  | { ok: false; code: "BID_TOO_LOW" | "BID_TOO_HIGH" | "INVALID_INPUT"; message: string };

/** A bid must be a whole number from 1 up to the bidder's available balance. */
export function validateBidAmount(amount: number, available: number): BidValidation {
  if (!Number.isSafeInteger(amount)) {
    return { ok: false, code: "INVALID_INPUT", message: "Bids must be whole credits." };
  }
  if (amount < 1) {
    return { ok: false, code: "BID_TOO_LOW", message: "Bid at least 1 credit." };
  }
  if (amount > available) {
    return {
      ok: false,
      code: "BID_TOO_HIGH",
      message: `You only have ${available} credit${available === 1 ? "" : "s"} to bid.`,
    };
  }
  return { ok: true };
}

/**
 * Deadline check against server receipt time. The deadline is exclusive:
 * a bid that arrives at exactly `endsAt` is too late.
 */
export function isBeforeDeadline(now: number, endsAt: number | null): boolean {
  return endsAt !== null && now < endsAt;
}

/** Insert or replace a player's single bid for the current attempt. */
export function upsertBid(bids: readonly Bid[], playerId: string, amount: number, now: number): Bid[] {
  const existing = bids.find((bid) => bid.playerId === playerId);
  if (existing) {
    return bids.map((bid) => (bid.playerId === playerId ? { ...bid, amount, updatedAt: now } : bid));
  }
  return [...bids, { playerId, amount, createdAt: now, updatedAt: now }];
}

/** Bids sorted highest first; ties keep submission order. */
export function sortBids(bids: readonly Bid[]): Bid[] {
  return [...bids].sort((a, b) => b.amount - a.amount || a.createdAt - b.createdAt);
}

/** Highest amount, everyone tied at it, and whether this is a clear win, tie, or no bids. */
export function resolveBids(bids: readonly Bid[], closedAt: number): BidOutcome {
  if (bids.length === 0) {
    return { kind: "NO_BIDS", highestAmount: null, topBidderIds: [], closedAt };
  }
  const highestAmount = Math.max(...bids.map((bid) => bid.amount));
  const topBidderIds = sortBids(bids)
    .filter((bid) => bid.amount === highestAmount)
    .map((bid) => bid.playerId);
  const kind: BidOutcomeKind = topBidderIds.length > 1 ? "TIE" : "SINGLE";
  return { kind, highestAmount, topBidderIds, closedAt };
}
