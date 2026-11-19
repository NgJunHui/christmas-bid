import { cn } from "@/lib/utils";

const BAUBLES = ["var(--color-holly)", "var(--color-gold)", "var(--color-mint)"];

/**
 * Three baubles bobbing in turn: a small, festive "waiting" indicator. Rests still under reduced motion.
 * `size="lg"` is the full-screen loading state; the default fits inline next to text.
 */
export function XmasLoader({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const large = size === "lg";
  return (
    <span aria-hidden className={cn("inline-flex items-end", large ? "gap-3" : "gap-1.5", className)}>
      {BAUBLES.map((color, i) => (
        <svg
          key={color}
          viewBox="0 0 12 17"
          className={cn("origin-top animate-bob", large ? "h-9 w-6" : "h-[1.125rem] w-3")}
          style={{ animationDelay: `${i * 0.16}s` }}
        >
          <rect x="4" y="0" width="4" height="3.5" rx="1" fill="var(--color-snow-shade)" />
          <circle cx="6" cy="10.5" r="5.5" fill={color} />
          <circle cx="4.3" cy="8.6" r="1.4" fill="var(--color-snow)" opacity="0.7" />
        </svg>
      ))}
    </span>
  );
}
