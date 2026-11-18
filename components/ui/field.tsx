import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gold-outlined pill input, as in the reference "group name" field. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-14 w-full rounded-full border border-gold/50 bg-surface/70 px-6 text-lg text-gold placeholder:text-fg-faint",
        "transition-[border-color,box-shadow,background-color] duration-150",
        "focus:border-gold focus:bg-surface focus:outline-none focus:ring-4 focus:ring-gold/15",
        "aria-[invalid=true]:border-ember aria-[invalid=true]:ring-ember/15",
        className,
      )}
      {...props}
    />
  );
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="pl-1 text-lg font-semibold text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="pl-1 text-sm font-medium text-ember">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-1 text-sm italic text-fg-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
