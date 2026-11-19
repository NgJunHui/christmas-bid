/**
 * Build the per-player snapshot sent over the wire. This is the only place
 * room state is exposed, so it's where bid privacy is enforced: while bidding
 * is open, nobody (host included) receives other players' amounts or
 * identities. Only an aggregate count and the viewer's own bid go out.
 */
import { sortBids } from "./bidding";
import { currentRound } from "./engine";
import type { ClientView, RoomState, Round, RoundView, TransferView } from "./types";

function revealOf(round: Round): RoundView["reveal"] {
  if ((round.status !== "CLOSED" && round.status !== "CONFIRMED") || !round.outcome) return null;
  return {
    kind: round.outcome.kind,
    bids: sortBids(round.bids).map((bid) => ({ playerId: bid.playerId, amount: bid.amount })),
    highestAmount: round.outcome.highestAmount,
    topBidderIds: [...round.outcome.topBidderIds],
  };
}

function transferOf(state: RoomState, round: Round): TransferView | null {
  if (!round.transactionId) return null;
  const tx = state.transactions.find((t) => t.id === round.transactionId);
  if (!tx) return null;
  return {
    fromPlayerId: tx.fromPlayerId,
    toPlayerId: tx.toPlayerId,
    amount: tx.amount,
    fromBefore: tx.fromBalanceBefore,
    fromAfter: tx.fromBalanceAfter,
    toBefore: tx.toBalanceBefore,
    toAfter: tx.toBalanceAfter,
  };
}

export function toRoundView(state: RoomState, round: Round): RoundView {
  return {
    id: round.id,
    number: round.number,
    totalRounds: state.pitchingOrder.length,
    pitcherId: round.pitcherId,
    status: round.status,
    attemptId: round.attemptId,
    attemptNumber: round.attemptNumber,
    timerStartedAt: round.timerStartedAt,
    timerEndsAt: round.timerEndsAt,
    reveal: revealOf(round),
    winnerId: round.winnerId,
    winningAmount: round.winningAmount,
    transfer: transferOf(state, round),
  };
}

export function toClientView(
  state: RoomState,
  viewerId: string,
  connectedIds: ReadonlySet<string>,
  now: number,
): ClientView {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (!viewer) throw new Error("Viewer is not in this room");
  const round = currentRound(state);
  const myBid =
    round && round.status === "BIDDING"
      ? (round.bids.find((bid) => bid.playerId === viewerId)?.amount ?? null)
      : null;

  return {
    revision: state.revision,
    serverNow: now,
    room: {
      id: state.id,
      code: state.code,
      phase: state.phase,
      endReason: state.endReason,
      hostPlayerId: state.hostPlayerId,
      startingCredits: state.startingCredits,
      biddingSeconds: state.biddingSeconds,
      createdAt: state.createdAt,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      expiresAt: state.expiresAt,
    },
    me: {
      id: viewer.id,
      isHost: viewer.id === state.hostPlayerId,
      credits: viewer.credits,
      myBid,
    },
    players: state.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      credits: player.credits,
      paddle: player.paddle,
      isHost: player.id === state.hostPlayerId,
      isConnected: connectedIds.has(player.id),
      hasPitched: player.hasPitched,
      hasLeft: Boolean(player.leftAt),
    })),
    round: round ? toRoundView(state, round) : null,
    history: state.rounds.map((r) => ({
      number: r.number,
      pitcherId: r.pitcherId,
      status: r.status,
      winnerId: r.winnerId,
      winningAmount: r.winningAmount,
    })),
  };
}
