"use client";

import { Hourglass, WifiOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GiftStack, Sparkle } from "@/components/brand/art";
import { Button } from "@/components/ui/button";
import { CreditPill } from "./credit-pill";
import { useGame } from "./game-context";
import { Eyebrow, Stage, StageActions, StageBody, WaitingNote } from "./stage";

/** Spin briefly before revealing the pitcher, only when the round has just been drawn. */
function useDrawSpin(pitcherId: string, active: boolean): boolean {
  const reduce = useReducedMotion();
  const [settled, setSettled] = useState(!active || Boolean(reduce));

  useEffect(() => {
    if (!active || reduce) {
      setSettled(true);
      return;
    }
    setSettled(false);
    const stop = setTimeout(() => setSettled(true), 950);
    return () => clearTimeout(stop);
  }, [pitcherId, active, reduce]);

  return settled;
}

export function PitchAnnouncement() {
  const { view, d, act, cause } = useGame();
  const [starting, setStarting] = useState(false);
  const round = d.round!;
  const pitcher = d.pitcher!;
  const justDrawn = cause === "GAME_STARTED" || cause === "ROUND_CHANGED";
  const settled = useDrawSpin(pitcher.id, justDrawn);
  const headline = d.isPitcher ? `You're up, ${pitcher.displayName}!` : `${pitcher.displayName} turn`;

  return (
    <Stage>
      <StageBody className="items-center text-center">
        <Eyebrow>
          Round {round.number} of {round.totalRounds}
        </Eyebrow>

        <div className="relative grid size-48 place-items-center sm:size-60">
          <motion.div
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(85%_0.13_87/0.32)_0%,oklch(85%_0.13_87/0.08)_45%,transparent_70%)]"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: settled ? 1 : 0.8, opacity: settled ? 1 : 0.6 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          />
          <Sparkle className="absolute right-3 top-6 size-5" />
          <Sparkle className="absolute bottom-12 left-1 size-3.5" />
          <motion.div
            initial={{ y: 14, rotate: -5, opacity: 0 }}
            animate={{ y: 0, rotate: settled ? 0 : -5, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <GiftStack className="h-auto w-40 sm:w-48" />
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {d.isPitcher ? null : <CreditPill credits={view.me.credits} />}
          <h1 className="max-w-[16ch] font-display text-headline text-gold sm:text-[3.25rem] sm:leading-none">
            {settled ? (
              <span aria-hidden>{headline}</span>
            ) : (
              // Spinning while the pitcher is drawn; one line tall so nothing jumps when the name lands.
              <span aria-hidden className="inline-grid h-[1.04em] place-items-center align-middle sm:h-[1em]">
                <span className="block size-[0.8em] animate-spin rounded-full border-[0.11em] border-gold/25 border-t-gold" />
              </span>
            )}
            <span className="sr-only">{settled ? headline : "Drawing the next gift…"}</span>
          </h1>
          {d.isPitcher ? (
            <p className="max-w-[36ch] text-lg text-fg-muted">It's time to convince everyone your gift is worth their credits.</p>
          ) : null}
          {!pitcher.isConnected ? (
            <p className="card flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gold">
              <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {pitcher.displayName} looks offline.{" "}
                {d.isHost ? "Wait for them to reconnect, or end the game from the menu." : "Hang tight."}
              </span>
            </p>
          ) : null}
        </div>
      </StageBody>

      <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
        {d.isHost ? (
          <>
            <Button
              size="lg"
              loading={starting}
              disabled={!settled}
              onClick={async () => {
                setStarting(true);
                await act({ type: "BIDDING_START", roundId: round.id });
                setStarting(false);
              }}
            >
              <Hourglass />
              Start bidding
            </Button>
            {d.isPitcher ? (
              <p className="text-center text-sm text-fg-muted">You can't bid on your own gift, but you run the clock.</p>
            ) : null}
          </>
        ) : (
          <WaitingNote>Waiting for the bidding to begin.</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
