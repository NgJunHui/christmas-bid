import { describe, expect, it } from "vitest";
import { isBeforeDeadline, resolveBids, upsertBid, validateBidAmount } from "../../lib/game/bidding";
import { spendCredits, totalCredits } from "../../lib/game/credits";
import { addPlayer, applyCommand, canTransition, createRoom, leaveGame, removePlayer, settle } from "../../lib/game/engine";
import { isValidName, normalizeName, sanitizeNameInput } from "../../lib/game/names";
import { shuffle } from "../../lib/game/order";
import type { RoomState } from "../../lib/game/types";
import { toClientView } from "../../lib/game/view";
import { closeBidding, lobby, makeCtx, must, round, seeded } from "../helpers";

const everyone = (ids: string[]) => new Set(ids);

describe("pitching order", () => {
  it("is a permutation with every player exactly once", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    for (let seed = 1; seed <= 200; seed++) {
      const order = shuffle(ids, seeded(seed));
      expect(order).toHaveLength(ids.length);
      expect(new Set(order)).toEqual(new Set(ids));
    }
  });

  it("is fixed at game start and each player pitches exactly once", () => {
    const { state: start, ids, clock } = lobby(["Host", "Alex", "Jamie", "Sam"]);
    let state = must(start, "p0", { type: "GAME_START" }, clock.ctx());
    const order = [...state.pitchingOrder];
    const pitchers: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const r = round(state);
      pitchers.push(r.pitcherId);
      expect(state.pitchingOrder).toEqual(order);
      const bidder = ids.find((id) => id !== r.pitcherId)!;
      state = must(state, "p0", { type: "BIDDING_START", roundId: r.id }, clock.ctx());
      state = must(state, bidder, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 1 }, clock.ctx());
      state = closeBidding(state, clock);
      // Confirming goes straight to the next pitch (no winner screen), and ends the game after the last.
      state = must(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: bidder }, clock.ctx());
    }
    expect(pitchers).toEqual(order);
    expect(new Set(pitchers).size).toBe(ids.length);
    expect(state.phase).toBe("ENDED");
    expect(state.endReason).toBe("COMPLETED");
    expect(state.players.every((p) => p.hasPitched)).toBe(true);
  });
});

describe("room setup", () => {
  it("gives every player the starting credits, host included", () => {
    const { state } = lobby(["Host", "Alex", "Jamie"], 35);
    expect(state.players.map((p) => p.credits)).toEqual([35, 35, 35]);
    expect(state.hostPlayerId).toBe("p0");
  });

  it("normalizes names and rejects case-insensitive duplicates", () => {
    expect(normalizeName("  Mary   Jane ‮ ")).toBe("Mary Jane");
    const { state, clock } = lobby(["Host", "Alex"]);
    const dup = addPlayer(state, { id: "x", displayName: "  ALEX ", tokenHash: "h" }, clock.ctx());
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe("NAME_TAKEN");
    const empty = addPlayer(state, { id: "y", displayName: "   ", tokenHash: "h" }, clock.ctx());
    expect(!empty.ok && empty.error.code).toBe("INVALID_INPUT");
    const long = addPlayer(state, { id: "z", displayName: "x".repeat(21), tokenHash: "h" }, clock.ctx());
    expect(!long.ok && long.error.code).toBe("INVALID_INPUT");
  });

  it("accepts letters, numbers and single spaces, up to 20", () => {
    expect(isValidName("Alex")).toBe(true);
    expect(isValidName("Player7")).toBe(true);
    expect(isValidName("José")).toBe(true);
    expect(isValidName("Mary Jane")).toBe(true);
    expect(isValidName("Santa Claus 2")).toBe(true);
    expect(isValidName("x".repeat(20))).toBe(true);
    expect(isValidName("x".repeat(21))).toBe(false);
    for (const bad of ["Al-ex", "Sam!", "🎄Tree", "a_b", "", " Alex", "Alex ", "Mary  Jane"]) expect(isValidName(bad)).toBe(false);
    const { state, clock } = lobby(["Host"]);
    // Extra spaces are normalized away before validation.
    const spaced = addPlayer(state, { id: "s", displayName: "  Mary   Jane ", tokenHash: "h" }, clock.ctx());
    expect(spaced.ok && spaced.state.players.at(-1)!.displayName).toBe("Mary Jane");
  });

  it("sanitizes name input as you type", () => {
    expect(sanitizeNameInput("Mary Jane!")).toEqual({ value: "Mary Jane", changed: true });
    expect(sanitizeNameInput("Alex")).toEqual({ value: "Alex", changed: false });
    // Space tidying is silent: no leading or double spaces, a trailing one is kept for the next word.
    expect(sanitizeNameInput("  Mary  Jane")).toEqual({ value: "Mary Jane", changed: false });
    expect(sanitizeNameInput("Mary ")).toEqual({ value: "Mary ", changed: false });
    expect(sanitizeNameInput("a".repeat(25)).value).toHaveLength(20);
  });

  it("rejects new players once the game has started", () => {
    const { state, clock } = lobby(["Host", "Alex"]);
    const started = must(state, "p0", { type: "GAME_START" }, clock.ctx());
    const late = addPlayer(started, { id: "late", displayName: "Late", tokenHash: "h" }, clock.ctx());
    expect(!late.ok && late.error.code).toBe("GAME_STARTED");
  });

  it("needs two players to start", () => {
    const { state, clock } = lobby(["Host"]);
    const result = applyCommand(state, "p0", { type: "GAME_START" }, clock.ctx());
    expect(!result.ok && result.error.code).toBe("NOT_ENOUGH_PLAYERS");
  });

  it("lets guests leave the lobby but not the host", () => {
    const { state, clock } = lobby(["Host", "Alex"]);
    const left = removePlayer(state, "p1", clock.ctx());
    expect(left.ok && left.state.players.map((p) => p.id)).toEqual(["p0"]);
    expect(removePlayer(state, "p0", clock.ctx()).ok).toBe(false);
  });
});

