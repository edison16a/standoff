import type { ProbeOutcome } from "@/platform/net/room-probe";
import { useHostStore, type RoomProblem } from "./host-store";
import type { RoomCandidate } from "./room-candidate";
import type { OpenedRoom } from "./room-keeper";
import type { RememberedRoom } from "./room-memory";
import { RoomRemaker, type RemakeReason } from "./room-remake";
import { RoomWatchdog } from "./room-watchdog";

export interface GuardDeps {
  probe(code: string): Promise<ProbeOutcome>;
  /** The room to make again: the one on screen, or the one a reload could not get back. */
  snapshot(): RememberedRoom | null;
  /** A phone has sat in this room, so its players must hear about a new one. */
  joined(): boolean;
  phonesConnected(): number;
  /** The relay said every server instance sees the same rooms. */
  shared(): boolean;
  makeCandidate(): RoomCandidate;
  /** A new room passed its check: the host moves over to it. */
  swap(candidate: RoomCandidate, room: OpenedRoom, old: RememberedRoom): void;
  /** Nothing is on screen to fall back on. */
  goHome(error: string): void;
  /**
   * A check could not find the room: new connections now go to a server
   * instance that does not have it. The host moves its own socket there,
   * which makes the room again and brings its phones along (see HostRoom).
   */
  follow(): void;
}

/** Back from the background after this long, the room is checked again at once. */
const AWAY_CHECK_MS = 20_000;
const set = useHostStore.setState;
const get = useHostStore.getState;

/**
 * Knows when the host's room is broken and gets a working one. The
 * watchdog checks the room the way a phone reaches it. When the room is
 * lost or unreachable before anyone joined, a new one is made at once,
 * since nobody needs telling. Once players are in, the big screen asks
 * instead (see RoomAlert), because a new code means they must follow.
 */
export class RoomGuard {
  readonly watchdog: RoomWatchdog;
  private readonly remaker: RoomRemaker<RoomCandidate>;
  /** The swap opens the new room, which has just passed its check already. */
  private swapping = false;
  /** The room the player chose to keep despite failed checks: only a stronger sign alerts again. */
  private kept: string | null = null;

  constructor(private readonly deps: GuardDeps) {
    this.watchdog = new RoomWatchdog({
      probe: (code) => deps.probe(code),
      // A pass also clears an alert about checks, since the room works again.
      passed: () => {
        const { health, problem, roomGone } = get();
        if (health === "checking" || (health === "lost" && problem === "unreachable" && !roomGone)) set({ health: "ok", problem: null });
      },
      notFound: () => deps.follow(),
      // A check that fails may still leave the players already in it playing,
      // since a fresh connection can land on another server instance.
      broken: () => this.trouble("unreachable"),
      phonesConnected: () => deps.phonesConnected(),
      // Mid match a check proves nothing worth a remake, and a hidden code needs no checking.
      // A background tab waits too, once its room has passed: the first check never does, or the code would stay hidden.
      paused: () => get().playing || get().joinHidden || (get().health !== "checking" && typeof document !== "undefined" && document.hidden),
      online: () => get().status === "open",
      shared: () => deps.shared(),
      now: Date.now,
    });
    this.remaker = new RoomRemaker<RoomCandidate>({
      make: () => deps.makeCandidate(),
      swap: (candidate, room, old) => {
        this.swapping = true;
        deps.swap(candidate, room, old);
        this.swapping = false;
        set({ health: "ok", problem: null, roomGone: false });
        this.watchdog.watch(room.code, { checked: true });
      },
      giveUp: () => {
        if (!get().room) return deps.goHome("The room was lost. Host the game again.");
        set({ health: "lost", problem: "not-made" });
      },
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: Date.now,
    });
  }

  get fixing(): boolean {
    return this.remaker.busy;
  }

  /**
   * Looks at the room again at the moments trouble shows: a game ending,
   * and the tab coming back after a while away. Returns a detach.
   */
  attach(): () => void {
    const unwatch = useHostStore.subscribe((state, before) => {
      if (before.playing && !state.playing) this.watchdog.checkNow();
    });
    if (typeof document === "undefined") return unwatch;
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt !== null && Date.now() - hiddenAt > AWAY_CHECK_MS) this.watchdog.checkNow();
      if (!document.hidden) hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unwatch();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }

  /**
   * A room is on screen: a new one is checked at once. One that came back
   * carries on, and a handover every few minutes must not push its next
   * check back each time, so a passed room keeps its schedule.
   */
  opened(code: string, same: boolean): void {
    if (this.swapping) return;
    const { health } = get();
    if (same && health === "ok" && this.watchdog.watching === code) return;
    if (same && health !== "idle") return this.watchdog.watch(code, { checked: health === "ok" });
    this.kept = null;
    set({ health: "checking", problem: null, roomGone: false });
    this.watchdog.watch(code);
  }

  /** The room may be gone and is being looked for again: its code hides until it is back. */
  doubt(): void {
    const { room, health } = get();
    if (!room || this.remaker.busy || (health !== "ok" && health !== "checking")) return;
    this.watchdog.stop();
    set({ health: "checking" });
  }

  /** Something says the room is broken. Fixed at once while nobody is in it, or the player is asked. */
  trouble(problem: RoomProblem): void {
    const code = get().room?.code ?? null;
    if (this.remaker.busy) return;
    this.watchdog.stop();
    if (problem === "lost") set({ roomGone: true });
    if (!this.deps.joined() && this.regenerate("auto")) return;
    // Checks go on after an alert about them, so it clears once the room works again.
    if (problem === "unreachable" && code) this.watchdog.watch(code, { checked: true });
    // The player kept this room once already: failed checks alone do not ask again.
    if (problem === "unreachable" && code === this.kept) return;
    set({ health: "lost", problem });
  }

  /** A full remake: a fresh connection and a new room for the same game, then the phones follow. */
  regenerate(reason: RemakeReason): boolean {
    const old = this.deps.snapshot();
    if (!old?.game || this.remaker.busy) return false;
    if (!this.remaker.start(reason, old)) return false;
    this.watchdog.stop();
    set({ health: "fixing", problem: null });
    return true;
  }

  /** "Keep this room": the player would rather carry on with the room as it is. */
  keep(): void {
    const room = get().room;
    if (!room || get().roomGone) return;
    this.kept = room.code;
    set({ health: "ok", problem: null });
    this.watchdog.watch(room.code, { checked: true });
  }

  stop(): void {
    this.remaker.cancel();
    this.watchdog.stop();
  }
}
