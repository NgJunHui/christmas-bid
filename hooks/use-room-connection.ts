"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLOSE_CODES } from "@/lib/game/constants";
import type { ClientMessage, ServerMessage } from "@/lib/game/protocol";
import type { ClientView, GameError, StateCause } from "@/lib/game/types";
import { newRequestId } from "@/lib/utils";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";
export type FatalReason = "unauthorized" | "not_found" | "expired" | "left";

/** A command as the UI sends it; the hook adds the request ID. */
export type OutgoingCommand = ClientMessage extends infer M
  ? M extends { type: "PING" | "STATE_REQUEST" }
    ? never
    : Omit<M, "requestId">
  : never;

interface Pending {
  resolve: (value: { duplicate: boolean }) => void;
  reject: (error: GameError) => void;
  timer: ReturnType<typeof setTimeout>;
}

const COMMAND_TIMEOUT_MS = 8000;
const PING_INTERVAL_MS = 15_000;
const MAX_BACKOFF_MS = 8000;

/**
 * One WebSocket per open room page. Handles reconnection with exponential
 * backoff, server-clock offset (so every phone shows the same countdown),
 * and request/acknowledgement pairing for commands.
 */
export function useRoomConnection(code: string, enabled: boolean) {
  const [view, setView] = useState<ClientView | null>(null);
  const [cause, setCause] = useState<StateCause | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [fatal, setFatal] = useState<FatalReason | null>(null);
  const [clockOffset, setClockOffset] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(new Map<string, Pending>());
  const revisionRef = useRef(0);
  const bestRttRef = useRef(Number.POSITIVE_INFINITY);
  const reconnectNowRef = useRef<() => void>(() => {});

  const rejectAll = useCallback((error: GameError) => {
    for (const [id, pending] of pendingRef.current) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pendingRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const sendRaw = (message: ClientMessage) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    const ping = () => sendRaw({ type: "PING", requestId: newRequestId(), t: Date.now() });

    const handle = (message: ServerMessage) => {
      switch (message.type) {
        case "ROOM_STATE": {
          // Presence-only updates reuse the revision, so accept equal revisions too.
          if (message.view.revision < revisionRef.current) return;
          revisionRef.current = message.view.revision;
          if (bestRttRef.current === Number.POSITIVE_INFINITY) {
            setClockOffset(message.view.serverNow - Date.now());
          }
          setView(message.view);
          setCause(message.cause);
          return;
        }
        case "PONG": {
          const now = Date.now();
          const rtt = now - message.t;
          // Keep the sample with the lowest round trip: its midpoint estimate is the most accurate.
          if (rtt >= 0 && rtt <= bestRttRef.current) {
            bestRttRef.current = rtt;
            setClockOffset(message.serverNow + rtt / 2 - now);
          }
          return;
        }
        case "ACK":
        case "ERROR": {
          if (!message.requestId) return;
          const pending = pendingRef.current.get(message.requestId);
          if (!pending) return;
          clearTimeout(pending.timer);
          pendingRef.current.delete(message.requestId);
          if (message.type === "ACK") pending.resolve({ duplicate: message.duplicate });
          else pending.reject({ code: message.code, message: message.message });
          return;
        }
      }
    };

    const connect = () => {
      if (stopped) return;
      clearTimeout(retryTimer);
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/api/rooms/${code}/ws`);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
        sendRaw({ type: "STATE_REQUEST", requestId: newRequestId() });
        ping();
        setTimeout(ping, 1200);
        clearInterval(pingTimer);
        pingTimer = setInterval(ping, PING_INTERVAL_MS);
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          handle(JSON.parse(event.data) as ServerMessage);
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = (event) => {
        clearInterval(pingTimer);
        if (socketRef.current === socket) socketRef.current = null;
        rejectAll({ code: "OFFLINE", message: "Connection lost. Reconnecting…" });
        if (stopped) return;

        const fatalReason: FatalReason | null =
          event.code === CLOSE_CODES.unauthorized
            ? "unauthorized"
            : event.code === CLOSE_CODES.notFound
              ? "not_found"
              : event.code === CLOSE_CODES.expired
                ? "expired"
                : event.code === CLOSE_CODES.leftRoom
                  ? "left"
                  : null;
        if (fatalReason) {
          setFatal(fatalReason);
          setStatus("closed");
          return;
        }
        setStatus("reconnecting");
        const base = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, base * (0.7 + Math.random() * 0.6));
      };
    };

    // Skip the backoff when the network or tab comes back.
    reconnectNowRef.current = () => {
      const socket = socketRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        attempt = 0;
        connect();
      } else if (socket.readyState === WebSocket.OPEN) {
        sendRaw({ type: "STATE_REQUEST", requestId: newRequestId() });
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") reconnectNowRef.current();
    };
    window.addEventListener("online", reconnectNowRef.current);
    document.addEventListener("visibilitychange", onVisible);

    setStatus("connecting");
    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      window.removeEventListener("online", reconnectNowRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      socketRef.current?.close(1000, "Leaving page");
      socketRef.current = null;
      // Unmounting (navigation, hot reload): drop pending requests quietly; nobody is waiting on them.
      for (const pending of pendingRef.current.values()) clearTimeout(pending.timer);
      pendingRef.current.clear();
    };
  }, [code, enabled, rejectAll]);

  const send = useCallback((command: OutgoingCommand): Promise<{ duplicate: boolean }> => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject<{ duplicate: boolean }>({
        code: "OFFLINE",
        message: "You're offline right now. Reconnecting…",
      } satisfies GameError);
    }
    const requestId = newRequestId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRef.current.delete(requestId);
        reject({ code: "OFFLINE", message: "The game didn't answer. Check your connection." } satisfies GameError);
      }, COMMAND_TIMEOUT_MS);
      pendingRef.current.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ ...command, requestId }));
    });
  }, []);

  return { view, cause, status, fatal, clockOffset, send };
}