describe("bids", () => {
  it("accepts whole numbers from 1 up to the balance", () => {
    expect(validateBidAmount(1, 20).ok).toBe(true);
    expect(validateBidAmount(20, 20).ok).toBe(true);
    expect(validateBidAmount(0, 20)).toMatchObject({ ok: false, code: "BID_TOO_LOW" });
    expect(validateBidAmount(21, 20)).toMatchObject({ ok: false, code: "BID_TOO_HIGH" });
    expect(validateBidAmount(2.5, 20)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("keeps one bid per player; updating replaces it", () => {
    let bids = upsertBid([], "a", 5, 1);
    bids = upsertBid(bids, "b", 7, 2);
    bids = upsertBid(bids, "a", 9, 3);
    expect(bids).toHaveLength(2);
    expect(bids.find((b) => b.playerId === "a")).toMatchObject({ amount: 9, createdAt: 1, updatedAt: 3 });
  });

  it("uses an exclusive deadline", () => {
    expect(isBeforeDeadline(999, 1000)).toBe(true);
    expect(isBeforeDeadline(1000, 1000)).toBe(false);
    expect(isBeforeDeadline(1000, null)).toBe(false);
  });

  it("finds the highest bid, ties, and empty rounds", () => {
    expect(resolveBids([], 0)).toMatchObject({ kind: "NO_BIDS", highestAmount: null, topBidderIds: [] });
    const single = resolveBids(
      [
        { playerId: "a", amount: 5, createdAt: 1, updatedAt: 1 },
        { playerId: "b", amount: 9, createdAt: 2, updatedAt: 2 },
      ],
      0,
    );
    expect(single).toMatchObject({ kind: "SINGLE", highestAmount: 9, topBidderIds: ["b"] });
    const tie = resolveBids(
      [
        { playerId: "a", amount: 9, createdAt: 1, updatedAt: 1 },
        { playerId: "b", amount: 9, createdAt: 2, updatedAt: 2 },
        { playerId: "c", amount: 3, createdAt: 3, updatedAt: 3 },
      ],
      0,
    );
    expect(tie).toMatchObject({ kind: "TIE", highestAmount: 9, topBidderIds: ["a", "b"] });
  });
});

/** Start a game and open bidding, returning the pitcher and the others. */
function openBidding(names = ["Host", "Alex", "Jamie", "Sam"], credits = 20) {
  const setup = lobby(names, credits);
  let state = must(setup.state, "p0", { type: "GAME_START" }, setup.clock.ctx());
  const r = round(state);
  state = must(state, "p0", { type: "BIDDING_START", roundId: r.id }, setup.clock.ctx());
  const others = setup.ids.filter((id) => id !== r.pitcherId);
  return { ...setup, state, r: round(state), pitcher: r.pitcherId, others };
}

describe("bidding rules", () => {
  it("rejects bids at or after the deadline, even if the client still shows time", () => {
    const { state, r, others, clock } = openBidding();
    clock.advance(r.timerEndsAt! - clock.now - 1);
    const lastMoment = applyCommand(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 3 }, clock.ctx());
    expect(lastMoment.ok).toBe(true);
    clock.advance(1);
    const late = applyCommand(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 3 }, clock.ctx());
    expect(!late.ok && late.error.code).toBe("BIDDING_CLOSED");
  });

  it("does not let the pitcher bid on their own gift", () => {
    const { state, r, pitcher, clock } = openBidding();
    const result = applyCommand(state, pitcher, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 1 }, clock.ctx());
    expect(!result.ok && result.error.code).toBe("IS_PITCHER");
  });

  it("rejects bids above the balance on the server", () => {
    const { state, r, others, clock } = openBidding();
    const result = applyCommand(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 21 }, clock.ctx());
    expect(!result.ok && result.error.code).toBe("BID_TOO_HIGH");
  });

  it("does not deduct credits while bidding is open", () => {
    const { state, r, others, clock } = openBidding();
    const next = must(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 15 }, clock.ctx());
    expect(next.players.find((p) => p.id === others[0])!.credits).toBe(20);
  });

  it("never leaks unrevealed bids in anyone's view, host included", () => {
    const { state, r, others, ids, clock } = openBidding();
    let next = must(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 13 }, clock.ctx());
    next = must(next, others[1]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 17 }, clock.ctx());
    for (const viewer of ids) {
      const view = toClientView(next, viewer, everyone(ids), clock.now);
      expect(view.round!.reveal).toBeNull();
      const own = viewer === others[0] ? 13 : viewer === others[1] ? 17 : null;
      expect(view.me.myBid).toBe(own);
      // No bid amounts, bidder identities, or even a bid count anywhere in the payload.
      expect(JSON.stringify(view)).not.toMatch(/"amount"|"bids"|"topBidderIds"|"bidCount"/);
    }
  });

  it("reveals all bids to everyone once bidding closes", () => {
    const { state, r, others, ids, clock } = openBidding();
    let next = must(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 4 }, clock.ctx());
    next = must(next, others[1]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 8 }, clock.ctx());
    next = closeBidding(next, clock);
    expect(next.phase).toBe("REVEAL");
    const views = ids.map((id) => toClientView(next, id, everyone(ids), clock.now).round!.reveal);
    for (const reveal of views) expect(reveal).toEqual(views[0]);
    expect(views[0]!.bids.map((b) => b.amount)).toEqual([8, 4]);
  });
});

