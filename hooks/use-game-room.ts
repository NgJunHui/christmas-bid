"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError, getSession } from "@/lib/client/api";
import type { GameError, PlayerView } from "@/lib/game/types";
import { useRoomConnection, type OutgoingCommand } from "./use-room-connection";

/**
 * Everything a room screen needs: verify the session, hold the live
 * connection, and derive who's who from the latest server snapshot.
 */
export function useGameRoom(code: string) {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSession(code)
      .then((session) => {
        if (cancelled) return;
        if (session) setHasSession(true);
        else router.replace(`/join?code=${code}`);
      })
      .catch((error: unknown) => {
        if (!cancelled) setSessionError(error instanceof ApiError ? error.message : "Couldn't load the room.");
      });
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  const connection = useRoomConnection(code, hasSession);
  const { view, fatal, send } = connection;

  useEffect(() => {
    if (fatal === "unauthorized") router.replace(`/join?code=${code}`);
    if (fatal === "left") router.replace("/");
  }, [fatal, code, router]);

  const derived = useMemo(() => {
    if (!view) return null;
    const playersById = new Map<string, PlayerView>(view.players.map((player) => [player.id, player]));
    const me = playersById.get(view.me.id)!;
    const host = playersById.get(view.room.hostPlayerId)!;
    const round = view.round;
    const pitcher = round ? (playersById.get(round.pitcherId) ?? null) : null;
    return {
      playersById,
      me,
      host,
      round,
      pitcher,
      isHost: view.me.isHost,
      isPitcher: Boolean(round && round.pitcherId === view.me.id),
      nameOf: (id: string) => playersById.get(id)?.displayName ?? "Someone",
    };
  }, [view]);

  /** Send a command; resolve true on success. Server errors become a toast. */
  const act = useCallback(
    async (command: OutgoingCommand, options: { success?: string; quietErrors?: boolean } = {}) => {
      try {
        await send(command);
        if (options.success) toast.success(options.success);
        return true;
      } catch (error) {
        const message = (error as GameError)?.message ?? "That didn't work. Try again.";
        if (!options.quietErrors) toast.error(message);
        return false;
      }
    },
    [send],
  );

  return { ...connection, derived, act, sessionError };
}

export type GameRoom = ReturnType<typeof useGameRoom>;
export type GameDerived = NonNullable<GameRoom["derived"]>;
