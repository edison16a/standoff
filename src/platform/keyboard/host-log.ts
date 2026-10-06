import type { Payload } from "@/platform/protocol";

/**
 * The newest message of each kind the host sent the keyboard seat, so a
 * binding can tell where its phone is (the lobby, a match, the results)
 * without keeping a copy of the game's phone state.
 */
export class HostLog {
  private readonly byKind = new Map<string, Payload>();
  private newest: Payload | null = null;

  record(payload: Payload): void {
    this.byKind.set(payload.kind, payload);
    this.newest = payload;
  }

  /** The newest of this kind, or of any kind without one. */
  last(kind?: string): Payload | null {
    if (kind === undefined) return this.newest;
    return this.byKind.get(kind) ?? null;
  }
}