describe("winner confirmation", () => {
  function revealed(amounts: number[]) {
    const setup = openBidding(["Host", "Alex", "Jamie", "Sam"]);
    let state = setup.state;
    amounts.forEach((amount, i) => {
      state = must(state, setup.others[i]!, { type: "BID_SUBMIT", roundId: setup.r.id, attemptId: setup.r.attemptId, amount }, setup.clock.ctx());
    });
    return { ...setup, state: closeBidding(state, setup.clock) };
  }

  it("the winner spends their bid; nobody else's balance changes, the pitcher's included", () => {
    const { state, r, others, pitcher, clock } = revealed([15, 12]);
    const next = must(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[0]! }, clock.ctx());
    const credit = (id: string) => next.players.find((p) => p.id === id)!.credits;
    expect(credit(others[0]!)).toBe(5);
    expect(credit(pitcher)).toBe(20);
    expect(credit(others[1]!)).toBe(20);
    expect(credit(others[2]!)).toBe(20);
    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0]).toMatchObject({ fromPlayerId: others[0], toPlayerId: null, amount: 15 });
    // No winner screen: straight on to drawing the next pitcher.
    expect(next.phase).toBe("PITCHING");
    expect(round(next).number).toBe(r.number + 1);
    expect(totalCredits(next.players)).toBe(80 - 15);
  });

  it("is idempotent: confirming twice transfers once", () => {
    const { state, r, others, clock } = revealed([15]);
    const once = must(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[0]! }, clock.ctx());
    const twice = applyCommand(once, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[0]! }, clock.ctx());
    expect(twice).toMatchObject({ ok: true, duplicate: true });
    if (twice.ok) expect(twice.state.transactions).toHaveLength(1);
    const other = applyCommand(once, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[1]! }, clock.ctx());
    expect(!other.ok && other.error.code).toBe("ALREADY_CONFIRMED");
  });

  it("only allows a highest bidder to win", () => {
    const { state, r, others, clock } = revealed([15, 12]);
    const lower = applyCommand(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[1]! }, clock.ctx());
    expect(!lower.ok && lower.error.code).toBe("NOT_ELIGIBLE_WINNER");
  });

  it("lets the host pick any tied player, and only that player pays", () => {
    const { state, r, others, pitcher, clock } = revealed([10, 10, 4]);
    expect(state.phase).toBe("TIEBREAKER");
    const next = must(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[1]! }, clock.ctx());
    const credit = (id: string) => next.players.find((p) => p.id === id)!.credits;
    expect(credit(others[1]!)).toBe(10);
    expect(credit(others[0]!)).toBe(20);
    expect(credit(pitcher)).toBe(20);
    const nonTied = applyCommand(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[2]! }, clock.ctx());
    expect(!nonTied.ok && nonTied.error.code).toBe("NOT_ELIGIBLE_WINNER");
  });

  it("refuses spending that would make a balance negative", () => {
    const players = [
      { id: "a", displayName: "A", credits: 3, paddle: 1, hasPitched: false, joinedAt: 0, tokenHash: "" },
      { id: "b", displayName: "B", credits: 3, paddle: 2, hasPitched: false, joinedAt: 0, tokenHash: "" },
    ];
    const result = spendCredits(players, { id: "t", roundId: "r", playerId: "a", amount: 4, now: 0 });
    expect(result).toMatchObject({ ok: false, code: "INSUFFICIENT_CREDITS" });
  });
});

