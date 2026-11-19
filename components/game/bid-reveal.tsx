"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RevealedBid } from "@/lib/game/types";
import { cn, listNames, plural } from "@/lib/utils";
import { useGame } from "./game-context";
import { NAME_HEADLINE_CLASS, NameLines } from "./name-headline";
import { Eyebrow, Stage, StageActions, StageBody, WaitingNote } from "./stage";

const STAGGER = 0.11;

function BidRow({
  bid,
  index,
  total,
  isTop,
  selectable,
  selected,
}: {
  bid: RevealedBid;
  index: number;
  total: number;
  isTop: boolean;
  selectable: boolean;
  selected: boolean;
}) {
  const { d, view } = useGame();
  const player = d.playersById.get(bid.playerId);
  // Reveal from the lowest bid up, so the top bid lands last.
  const delay = (total - 1 - index) * STAGGER;
  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-left">
        <span className="truncate font-medium text-fg">{player?.displayName ?? "Someone"}</span>
        {bid.playerId === view.me.id ? <span className="text-sm text-fg-faint">(you)</span> : null}
      </span>
      <span className={cn("tabular text-xl font-bold", isTop ? "text-gold" : "text-fg-muted")}>
        {bid.amount}
        <span className="ml-1.5 text-sm font-medium text-fg-faint">{bid.amount === 1 ? "credit" : "credits"}</span>
      </span>
      {selectable ? (
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full border-2 transition-colors",
            selected ? "border-gold bg-gold text-on-gold" : "border-line-strong",
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      ) : null}
    </>
  );

  const motionProps = {
    initial: { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { delay, duration: 0.36, ease: [0.16, 1, 0.3, 1] as const },
  };
  const rowClass = cn(
    "card flex min-h-14 w-full items-center gap-3 rounded-2xl px-5 py-2.5",
    isTop && "border border-gold/55 bg-[linear-gradient(90deg,oklch(85%_0.13_87/0.14),oklch(85%_0.13_87/0.04))]",
    selectable && "cursor-pointer transition-[border-color,background-color] hover:border-gold",
    selected && "border-gold ring-2 ring-gold/40",
  );

  if (selectable) {
    return (
      <motion.li {...motionProps}>
        <RadioGroup.Item value={bid.playerId} className={rowClass}>
          {content}
        </RadioGroup.Item>
      </motion.li>
    );
  }
  return (
    <motion.li {...motionProps} className={rowClass}>
      {content}
    </motion.li>
  );
}

export function BidReveal() {
  const { view, d, act } = useGame();
  const round = d.round!;
  const reveal = round.reveal!;
  const tie = reveal.kind === "TIE";
  const topNames = reveal.topBidderIds.map(d.nameOf);
  const amount = reveal.highestAmount ?? 0;
  const [choice, setChoice] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const winnerId = tie ? choice : reveal.topBidderIds[0]!;
  const hostPicks = tie && d.isHost;
  // Everyone has pitched once this round is done.
  const isLast = round.number >= round.totalRounds;
  const noBid = view.players.filter(
    (p) => !p.hasLeft && p.id !== round.pitcherId && !reveal.bids.some((b) => b.playerId === p.id),
  );
  const listDelay = reveal.bids.length * STAGGER;

  const confirm = async () => {
    if (!winnerId) return;
    setBusy(true);
    await act({ type: "WINNER_CONFIRM", roundId: round.id, winnerId });
    setBusy(false);
  };

  const list = (
    <ol className="flex flex-col gap-2">
      {reveal.bids.map((bid, index) => (
        <BidRow
          key={bid.playerId}
          bid={bid}
          index={index}
          total={reveal.bids.length}
          isTop={reveal.topBidderIds.includes(bid.playerId)}
          selectable={hostPicks && reveal.topBidderIds.includes(bid.playerId)}
          selected={choice === bid.playerId}
        />
      ))}
    </ol>
  );

  return (
    <Stage>
      <StageBody className="gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Eyebrow>The bids are in!</Eyebrow>
          {/* The big moment: pops in once the last bid has landed. Fluid size, and long names wrap rather than overflow. */}
          <motion.h1
            className={NAME_HEADLINE_CLASS}
            initial={{ opacity: 0, scale: 0.82, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: listDelay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {tie ? (
              <span className="block text-[clamp(2.75rem,13vw,4.5rem)] leading-none">It's a tie!</span>
            ) : (
              <NameLines name={topNames[0]} rest="has the highest bid!" />
            )}
          </motion.h1>
          {tie ? (
            <motion.p
              className="max-w-[34ch] text-lg text-fg-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: listDelay + 0.1, duration: 0.3 }}
            >
              {`${listNames(topNames)} ${topNames.length === 2 ? "both" : "all"} bid ${plural(amount, "credit")}. Time for a tiebreaker!`}
            </motion.p>
          ) : null}
        </div>

        <section className="flex w-full flex-col gap-3" aria-labelledby="reveal-players-heading">
          {/* Same small gold heading as the lobby's player count. */}
          <h2 id="reveal-players-heading" className="text-center text-eyebrow font-semibold uppercase text-gold/80">
            Players
          </h2>
          {hostPicks ? (
            <RadioGroup.Root value={choice} onValueChange={setChoice} aria-label="Choose the tiebreaker winner">
              <p className="mb-3 text-center text-sm font-medium text-fg">Choose the tiebreaker winner</p>
              {list}
            </RadioGroup.Root>
          ) : (
            list
          )}
          {noBid.length > 0 ? (
            <p className="text-center text-sm text-fg-muted">
              <span className="font-semibold text-fg">No bid:</span> {listNames(noBid.map((p) => p.displayName))}
            </p>
          ) : null}
        </section>
      </StageBody>

      <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
        {d.isHost ? (
          <>
            {/* Confirms the winner (credits move now) and goes straight to drawing the next pitcher. On the last gift it ends the game. */}
            <Button size="lg" onClick={confirm} loading={busy} disabled={!winnerId}>
              {isLast ? "End game" : "Next bid"}
            </Button>
            {tie && !choice ? (
              <p className="text-center text-sm text-fg-muted">Play a quick tiebreaker in real life, then pick who won.</p>
            ) : null}
          </>
        ) : (
          <WaitingNote>{tie ? "The host will pick the tiebreaker winner." : "Waiting for the host to confirm."}</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
