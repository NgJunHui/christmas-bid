import { Bell, CandyCane, Cookie, Gift, Snowflake, Sparkles, Star, TreePine, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Eight festive tokens, assigned by join order so everyone keeps the same one all game. */
const TOKENS: { Icon: LucideIcon; className: string }[] = [
  { Icon: Gift, className: "bg-gradient-to-b from-gold-bright to-gold-deep text-on-gold" },
  { Icon: TreePine, className: "bg-surface-3 text-gold" },
  { Icon: Snowflake, className: "bg-fg text-bg" },
  { Icon: CandyCane, className: "bg-holly text-snow" },
  { Icon: Star, className: "bg-bg-deep text-gold ring-1 ring-inset ring-gold/40" },
  { Icon: Bell, className: "bg-gold-deep text-on-gold" },
  { Icon: Cookie, className: "bg-[oklch(72%_0.085_62)] text-[oklch(32%_0.05_45)]" },
  { Icon: Sparkles, className: "bg-holly-deep text-gold" },
];

export function Avatar({ seed, size = "md", className }: { seed: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const { Icon, className: tone } = TOKENS[(Math.max(1, seed) - 1) % TOKENS.length]!;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl",
        size === "sm" && "size-9 rounded-xl [&_svg]:size-4",
        size === "md" && "size-11 [&_svg]:size-5",
        size === "lg" && "size-16 rounded-3xl [&_svg]:size-7",
        tone,
        className,
      )}
    >
      <Icon />
    </span>
  );
}
