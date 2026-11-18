"use client";

import { Ellipsis, Flag, LogOut, Users, X } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { leaveRoom } from "@/lib/client/api";
import { cn, plural } from "@/lib/utils";
import { CloseRoomDialog, EndGameDialog, PlayersDialog } from "./game-dialogs";
import { useGame } from "./game-context";

function MenuItem({
  children,
  onSelect,
  tone = "default",
  className,
}: {
  children: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex h-11 cursor-pointer select-none items-center gap-3 rounded-2xl px-3 text-[0.9375rem] font-medium outline-none",
        "data-[highlighted]:bg-surface-3 [&_svg]:size-4.5",
        tone === "danger" ? "text-ember" : "text-fg",
        className,
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

/** A single floating button in the corner: no nav bar, just what you need when you need it. */
export function RoomMenu() {
  const router = useRouter();
  const { code, view, d } = useGame();
  const [dialog, setDialog] = useState<"end" | "close" | "players" | null>(null);
  const phase = view.room.phase;
  const inGame = phase !== "LOBBY" && phase !== "ENDED";

  const leave = async () => {
    if (phase === "LOBBY") {
      try {
        await leaveRoom(code);
        toast.success("You left the room.");
      } catch {
        /* the socket close or a reload will sort it out */
      }
      router.replace("/");
      return;
    }
    toast(`Your seat is saved. Rejoin any time with PIN ${code}.`);
    router.push("/");
  };

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          className="card grid size-11 place-items-center rounded-full text-fg-muted transition-colors hover:text-fg data-[state=open]:text-gold"
          aria-label="Room menu"
        >
          <Ellipsis className="size-5" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-40 min-w-60 rounded-3xl border border-line bg-surface-2 p-1.5 shadow-[0_16px_40px_-12px_oklch(15%_0.03_166/0.8)] data-[state=open]:animate-fade-in"
          >
            <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.1em] text-fg-faint">
              Game PIN <span className="tabular tracking-[0.14em] text-gold">{code}</span>
            </DropdownMenu.Label>
            <MenuItem onSelect={() => setDialog("players")} className="lg:hidden">
              <Users /> Players · {plural(view.players.length, "person", "people")}
            </MenuItem>
            {d.isHost && inGame ? (
              <MenuItem tone="danger" onSelect={() => setDialog("end")}>
                <Flag /> End game…
              </MenuItem>
            ) : null}
            {d.isHost && phase === "LOBBY" ? (
              <MenuItem tone="danger" onSelect={() => setDialog("close")}>
                <X /> Close room…
              </MenuItem>
            ) : null}
            {!d.isHost || inGame ? (
              <MenuItem onSelect={leave}>
                <LogOut /> {phase === "LOBBY" ? "Leave room" : "Leave for now"}
              </MenuItem>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <EndGameDialog open={dialog === "end"} onOpenChange={(open) => setDialog(open ? "end" : null)} />
      <CloseRoomDialog open={dialog === "close"} onOpenChange={(open) => setDialog(open ? "close" : null)} />
      <PlayersDialog open={dialog === "players"} onOpenChange={(open) => setDialog(open ? "players" : null)} />
    </>
  );
}
