"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { useGame } from "./game-context";
import { PlayerList } from "./player-list";

export function EndGameDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { act } = useGame();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="End this Christmas game?"
        description="This will close the bidding and show everyone's final credits. Any unconfirmed bids are cancelled."
      >
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="w-full max-w-[280px] sm:w-auto">Keep playing</Button>
          </DialogClose>
          <Button
            variant="danger"
            className="w-full max-w-[280px] sm:w-auto"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await act({ type: "GAME_END" });
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            End game
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CloseRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { act } = useGame();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Close this room?" description="Everyone in the lobby will be sent back to the start.">
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="w-full max-w-[280px] sm:w-auto">Stay</Button>
          </DialogClose>
          <Button
            variant="danger"
            className="w-full max-w-[280px] sm:w-auto"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await act({ type: "GAME_END" });
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Close room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PlayersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { view, d } = useGame();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Players (${view.players.length})`} description="Balances update after each confirmed win.">
        <PlayerList players={view.players} meId={view.me.id} pitcherId={d.round?.pitcherId} mode="ledger" />
      </DialogContent>
    </Dialog>
  );
}
