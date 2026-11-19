"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Logo, Sparkle } from "@/components/brand/art";
import { HeroSanta } from "@/components/brand/hero-santa";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";

/** The end of the night: no stats, just a warm thank-you. */
export function ThankYou() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-7 overflow-x-clip px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24 text-center">
      {/* Same top nav as every other page: Bidmas centred on a 44px row. */}
      <header className="absolute inset-x-0 top-0 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex h-11 items-center justify-center">
          <Logo />
        </div>
      </header>
      <Confetti pieces={40} />
      <motion.div
        className="relative w-64 sm:w-80"
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Soft gold spotlight behind Santa, like the gift on the pitch screen. */}
        <div
          aria-hidden
          className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,oklch(85%_0.13_87/0.28)_0%,oklch(85%_0.13_87/0.07)_45%,transparent_70%)]"
        />
        <Sparkle className="absolute -left-5 top-4 size-7" />
        <Sparkle className="absolute -right-3 top-1/4 size-5" />
        <HeroSanta sizes="(min-width: 640px) 20rem, 16rem" priority className="relative h-auto w-full" />
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