describe("no bids and restarts", () => {
  it("restarts the same round with a fresh attempt and no transfer", () => {
    const { state, r, others, clock } = openBidding();
    const empty = closeBidding(state, clock);
    expect(empty.phase).toBe("NO_BIDS");
    const restarted = must(empty, "p0", { type: "BIDDING_RESTART", roundId: r.id }, clock.ctx());
    const r2 = round(restarted);
    expect(r2.id).toBe(r.id);
    expect(r2.number).toBe(r.number);
    expect(r2.attemptId).not.toBe(r.attemptId);
    expect(r2.attemptNumber).toBe(2);
    expect(r2.timerEndsAt).toBe(clock.now + 30_000);
    expect(restarted.transactions).toHaveLength(0);
    const stale = applyCommand(restarted, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 2 }, clock.ctx());
    expect(!stale.ok && stale.error.code).toBe("STALE_ROUND");
  });

  it("refuses to restart when bids exist", () => {
    const { state, r, others, clock } = openBidding();
    const withBid = closeBidding(
      must(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 2 }, clock.ctx()),
      clock,
    );
    const result = applyCommand(withBid, "p0", { type: "BIDDING_RESTART", roundId: r.id }, clock.ctx());
    expect(!result.ok && result.error.code).toBe("INVALID_PHASE");
  });
});

