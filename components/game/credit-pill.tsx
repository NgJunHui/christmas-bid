"use client";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

/**
 * Credits I can spend right now. Provisional bids never reduce this number.
 *
 * Hierarchy: the number is the information (tabular bold gold, one step up); the word
 * "credits" is a quiet unit label (smaller, medium weight, muted). A soft gold-tinted
 * chip with no border or coin, same family as the Host and "Your bid" tags, so it sits
 * under the big name heading without competing with it.
 */
export function CreditPill({ credits, className }: { credits: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5 rounded-full bg-gold/12 px-4 py-2 leading-none", className)}
      title="Your available credits"
    >
      <AnimatedNumber value={credits} className="tabular text-xl font-bold text-gold" />
      <span className="text-sm font-medium text-fg-muted">{credits === 1 ? "credit" : "credits"}</span>
    </span>
  );
}
