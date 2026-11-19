"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { leaveRoom } from "@/lib/client/api";
import { useGame } from "./game-context";

/**
 * "Are you sure you want to leave the game?" Leaving is for good:
 * - guest, lobby: gives up the seat (they can join again while the lobby is open)
 * - guest, mid-game: can't come back; their credits stay behind and their turn is skipped
 * - host: closes the room (lobby) or ends the game for everyone
 */
export function LeaveGameDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { code, view, d, act } = useGame();
  const [busy, setBusy] = useState(false);
  const lobby = view.room.phase === "LOBBY";

  const description = d.isHost
    ? lobby
      ? "You're the host, so leaving closes the room for everyone."
      : "You're the host, so leaving ends the game for everyone."
    : lobby
      ? `You'll give up your seat. You can join again with PIN ${code} until the game starts.`
      : "This is for good: you can't rejoin this game, and your credits stay behind.";

  const leave = async () => {
    setBusy(true);
    if (d.isHost) {
      // Everyone (host included) is sent on by the room screen once the game has ended.
      const ok = await act({ type: "GAME_END" });
      setBusy(false);
      if (ok) onOpenChange(false);
      return;
    }
    try {
      await leaveRoom(code);
      toast.success(lobby ? "You left the room." : "You left the game.");
    } catch {
      /* the socket close or a reload will sort it out */
    }
    router.replace("/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Are you sure you want to leave the game?" description={description}>
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="w-full max-w-[280px] sm:w-auto">
              Stay
            </Button>
          </DialogClose>
          <Button variant="danger" className="w-full max-w-[280px] sm:w-auto" loading={busy} onClick={leave}>
            Leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