describe("leaving a running game for good", () => {
  const mustLeave = (state: RoomState, playerId: string, clock: ReturnType<typeof makeCtx>) => {
    const result = leaveGame(state, playerId, clock.ctx());
    if (!result.ok || result.duplicate) throw new Error(result.ok ? "Expected a change" : result.error.message);
    return result;
  };

  /** A started game whose current pitcher is a guest (the host may be drawn first). */
  function guestPitching() {
    const setup = lobby(["Host", "Alex", "Jamie", "Sam"]);
    let state = must(setup.state, "p0", { type: "GAME_START" }, setup.clock.ctx());
    if (round(state).pitcherId === "p0") {
      const r = round(state);
      const bidder = setup.ids.find((id) => id !== r.pitcherId)!;
      state = must(state, "p0", { type: "BIDDING_START", roundId: r.id }, setup.clock.ctx());
      state = must(state, bidder, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 1 }, setup.clock.ctx());
      state = closeBidding(state, setup.clock);
      state = must(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: bidder }, setup.clock.ctx());
    }
    return { ...setup, state };
  }

  it("revokes the seat, drops their turn, and keeps the game going", () => {
    const { state, r, others, clock } = openBidding();
    const guest = others.find((id) => id !== "p0")!;
    const { state: next, cause } = mustLeave(state, guest, clock);
    const leaver = next.players.find((p) => p.id === guest)!;
    expect(cause).toBe("PLAYER_LEFT");
    expect(leaver.leftAt).toBe(clock.now);
    expect(leaver.tokenHash).toBe("");
    // They hadn't pitched yet, so their round is gone from the order.
    expect(next.pitchingOrder).not.toContain(guest);
    expect(next.pitchingOrder).toHaveLength(state.pitchingOrder.length - 1);
    expect(next.phase).toBe("BIDDING");
    const bid = applyCommand(next, guest, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 2 }, clock.ctx());
    expect(!bid.ok && bid.error.code).toBe("UNAUTHORIZED");
    expect(toClientView(next, "p0", everyone([]), clock.now).players.find((p) => p.id === guest)!.hasLeft).toBe(true);
  });

  it("skips the round when the pitcher leaves, with no credits moving", () => {
    const { state: start, ids, clock } = guestPitching();
    const r = round(start);
    let state = must(start, "p0", { type: "BIDDING_START", roundId: r.id }, clock.ctx());
    const bidder = ids.find((id) => id !== r.pitcherId)!;
    state = must(state, bidder, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 5 }, clock.ctx());
    const transactions = state.transactions.length;

    const { state: next, cause } = mustLeave(state, r.pitcherId, clock);
    expect(cause).toBe("ROUND_CHANGED");
    expect(next.rounds.find((x) => x.id === r.id)!.status).toBe("CANCELLED");
    expect(next.phase).toBe("PITCHING");
    expect(round(next).number).toBe(r.number + 1);
    expect(round(next).pitcherId).not.toBe(r.pitcherId);
    expect(next.transactions).toHaveLength(transactions);
  });

  it("re-resolves the bids when a top bidder leaves", () => {
    const { state, r, others, clock } = openBidding();
    const leaver = others.find((id) => id !== "p0")!;
    const stayer = others.find((id) => id !== leaver)!;
    let next = must(state, leaver, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 9 }, clock.ctx());
    next = must(next, stayer, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 4 }, clock.ctx());
    next = closeBidding(next, clock);
    expect(round(next).outcome!.topBidderIds).toEqual([leaver]);

    next = mustLeave(next, leaver, clock).state;
    expect(next.phase).toBe("REVEAL");
    expect(round(next).outcome).toMatchObject({ kind: "SINGLE", highestAmount: 4, topBidderIds: [stayer] });
    expect(round(next).bids.map((b) => b.playerId)).toEqual([stayer]);
  });

  it("isn't for the host, who ends the game instead", () => {
    const { state, clock } = openBidding();
    const result = leaveGame(state, "p0", clock.ctx());
    expect(!result.ok && result.error.code).toBe("INVALID_INPUT");
  });
});

describe("host ends bidding early", () => {
  it("closes now with the bids so far, same as the timer running out", () => {
    const { state, r, others, clock } = openBidding();
    let next = must(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 7 }, clock.ctx());
    clock.advance(5_000);
    next = must(next, "p0", { type: "BIDDING_END", roundId: r.id, attemptId: r.attemptId }, clock.ctx());
    expect(next.phase).toBe("REVEAL");
    expect(round(next).status).toBe("CLOSED");
    expect(round(next).timerEndsAt).toBe(clock.now);
    // The original deadline no longer matters.
    expect(settle(next, clock.now + 60_000)).toBeNull();
    const late = applyCommand(next, others[1]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 3 }, clock.ctx());
    expect(!late.ok && late.error.code).toBe("BIDDING_CLOSED");
  });

  it("goes to no-bids when nobody has bid yet", () => {
    const { state, r, clock } = openBidding();
    const next = must(state, "p0", { type: "BIDDING_END", roundId: r.id, attemptId: r.attemptId }, clock.ctx());
    expect(next.phase).toBe("NO_BIDS");
  });

  it("is host-only, and only while bidding is open", () => {
    const { state, r, others, clock } = openBidding();
    const guest = others.find((id) => id !== "p0")!;
    const notHost = applyCommand(state, guest, { type: "BIDDING_END", roundId: r.id, attemptId: r.attemptId }, clock.ctx());
    expect(!notHost.ok && notHost.error.code).toBe("NOT_HOST");
    const closed = closeBidding(state, clock);
    const again = applyCommand(closed, "p0", { type: "BIDDING_END", roundId: r.id, attemptId: r.attemptId }, clock.ctx());
    expect(!again.ok && again.error.code).toBe("BIDDING_CLOSED");
  });
});

