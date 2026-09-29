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

  constructor(private readonly deps: GuardDeps) {
    this.watchdog = new RoomWatchdog({
      probe: (code) => deps.probe(code),
      passed: () => {
        if (get().health === "checking") set({ health: "ok" });
      },
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

  /** A room is on screen: a new one is checked at once, one that came back carries on. */
  opened(code: string, same: boolean): void {
    if (this.swapping) return;
    if (same && get().health !== "idle") return this.watchdog.watch(code, { checked: get().health === "ok" });
    set({ health: "checking", problem: null, roomGone: false });
    this.watchdog.watch(code);
  }

  /** Something says the room is broken. Fixed at once while nobody is in it, or the player is asked. */
  trouble(problem: RoomProblem): void {
    if (this.remaker.busy) return;
    this.watchdog.stop();
    if (problem === "lost") set({ roomGone: true });
    if (!this.deps.joined() && this.regenerate("auto")) return;
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
    set({ health: "checking", problem: null });
    this.watchdog.watch(room.code);
  }

  stop(): void {
    this.remaker.cancel();
    this.watchdog.stop();
  }
}
