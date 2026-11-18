import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold",
    "transition-[background-color,border-color,color,transform,opacity,filter] duration-150 ease-[var(--ease-out-quart)]",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-[1.15em] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Gold pill: the single primary action on a screen. */
        primary: "gold-pill hover:brightness-105",
        /** Cream pill: a strong secondary action. */
        secondary: "bg-fg text-on-gold hover:bg-gold-bright",
        /** Gold outline on green. */
        outline: "border border-gold/55 bg-surface/60 text-gold hover:border-gold hover:bg-surface",
        danger: "bg-holly text-snow hover:bg-holly-deep",
        /** Vivid green pill for light surfaces (home page). */
        evergreen:
          "bg-evergreen text-snow shadow-[0_12px_28px_-10px_oklch(51%_0.135_150/0.7)] hover:bg-evergreen-deep focus-visible:outline-evergreen-deep",
        "evergreen-outline":
          "border-2 border-evergreen/60 text-evergreen-deep hover:border-evergreen hover:bg-evergreen/8 focus-visible:outline-evergreen-deep",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        link: "h-auto rounded-sm px-0 text-fg-muted underline decoration-line-strong underline-offset-4 hover:text-fg hover:decoration-fg-faint",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-12 px-6 text-base",
        /** Primary actions: never wider than 280px, centred in their column. */
        // `flex` (not inline-flex) so `mx-auto` centres it in block containers too.
        lg: "mx-auto flex h-14 w-full max-w-[280px] px-7 text-[1.0625rem]",
        icon: "size-10",
      },
    },
    compoundVariants: [{ variant: "link", className: "px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            </span>
          ) : null}
        </>
      )}
    </Component>
  );
}

export { buttonVariants };
