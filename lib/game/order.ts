/**
 * Fisher–Yates shuffle. `random` must return a float in [0, 1); the server
 * passes a crypto-backed source so the pitching order can't be predicted.
 */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Uniform float in [0, 1) from the Web Crypto API (Workers and Node 20+). */
export function cryptoRandom(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]! / 0x1_0000_0000;
}
