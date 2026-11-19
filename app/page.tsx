import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo, Sparkle } from "@/components/brand/art";
import { HeroSanta } from "@/components/brand/hero-santa";
import { Snowfall } from "@/components/brand/snowfall";
import { Button } from "@/components/ui/button";

/** How wide Santa renders (matches the wrapper's width below). */
const SANTA_SIZES = "min(80vw, 22rem)";

/**
 * Welcome: one centred column at every screen size, on the same night-forest green as the
 * rest of the game. Bidmas wordmark centred at the top like a nav bar; Santa, the headline,
 * then the one gold action and a quiet link.
 */
export default function WelcomePage() {
  return (
    <>
      {/* Extra snow just for the welcome screen, on top of the layout's own (different seed so flakes don't overlap). */}
      <Snowfall count={44} seed={1} />

      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* Same top nav row as every other page: Bidmas centred on a 44px row. */}
        <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex h-11 items-center justify-center">
            <Logo />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 text-center short:gap-5">
          <div className="relative w-[min(80vw,22rem)] short:w-[min(60vw,15rem)]">
            {/* Soft gold spotlight, like the thank-you page and the pitch screen's gift. */}
            <div
              aria-hidden
              className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,oklch(85%_0.13_87/0.26)_0%,oklch(85%_0.13_87/0.07)_45%,transparent_70%)]"
            />
            <Sparkle className="absolute -left-3 top-6 size-6" />
            <Sparkle className="absolute -right-2 top-1/4 size-4" />
            <HeroSanta
              sizes={SANTA_SIZES}
              priority
              className="relative h-auto w-full origin-bottom motion-safe:animate-[santa-settle_700ms_var(--ease-out-expo)_both]"
            />
          </div>

          <h1 className="max-w-[16ch] text-balance font-display text-[2.25rem] font-bold leading-[1.05] text-fg short:text-[2rem] sm:text-[3rem]">
            Unwrap the Magic of Christmas!
          </h1>

          <div className="flex w-full flex-col items-center gap-3">
            <Button asChild size="lg">
              <Link href="/join">
                Join a room <ArrowRight />
              </Link>
            </Button>
            {/* Secondary action as a plain text link; min-h-11 keeps a 44px thumb target. */}
            <Link
              href="/create"
              className="inline-flex min-h-11 items-center rounded-sm px-4 font-semibold text-fg-muted underline decoration-line-strong decoration-2 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg-faint"
            >
              Create a room
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
