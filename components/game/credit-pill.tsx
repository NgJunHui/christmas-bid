"use client";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

/** Credits I can spend right now. Provisional bids never reduce this number. */
export function CreditPill({ credits, className }: { credits: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-gold/45 bg-surface/80 px-4 font-semibold text-gold",
        className,
      )}
      title="Your available credits"
    >
      <span
        className="size-3.5 rounded-full bg-gradient-to-b from-gold-bright to-gold-deep shadow-[0_0_10px_oklch(85%_0.13_87/0.6)]"
        aria-hidden
      />
      <AnimatedNumber value={credits} className="tabular text-lg" />
      <span>credits</span>
    </span>
  );
}
