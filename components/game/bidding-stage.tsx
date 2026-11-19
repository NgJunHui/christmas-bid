"use client";

import { Gift, TimerOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import type { RoundView } from "@/lib/game/types";
import { possessive } from "@/lib/utils";
import { BidInput, BidSubmit, useBidDraft } from "./bid-controls";
import { CountdownTimer } from "./countdown-timer";
import { useGame } from "./game-context";
import { Eyebrow, Stage, StageActions, StageBody } from "./stage";

/**
 * Host-only: close bidding now instead of waiting out the countdown.
 * Borderless secondary button. The first tap arms it for 3s ("Tap again…"), so a
 * stray thumb next to "Place bid" can't end the round for everyone.
 */
function EndBiddingButton({ round, disabled }: { round: RoundView; disabled: boolean }) {
  const { act } = useGame();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const reset = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(reset);
  }, [armed]);

  return (
    <Button
      variant="ghost"
      className="mx-auto w-full max-w-[280px]"
      loading={busy}
      disabled={disabled}
      onClick={async () => {
        if (!armed) return setArmed(true);
        setBusy(true);
        await act({ type: "BIDDING_END", roundId: round.id, attemptId: round.attemptId });
        setBusy(false);
        setArmed(false);
      }}
    >
      <TimerOff />
      {armed ? "Tap again to end bidding" : "End bid"}
    </Button>
  );
}

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
          <h1 className="font-display text-title text-gold sm:text-[2rem]">
            {d.isPitcher ? "Your gift" : `${possessive(pitcher.displayName)} gift`}
          </h1>
        </div>

        <CountdownTimer startedAt={round.timerStartedAt!} endsAt={round.timerEndsAt!} />

        {closed ? (
          <p className="text-center text-sm text-fg-muted" role="status">
            Counting the bids…
          </p>
        ) : null}

        {d.isPitcher ? (
          <div className="card flex flex-col items-center gap-2 rounded-[2rem] px-6 py-6 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Gift className="size-5" aria-hidden />
            </span>
            <p className="font-display text-title text-gold">Your gift is up for bidding!</p>
          </div>
        ) : credits <= 0 ? (
          <div className="card rounded-[2rem] px-6 py-6 text-center">
            {/* Credits are only ever spent (pitching doesn't pay), so there's no "earn some back". */}
            <p className="font-semibold text-fg">You've spent all your credits, so you can't bid this round.</p>
          </div>
        ) : (
          <BidInput draft={draft} />
        )}
      </StageBody>

      {canBid || d.isHost ? (
        <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
          {canBid ? <BidSubmit draft={draft} /> : null}
          {d.isHost ? <EndBiddingButton round={round} disabled={closed} /> : null}
        </StageActions>
      ) : null}
    </Stage>
  );
}
