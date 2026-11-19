"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { LeaveGameDialog } from "./game-dialogs";

/** A single borderless leave button in the top-right corner. Tapping it asks to confirm. */
export function LeaveGameButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Leave the game"
        className="grid size-11 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface/60 hover:text-fg"
      >
        <LogOut className="size-5" />
      </button>
      <LeaveGameDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
