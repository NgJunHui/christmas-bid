import type { CreditTransaction, Player } from "./types";

export type TransferResult =
  | { ok: true; players: Player[]; transaction: CreditTransaction }
  | { ok: false; code: "INSUFFICIENT_CREDITS" | "INVALID_INPUT" | "NOT_FOUND"; message: string };

/**
 * Move `amount` integer credits from one player to another. Returns new
 * player objects; the input is not mutated. The caller persists the result
 * in a single write, so the debit and the credit land together or not at all.
 */
export function transferCredits(
  players: readonly Player[],
  input: { id: string; roundId: string; fromPlayerId: string; toPlayerId: string; amount: number; now: number },
): TransferResult {
  const { amount } = input;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "Transfers must be a positive whole number of credits." };
  }
  if (input.fromPlayerId === input.toPlayerId) {
    return { ok: false, code: "INVALID_INPUT", message: "A player can't pay themselves." };
  }
  const from = players.find((p) => p.id === input.fromPlayerId);
  const to = players.find((p) => p.id === input.toPlayerId);
  if (!from || !to) {
    return { ok: false, code: "NOT_FOUND", message: "That player isn't in this room." };
  }
  if (from.credits < amount) {
    return { ok: false, code: "INSUFFICIENT_CREDITS", message: `${from.displayName} doesn't have enough credits.` };
  }

  const transaction: CreditTransaction = {
    id: input.id,
    roundId: input.roundId,
    fromPlayerId: from.id,
    toPlayerId: to.id,
    amount,
    fromBalanceBefore: from.credits,
    fromBalanceAfter: from.credits - amount,
    toBalanceBefore: to.credits,
    toBalanceAfter: to.credits + amount,
    createdAt: input.now,
  };

  const next = players.map((player) => {
    if (player.id === from.id) return { ...player, credits: transaction.fromBalanceAfter };
    if (player.id === to.id) return { ...player, credits: transaction.toBalanceAfter };
    return player;
  });
  return { ok: true, players: next, transaction };
}

export function totalCredits(players: readonly Pick<Player, "credits">[]): number {
  return players.reduce((sum, player) => sum + player.credits, 0);
}
