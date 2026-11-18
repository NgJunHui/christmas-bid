"use client";

import { motion } from "motion/react";
import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";
import { useGame } from "./game-context";

/** Big, server-synced countdown in gold. Turns holly red in the last 10 seconds. */
export function CountdownTimer({ startedAt, endsAt }: { startedAt: number; endsAt: number }) {
  const { clockOffset } = useGame();
  const remaining = useCountdown(endsAt, clockOffset);
  const total = Math.max(1, endsAt - startedAt);
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining > 0 && seconds <= 10;
  const lastCall = remaining > 0 && seconds <= 5;
  const label = remaining === 0 ? "Time's up!" : lastCall ? "Last chance to bid!" : "Bidding ends in";
  const announce = [20, 10, 5].includes(seconds) ? `${seconds} seconds left` : "";

  return (
    <div className="flex w-full flex-col items-center gap-3 short:gap-2">
      <p className={cn("text-sm font-semibold uppercase tracking-[0.1em]", lastCall ? "text-ember" : "text-fg-muted")}>{label}</p>
      <motion.p
        key={lastCall ? seconds : "steady"}
        role="timer"
        aria-label={`${seconds} seconds left`}
        initial={lastCall ? { scale: 1.08 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "tabular font-sans text-[4.75rem] font-bold leading-none tracking-[-0.04em] transition-colors duration-300 short:text-[3.75rem] sm:text-[7rem] sm:short:text-[4.5rem]",
          urgent ? "text-ember" : "text-gold",
        )}
        style={{ textShadow: urgent ? "0 0 32px oklch(67% 0.17 29 / 0.35)" : "0 0 32px oklch(85% 0.13 87 / 0.25)" }}
      >
        00:{String(seconds).padStart(2, "0")}
      </motion.p>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-100 ease-linear",
            urgent ? "bg-ember" : "bg-gradient-to-r from-gold-deep to-gold",
          )}
          style={{ transform: `scaleX(${remaining / total})` }}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
