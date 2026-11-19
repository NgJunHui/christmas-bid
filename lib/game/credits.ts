import type { CreditTransaction, Player } from "./types";

export type SpendResult =
  | { ok: true; players: Player[]; transaction: CreditTransaction }
  | { ok: false; code: "INSUFFICIENT_CREDITS" | "INVALID_INPUT" | "NOT_FOUND"; message: string };

/**
 * The winning bidder spends `amount` integer credits on a gift. The credits leave the
 * game: nobody receives them (the pitcher isn't paid). Returns new player objects; the
 * input is not mutated. The caller persists the result in a single write.
 */
export function spendCredits(
  players: readonly Player[],
  input: { id: string; roundId: string; playerId: string; amount: number; now: number },
): SpendResult {
  const { amount } = input;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "Spending must be a positive whole number of credits." };
  }
  const from = players.find((p) => p.id === input.playerId);
  if (!from) {
    return { ok: false, code: "NOT_FOUND", message: "That player isn't in this room." };
  }
  if (from.credits < amount) {
    return { ok: false, code: "INSUFFICIENT_CREDITS", message: `${from.displayName} doesn't have enough credits.` };
  }

  const transaction: CreditTransaction = {
    id: input.id,
    roundId: input.roundId,
    fromPlayerId: from.id,
    toPlayerId: null,
    amount,
    fromBalanceBefore: from.credits,
    fromBalanceAfter: from.credits - amount,
    toBalanceBefore: null,
    toBalanceAfter: null,
    createdAt: input.now,
  };

  const next = players.map((player) =>
    player.id === from.id ? { ...player, credits: transaction.fromBalanceAfter } : player,
  );
  return { ok: true, players: next, transaction };
}

export function totalCredits(players: readonly Pick<Player, "credits">[]): number {
  return players.reduce((sum, player) => sum + player.credits, 0);
}
