"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SoldStamp } from "@/components/brand/art";
import { Button } from "@/components/ui/button";
import type { TransferView } from "@/lib/game/types";
import { cn, plural, possessive } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { Avatar } from "./avatar";
import { Confetti } from "./confetti";
import { useGame } from "./game-context";
import { Stage, StageActions, StageBody, WaitingNote } from "./stage";

/** Show the after-balance counting from the before-balance when the win just happened. */
function Balance({ before, after, live }: { before: number; after: number; live: boolean }) {
  const [value, setValue] = useState(live ? before : after);
  return (
    <motion.span
      className="tabular font-bold text-fg"
      onViewportEnter={() => setTimeout(() => setValue(after), 450)}
      viewport={{ once: true }}
    >
      <AnimatedNumber value={value} duration={1.1} />
    </motion.span>
  );
}

function TransferLedger({ transfer, live }: { transfer: TransferView; live: boolean }) {
  const { d } = useGame();
  const rows = [
    { id: transfer.fromPlayerId, before: transfer.fromBefore, after: transfer.fromAfter, delta: -transfer.amount },
    // Only rooms from before "the winner just spends" have a receiving row.
    ...(transfer.toPlayerId && transfer.toBefore !== null && transfer.toAfter !== null
      ? [{ id: transfer.toPlayerId, before: transfer.toBefore, after: transfer.toAfter, delta: transfer.amount }]
      : []),
  ];
  return (
    <ul className="flex w-full max-w-sm flex-col gap-2 text-left" aria-label="Credit transfer">
      {rows.map((row) => {
        const player = d.playersById.get(row.id);
        return (
          <li key={row.id} className="card flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2.5">
            <Avatar seed={player?.paddle ?? 1} />
            <span className="min-w-0 flex-1 truncate font-medium text-fg">{player?.displayName}</span>
            <span className="tabular flex items-center gap-1.5 text-fg-muted">
              {row.before}
              <ArrowRight className="size-3.5 text-gold" aria-label="to" />
              <Balance before={row.before} after={row.after} live={live} />
            </span>
            <span className={cn("tabular w-12 text-right text-sm font-semibold", row.delta < 0 ? "text-ember" : "text-mint")}>
              {row.delta > 0 ? `+${row.delta}` : `−${Math.abs(row.delta)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function WinnerAnnouncement() {
  const { view, d, act, cause } = useGame();
  const [busy, setBusy] = useState(false);
  const round = d.round!;
  const pitcher = d.pitcher!;
  const winnerName = d.nameOf(round.winnerId ?? "");
  const iWon = round.winnerId === view.me.id;
  const live = cause === "WINNER_CONFIRMED";
  const isLast = round.number >= round.totalRounds;

  return (
    <Stage>
      <StageBody className="items-center text-center">
        {live ? <Confetti /> : null}
        <motion.div
          initial={live ? { scale: 1.7, opacity: 0, rotate: -18 } : false}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="drop-shadow-[0_0_24px_oklch(85%_0.13_87/0.35)]"
        >
          <SoldStamp className="h-auto w-36 text-gold sm:w-44" />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="max-w-[16ch] font-display text-headline text-gold sm:text-[3.25rem] sm:leading-none">
            {iWon ? `You won ${possessive(pitcher.displayName)} gift!` : `${winnerName} takes home the gift!`}
          </h1>
          <p className="text-lg text-fg-muted">
            {d.isPitcher ? "Your gift" : `${possessive(pitcher.displayName)} gift`} ·{" "}
            <strong className="tabular font-semibold text-gold">{plural(round.winningAmount ?? 0, "credit")}</strong>
          </p>
        </div>
        {round.transfer ? <TransferLedger transfer={round.transfer} live={live} /> : null}
      </StageBody>

      <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
        {d.isHost ? (
          <Button
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await act({ type: "NEXT_ROUND", roundId: round.id });
              setBusy(false);
            }}
          >
            {isLast ? "Wrap up" : "Next round"}
            <ArrowRight />
          </Button>
        ) : (
          <WaitingNote>{isLast ? "That was the last gift!" : "Ready for the next gift?"}</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
