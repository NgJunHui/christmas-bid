/**
 * The illustrated Santa (the user's hero-img), pre-sized from the 2500px source with sharp
 * into public/hero as AVIF + WebP (vinext has no build-time image pipeline). Largest file is
 * 1200×1107; the intrinsic size is set so the browser reserves space and nothing shifts.
 */
const WIDTHS = [480, 800, 1200];
const srcSet = (ext: "avif" | "webp") => WIDTHS.map((w) => `/hero/santa-${w}.${ext} ${w}w`).join(", ");

export function HeroSanta({
  sizes,
  className,
  priority = false,
  alt = "Santa sitting in the snow beside a sack overflowing with presents",
}: {
  /** How wide the image renders, so the browser picks the right file. */
  sizes: string;
  className?: string;
  /** True when it's the page's main image (largest contentful paint). */
  priority?: boolean;
  alt?: string;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <img
        src="/hero/santa-800.webp"
        srcSet={srcSet("webp")}
        sizes={sizes}
        width={1200}
        height={1107}
        alt={alt}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
