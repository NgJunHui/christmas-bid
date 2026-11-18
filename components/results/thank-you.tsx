"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { SantaBust, Sparkle } from "@/components/brand/art";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";

/** The end of the night: no stats, just a warm thank-you. */
export function ThankYou() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-7 overflow-x-clip px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 text-center">
      <Confetti pieces={40} />
      <motion.div
        className="relative w-56 sm:w-72"
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Sparkle className="absolute -left-4 top-6 size-7" />
        <Sparkle className="absolute -right-2 top-1/3 size-5" />
        <SantaBust className="h-auto w-full" />
      </motion.div>
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-[3.75rem] font-bold leading-none text-gold sm:text-[5rem]">Thank you!</h1>
        <p className="text-lg text-fg-muted">Merry Christmas, and enjoy your new gift.</p>
      </motion.div>
      <Button asChild size="lg">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
