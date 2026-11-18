"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RoomGone, RoomLoading } from "@/components/game/room-states";
import { useGameRoom } from "@/hooks/use-game-room";
import { ThankYou } from "./thank-you";

export function ResultsScreen({ code }: { code: string }) {
  const router = useRouter();
  const { view, fatal, sessionError } = useGameRoom(code);
  const phase = view?.room.phase;

  // Results only exist once the game has ended; otherwise go back to the live room.
  useEffect(() => {
    if (phase && phase !== "ENDED") router.replace(`/room/${code}`);
  }, [phase, code, router]);

  if (fatal === "not_found" || fatal === "expired") {
    return <RoomGone title="These results have expired" message="Rooms and their results are kept for a day after the game." />;
  }
  if (sessionError) return <RoomGone title="Couldn't load the results" message={sessionError} />;
  if (!view || phase !== "ENDED") return <RoomLoading label="Wrapping up…" />;
  return <ThankYou />;
}