describe("state machine guards", () => {
  it("only lets the host run the game", () => {
    const { state, clock } = lobby(["Host", "Alex"]);
    for (const command of [{ type: "GAME_START" }, { type: "GAME_END" }] as const) {
      const result = applyCommand(state, "p1", command, clock.ctx());
      expect(!result.ok && result.error.code).toBe("NOT_HOST");
    }
  });

  it("blocks invalid transitions", () => {
    const { state, r, others, clock } = openBidding();
    const twice = applyCommand(state, "p0", { type: "BIDDING_START", roundId: r.id }, clock.ctx());
    expect(!twice.ok && twice.error.code).toBe("INVALID_PHASE");
    const early = applyCommand(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId: others[0]! }, clock.ctx());
    expect(!early.ok && early.error.code).toBe("INVALID_PHASE");
    const skip = applyCommand(state, "p0", { type: "NEXT_ROUND", roundId: r.id }, clock.ctx());
    expect(!skip.ok && skip.error.code).toBe("INVALID_PHASE");
    expect(canTransition("LOBBY", "BIDDING")).toBe(false);
    expect(canTransition("ENDED", "PITCHING")).toBe(false);
  });

  it("ends early without transferring credits for the unfinished round", () => {
    const { state, r, others, clock } = openBidding();
    const withBid = must(state, others[0]!, { type: "BID_SUBMIT", roundId: r.id, attemptId: r.attemptId, amount: 9 }, clock.ctx());
    const ended = must(withBid, "p0", { type: "GAME_END" }, clock.ctx());
    expect(ended.phase).toBe("ENDED");
    expect(ended.endReason).toBe("ENDED_EARLY");
    expect(round(ended).status).toBe("CANCELLED");
    expect(round(ended).bids).toHaveLength(0);
    expect(ended.players.every((p) => p.credits === 20)).toBe(true);
    const after = applyCommand(ended, "p0", { type: "GAME_START" }, clock.ctx());
    expect(!after.ok && after.error.code).toBe("ROOM_ENDED");
  });

  it("settles only once the deadline has passed", () => {
    const { state, clock } = openBidding();
    expect(settle(state, clock.now)).toBeNull();
    expect(closeBidding(state, clock).phase).toBe("NO_BIDS");
  });
});

describe("credit accounting", () => {
  it("across many random games, only winners spend; totals drop by exactly that, never negative", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const random = seeded(seed);
      const size = 2 + Math.floor(random() * 6);
      const credits = 1 + Math.floor(random() * 40);
      const clock = makeCtx(1_000_000, seed);
      const setup = lobby(Array.from({ length: size }, (_, i) => `Player${i}`), credits, clock);
      const starting = size * credits;
      let spent = 0;
      let state: RoomState = must(setup.state, "p0", { type: "GAME_START" }, clock.ctx());

      while (state.phase !== "ENDED") {
        const r = round(state);
        // Credits only go down now, so a game can run dry: the host ends it.
        if (!state.players.some((p) => p.id !== r.pitcherId && p.credits > 0)) {
          state = must(state, "p0", { type: "GAME_END" }, clock.ctx());
          break;
        }
        state = must(state, "p0", { type: r.attemptNumber === 1 && r.status === "PITCHING" ? "BIDDING_START" : "BIDDING_RESTART", roundId: r.id }, clock.ctx());
        for (const player of state.players) {
          if (player.id === r.pitcherId || player.credits === 0 || random() < 0.3) continue;
          const amount = 1 + Math.floor(random() * player.credits);
          state = must(state, player.id, { type: "BID_SUBMIT", roundId: r.id, attemptId: round(state).attemptId, amount }, clock.ctx());
        }
        state = closeBidding(state, clock);
        if (state.phase === "NO_BIDS") continue;
        const outcome = round(state).outcome!;
        const winnerId = outcome.topBidderIds[Math.floor(random() * outcome.topBidderIds.length)]!;
        state = must(state, "p0", { type: "WINNER_CONFIRM", roundId: r.id, winnerId }, clock.ctx());
        spent += outcome.highestAmount!;
        expect(totalCredits(state.players)).toBe(starting - spent);
        expect(state.players.every((p) => p.credits >= 0 && Number.isInteger(p.credits))).toBe(true);
      }
      if (state.endReason === "COMPLETED") expect(state.rounds).toHaveLength(size);
      expect(totalCredits(state.players)).toBe(starting - spent);
    }
  });
});

describe("createRoom", () => {
  it("starts in the lobby with a revision and expiry", () => {
    const state = createRoom(
      { roomId: "r", code: "0042", startingCredits: 20, host: { id: "h", displayName: " Host ", tokenHash: "x" } },
      { now: 5 },
    );
    expect(state).toMatchObject({ phase: "LOBBY", code: "0042", revision: 1, currentRoundIndex: -1, biddingSeconds: 30 });
    expect(state.players[0]!.displayName).toBe("Host");
    expect(state.expiresAt).toBeGreaterThan(5);
  });
});
