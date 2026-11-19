"use client";

import { Hourglass, WifiOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GiftStack, Sparkle } from "@/components/brand/art";
import { Button } from "@/components/ui/button";
import { CreditPill } from "./credit-pill";
import { useGame } from "./game-context";
import { NAME_HEADLINE_CLASS, NameLines } from "./name-headline";
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
  const rest = d.isPitcher ? "you're up!" : "is up next";

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
          <h1 className={NAME_HEADLINE_CLASS}>
            {settled ? (
              <NameLines name={pitcher.displayName} rest={rest} />
            ) : (
              <>
                {/* Spinner in the name's place while the pitcher is drawn; the line below keeps its
                    space (hidden, so it can't give the draw away) so nothing jumps when the name lands. */}
                <span aria-hidden>
                  <NameLines
                    name={<span className="inline-block size-[0.8em] animate-spin rounded-full border-[0.1em] border-gold/25 border-t-gold align-middle" />}
                    rest={rest}
                    restHidden
                  />
                </span>
                <span className="sr-only">Drawing the next gift…</span>
              </>
            )}
          </h1>
          {!pitcher.isConnected ? (
            <p className="card flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gold">
              <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {pitcher.displayName} looks offline.{" "}
                {d.isHost ? "Wait for them to reconnect, or end the game from the leave button (top right)." : "Hang tight."}
              </span>
            </p>
          ) : null}
        </div>
      </StageBody>

      <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
        {d.isHost ? (
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
        ) : (
          <WaitingNote>Waiting for the bidding to begin.</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
