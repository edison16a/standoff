import { definitive, type ProbeOutcome } from "@/platform/net/room-probe";

/** How often a lobby is checked, and how often once it has passed for a while. */
export const LOBBY_EVERY_MS = 20_000;
export const SETTLED_EVERY_MS = 60_000;
export const SETTLED_AFTER_MS = 5 * 60_000;
/** A check that failed for a reason that may pass is tried again this soon. */
export const RECHECK_MS = 2000;


export interface WatchdogDeps {
  probe(code: string): Promise<ProbeOutcome>;
  /** The check passed, or a phone joined, which proves the same. */
  passed(code: string): void;
  broken(code: string, reason: string): void;
  phonesConnected(): number;
  /** Playing, the code hidden, or the tab in the background: checks wait. */
  paused(): boolean;
  online(): boolean;
  /** Every server instance sees the same rooms, so "not found" is final. */
  shared(): boolean;
  now(): number;
}

/**
 * Keeps checking that phones can really reach the host's room, the way a
 * phone would (see probeRoom). An answer about the room itself, like "not
 * found", means it is broken at once. A check that failed for a reason
 * that might pass, like a timeout, is a strike: two in a row break the
 * room, or three once phones are in, since a false alarm then costs more.
 * It never breaks a room mid match, and waits while the host is offline,
 * since the socket client is already reconnecting.
 */
export class RoomWatchdog {
  private code: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private strikes = 0;
  private okSince: number | null = null;
  private busy = false;

  constructor(private readonly deps: WatchdogDeps) {}

  /** Starts on a room: checked at once, unless it was checked just now. */
  watch(code: string, { checked = false } = {}): void {
    this.stop();
    this.code = code;
    this.okSince = checked ? this.deps.now() : null;
    if (checked) this.schedule(this.cadence());
    else void this.check();
  }

  stop(): void {
    this.code = null;
    this.strikes = 0;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Something suggests trouble, or the host came back from a break: look now. */
  checkNow(): void {
    if (!this.code || this.busy) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    void this.check();
  }

  /** A phone joined, which is the best check there is. */
  passed(): void {
    if (!this.code) return;
    this.strikes = 0;
    this.okSince ??= this.deps.now();
    this.deps.passed(this.code);
  }

  get watching(): string | null {
    return this.code;
  }

  private cadence(): number {
    const settled = this.okSince !== null && this.deps.now() - this.okSince >= SETTLED_AFTER_MS;
    return settled ? SETTLED_EVERY_MS : LOBBY_EVERY_MS;
  }

  private schedule(wait: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.check();
    }, wait);
  }

  private async check(): Promise<void> {
    const code = this.code;
    if (!code || this.busy) return;
    if (this.deps.paused() || !this.deps.online()) return this.schedule(this.cadence());
    this.busy = true;
    let outcome: ProbeOutcome;
    try {
      outcome = await this.deps.probe(code);
    } catch {
      outcome = { ok: false, reason: "transport" };
    } finally {
      this.busy = false;
    }
    // The room changed while the check was out, so its answer is about another room.
    if (this.code === code) this.judge(code, outcome);
  }

  private judge(code: string, outcome: ProbeOutcome): void {
    if (outcome.ok) {
      this.passed();
      return this.schedule(this.cadence());
    }
    // Mid match, or offline, a failed check proves nothing worth a remake.
    if (this.deps.paused() || !this.deps.online()) return this.schedule(this.cadence());
    this.okSince = null;
    if (definitive(outcome.reason, this.deps.shared())) return this.fail(code, outcome.reason);
    this.strikes += 1;
    const limit = this.deps.phonesConnected() > 0 ? 3 : 2;
    if (this.strikes >= limit) return this.fail(code, outcome.reason);
    this.schedule(RECHECK_MS);
  }

  private fail(code: string, reason: string): void {
    this.stop();
    this.deps.broken(code, reason);
  }
}
