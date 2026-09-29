import { makeNonce, probeRoom, type ProbeOutcome } from "@/platform/net/room-probe";

/** How many recent checks the host remembers answering. */
const REMEMBERED = 20;
/** A late answer is handled a moment after the check gave up, once the page catches up. */
const CATCH_UP_MS = 50;

/**
 * The host's checks of its own room. The relay fails a check whose echo
 * came too late, and a page busy building a game's scene answers late. The
 * host knows which checks it answered itself, so a late one still passes:
 * the room exists and messages reach the host and back.
 */
export class HostProbe {
  private readonly answered: string[] = [];

  /** The host answered the check with this nonce. */
  answer(nonce: string): void {
    this.answered.push(nonce);
    if (this.answered.length > REMEMBERED) this.answered.shift();
  }

  /** `stream` is the host's own transport, which is known to work here. */
  async check(room: { code: string; token: string }, stream: boolean): Promise<ProbeOutcome> {
    const nonce = makeNonce();
    const outcome = await probeRoom(room, { stream, nonce });
    if (outcome.ok || (outcome.reason !== "no-echo" && outcome.reason !== "timeout")) return outcome;
    await new Promise((resolve) => setTimeout(resolve, CATCH_UP_MS));
    return this.answered.includes(nonce) ? { ok: true } : outcome;
  }
}
