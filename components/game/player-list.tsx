"use client";

import { AnimatePresence, motion } from "motion/react";
import type { PlayerView } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { Avatar } from "./avatar";
import { PresenceDot } from "./connection-status";

export function Tag({ children, tone = "plain" }: { children: string; tone?: "plain" | "gold" | "red" | "faint" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
        tone === "plain" && "bg-surface-3 text-fg-muted",
        tone === "gold" && "bg-gold/15 text-gold",
        tone === "red" && "bg-holly/30 text-ember",
        tone === "faint" && "bg-bg-deep/60 text-fg-faint",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Everyone in the room, one rounded card per person. In the lobby it shows
 * who has arrived; during the game it doubles as the ledger of balances.
 */
export function PlayerList({
  players,
  meId,
  pitcherId,
  mode,
  className,
}: {
  players: PlayerView[];
  meId: string;
  pitcherId?: string | null;
  mode: "lobby" | "ledger";
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      <AnimatePresence initial={false}>
        {players.map((player) => {
          const isPitcher = player.id === pitcherId;
          return (
            <motion.li
              key={player.id}
              layout="position"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -12, transition: { duration: 0.16 } }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "card flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2.5",
                isPitcher && mode === "ledger" && "border border-gold/50",
              )}
            >
              <Avatar seed={player.paddle} className={cn(!player.isConnected && "opacity-50")} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn("truncate font-medium", player.isConnected ? "text-fg" : "text-fg-faint")}>
                  {player.displayName}
                </span>
                {player.id === meId ? <Tag>You</Tag> : null}
                {player.isHost ? <Tag tone="gold">Host</Tag> : null}
                {mode === "ledger" && isPitcher ? <Tag tone="red">Pitching</Tag> : null}
                {mode === "ledger" && player.hasPitched && !isPitcher ? <Tag tone="faint">Pitched</Tag> : null}
              </div>
              <PresenceDot online={player.isConnected} />
              <span className="tabular w-16 text-right font-semibold text-gold">
                <AnimatedNumber value={player.credits} />
                <span className="ml-1 text-sm font-medium text-fg-faint">cr</span>
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
