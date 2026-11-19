"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { GiftStack } from "@/components/brand/art";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-context";
import { Eyebrow, Stage, StageActions, StageBody, WaitingNote } from "./stage";

export function NoBidsState() {
  const { d, act } = useGame();
  const [busy, setBusy] = useState(false);
  const round = d.round!;

  return (
    <Stage>
      <StageBody className="items-center text-center">
        <GiftStack className="h-auto w-36 -rotate-6 opacity-55 grayscale-[0.5]" />
        <div className="flex flex-col items-center gap-2">
          <Eyebrow>No takers yet!</Eyebrow>
          <h1 className="font-display text-headline text-gold">No bids this round!</h1>
        </div>
      </StageBody>
      <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
        {d.isHost ? (
          <Button
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await act({ type: "BIDDING_RESTART", roundId: round.id });
              setBusy(false);
            }}
          >
            <RotateCcw />
            Restart bidding
          </Button>
        ) : (
          <WaitingNote>Waiting for the host to restart bidding.</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
