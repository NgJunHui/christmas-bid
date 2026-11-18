"use client";

import { Gift } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { plural, possessive } from "@/lib/utils";
import { BidInput, BidSubmit, useBidDraft } from "./bid-controls";
import { CountdownTimer } from "./countdown-timer";
import { useGame } from "./game-context";
import { Eyebrow, Stage, StageActions, StageBody } from "./stage";

export function BiddingStage() {
  const { view, d, clockOffset } = useGame();
  const round = d.round!;
  const pitcher = d.pitcher!;
  const remaining = useCountdown(round.timerEndsAt, clockOffset);
  // Past the deadline on this device: lock the controls while the server closes the round.
  const closed = remaining === 0;
  const credits = view.me.credits;
  const draft = useBidDraft(round, credits, view.me.myBid, closed);
  const canBid = !d.isPitcher && credits > 0;

  return (
    <Stage>
      <StageBody className="gap-5 py-5 short:gap-3 short:py-1 sm:gap-7">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <Eyebrow>{round.attemptNumber > 1 ? "Second chance" : `Round ${round.number} of ${round.totalRounds}`}</Eyebrow>
          <h1 className="font-display text-title text-gold sm:text-headline">
            {d.isPitcher ? "Your gift" : `${possessive(pitcher.displayName)} gift`}
          </h1>
        </div>

        <CountdownTimer startedAt={round.timerStartedAt!} endsAt={round.timerEndsAt!} />

        <p className="text-center text-sm text-fg-muted" aria-live="polite">
          {closed ? "Counting the bids…" : round.bidCount ? `${plural(round.bidCount, "bid")} in so far` : "No bids yet"}
        </p>

        {d.isPitcher ? (
          <div className="card flex flex-col items-center gap-2 rounded-[2rem] px-6 py-6 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Gift className="size-5" aria-hidden />
            </span>
            <p className="font-display text-title text-gold">Your gift is up for bidding!</p>
            <p className="max-w-[32ch] text-fg-muted">You'll receive the winning credits once the host confirms the winner.</p>
          </div>
        ) : credits <= 0 ? (
          <div className="card rounded-[2rem] px-6 py-6 text-center">
            <p className="font-semibold text-fg">You have no credits available to bid this round.</p>
            <p className="mt-1 text-fg-muted">Pitch your gift to earn some back.</p>
          </div>
        ) : (
          <BidInput draft={draft} />
        )}
      </StageBody>

      {canBid ? (
        <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
          <BidSubmit draft={draft} />
        </StageActions>
      ) : null}
    </Stage>
  );
}
