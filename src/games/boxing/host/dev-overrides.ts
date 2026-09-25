/** Browser tests can shorten the rounds, in development builds only. */
export function testRoundMs(): number | undefined {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return undefined;
  const ms = (window as unknown as { __boxingRoundMs?: number }).__boxingRoundMs;
  return typeof ms === "number" && ms > 0 ? ms : undefined;
}
