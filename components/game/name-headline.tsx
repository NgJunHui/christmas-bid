import type { ReactNode } from "react";

/** Classes for the h1 that wraps NameLines. Long single-word names wrap rather than overflow. */
export const NAME_HEADLINE_CLASS = "font-display font-bold text-gold [overflow-wrap:anywhere]";

const NAME_GLOW = { textShadow: "0 0 36px oklch(85% 0.13 87 / 0.35)" };

/**
 * "Big name, the rest of the sentence smaller underneath", e.g. "junhui / is up next".
 * Used for whose turn it is and who won the bidding. Put it inside an h1 with
 * NAME_HEADLINE_CLASS; screen readers still hear one sentence ("junhui is up next").
 */
export function NameLines({ name, rest }: { name: ReactNode; rest: string }) {
  return (
    <>
      <span className="block text-[clamp(2.75rem,14vw,5rem)] leading-[0.95]" style={NAME_GLOW}>
        {name}
      </span>{" "}
      <span className="mt-2 block text-[1.75rem] leading-tight text-fg sm:text-[2.25rem]">{rest}</span>
    </>
  );
}
