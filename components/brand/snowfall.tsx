/**
 * Ambient falling snow behind every screen. Pure CSS (transform-only),
 * positions are deterministic so server and client markup match.
 * Under reduced motion the flakes simply rest in place.
 * Pass a className (e.g. "absolute z-10") to confine it to one box, like the home hero.
 */
import { cn } from "@/lib/utils";

function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * `seed` gives a second layer different flake positions; layers with the same seed would
 * stack exactly on top of each other.
 */
export function Snowfall({ count = 42, seed = 0, className }: { count?: number; seed?: number; className?: string }) {
  const flakes = Array.from({ length: count }, (_, index) => {
    const i = index + seed * 997;
    const size = 3 + rand(i + 1) * 9; // 3–12px, the large ones read as soft bokeh
    const duration = 11 + rand(i + 101) * 14;
    return {
      left: `${(rand(i + 201) * 100).toFixed(2)}%`,
      size,
      duration,
      delay: -rand(i + 301) * duration,
      opacity: 0.18 + rand(i + 401) * 0.5,
      drift: `${((rand(i + 501) - 0.5) * 8).toFixed(2)}vw`,
      rest: `${(rand(i + 601) * 95).toFixed(1)}vh`,
    };
  });

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)} aria-hidden>
      {flakes.map((flake, i) => (
        <span
          key={i}
          className="snowflake"
          style={
            {
              left: flake.left,
              width: flake.size,
              height: flake.size,
              opacity: flake.opacity,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              "--drift": flake.drift,
              "--rest": flake.rest,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
