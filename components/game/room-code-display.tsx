"use client";

import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Kahoot-style Game PIN panel: four big gold tiles and one action that copies an
 * invite link with the PIN filled in (no URL on screen).
 *
 * One centred column at every size. The tile row is a container, and the tiles size
 * themselves from its width (cqi units), so they fit a 320px phone (~54px tiles) and
 * still read from across the room on a laptop or TV (~95px tiles, capped).
 */
export function RoomCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const digits = code.split("");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Read the PIN out instead!");
    }
  };

  return (
    <section
      aria-labelledby="game-pin-heading"
      className="card flex w-full max-w-lg flex-col items-center gap-4 rounded-[2.25rem] px-5 py-6 sm:gap-5 sm:px-8 sm:py-7"
    >
      <h2 id="game-pin-heading" className="text-eyebrow font-semibold uppercase text-gold/80">
        Join with Game PIN
      </h2>

      <p className="sr-only">{digits.join(" ")}</p>
      <div className="@container w-full max-w-[26rem]" aria-hidden>
        <div className="grid grid-cols-4 gap-[clamp(0.5rem,3cqi,0.875rem)]">
          {digits.map((digit, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 14, rotate: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="grid aspect-[4/5] place-items-center rounded-[clamp(1rem,6cqi,1.625rem)] border border-gold/50 bg-bg-deep/70 font-display text-[clamp(2.25rem,17cqi,4.25rem)] leading-none text-gold shadow-[0_0_24px_-6px_oklch(85%_0.13_87/0.35)]"
            >
              {digit}
            </motion.span>
          ))}
        </div>
      </div>

      {/* 44px tall so it's an easy thumb target; the toast announces the result to screen readers. */}
      <Button type="button" variant="outline" size="sm" onClick={copyLink} className="h-11 px-5">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Link copied" : "Copy invite link"}
      </Button>
    </section>
  );
}
