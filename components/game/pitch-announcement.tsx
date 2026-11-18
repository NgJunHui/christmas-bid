"use client";

import { Hourglass, WifiOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GiftStack, Sparkle } from "@/components/brand/art";
import { Button } from "@/components/ui/button";
import { CreditPill } from "./credit-pill";
import { useGame } from "./game-context";
import { Eyebrow, Stage, StageActions, StageBody, WaitingNote } from "./stage";

/** Flick through names before landing on the pitcher, only when the round has just been drawn. */
function useNameShuffle(names: string[], final: string, active: boolean): { name: string; settled: boolean } {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ name: final, settled: !active || Boolean(reduce) || names.length < 2 });

  useEffect(() => {
    if (!active || reduce || names.length < 2) {
      setState({ name: final, settled: true });
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setState({ name: names[(i * 7 + 3) % names.length]!, settled: false });
    }, 75);
    const stop = setTimeout(() => {
      clearInterval(id);
      setState({ name: final, settled: true });
    }, 950);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
    // Run once per round; `names` identity changes with every snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [final, active, reduce]);

  return state;
}

export function PitchAnnouncement() {
  const { view, d, act, cause } = useGame();
  const [starting, setStarting] = useState(false);
  const round = d.round!;
  const pitcher = d.pitcher!;
  const justDrawn = cause === "GAME_STARTED" || cause === "ROUND_CHANGED";
  const { name, settled } = useNameShuffle(
    view.players.map((p) => p.displayName),
    pitcher.displayName,
    justDrawn,
  );

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
          <h1 className="max-w-[16ch] font-display text-headline text-gold sm:text-[3.25rem] sm:leading-none">
            <span aria-hidden className={settled ? undefined : "text-fg-faint"}>
              {d.isPitcher ? `You're up, ${name}!` : `${name} is pitching their gift!`}
            </span>
            <span className="sr-only">
              {d.isPitcher ? `You're up, ${pitcher.displayName}!` : `${pitcher.displayName} is pitching their gift!`}
            </span>
          </h1>
          {d.isPitcher ? (
            <p className="max-w-[36ch] text-lg text-fg-muted">It's time to convince everyone your gift is worth their credits.</p>
          ) : (
            <CreditPill credits={view.me.credits} />
          )}
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
            <p className="text-center text-sm text-fg-muted">
              {d.isPitcher
                ? "You can't bid on your own gift, but you run the clock."
                : `Everyone gets ${view.room.biddingSeconds} seconds to bid in secret.`}
            </p>
          </>
        ) : (
          <WaitingNote>Waiting for the bidding to begin.</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
