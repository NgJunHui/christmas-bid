"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds left until a server deadline, using the measured clock offset
 * so every device counts down to the same instant. Never restarts on refresh,
 * because the deadline comes from the server.
 */
export function useCountdown(endsAt: number | null, clockOffset: number): number {
  const compute = () => (endsAt === null ? 0 : Math.max(0, endsAt - (Date.now() + clockOffset)));
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    if (endsAt === null) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, endsAt - (Date.now() + clockOffset)));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt, clockOffset]);

  return remaining;
}
