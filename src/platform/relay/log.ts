/**
 * Logs a relay failure by its message alone. Redis errors carry the failed
 * command and its arguments, and for a room write those include the host
 * and seat tokens, which must never end up in a log.
 */
export function logFailure(what: string, error: unknown): void {
  console.error(what, error instanceof Error ? error.message : String(error));
}
