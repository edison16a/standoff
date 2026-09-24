import { createStore, type StoreApi } from "zustand/vanilla";
import { PhoneAim } from "@/games/kit/aim/phone-aim";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { PUMP_S } from "../engine/rules";
import { hostMessageSchema, type GalleryState, type Scored, type SetupStep } from "../protocol";
import { DEFAULT_FINISH, FINISH_IDS, type FinishId } from "../render/models/finishes";

/** The Shoot button is grey while the gun is pumped. The host allows a little less, for network jitter. */
const REARM_MS = PUMP_S * 1000;
const FINISH_KEY = "standoff:shooting-gallery:finish";
/**
 * A state from the host sent before it heard this phone's own Ready tap
 * would flip the button straight back. For this long after a tap, the
 * phone keeps its own answer.
 */
const READY_HOLD_MS = 1000;

export interface PhoneState {
  step: SetupStep;
  finish: FinishId;
  ready: boolean;
  /** The latest state from the host, null until the first one lands. */
  game: GalleryState | null;
  /** The last thing this player hit, for a flash of points on the phone. */
  scored: (Scored & { at: number }) | null;
  /** True while the gun is being pumped after a shot. */
  pumping: boolean;
  /** The player left the results page to set up for the next round. */
  leftResults: boolean;
}

function savedFinish(): FinishId {
  try {
    const saved = localStorage.getItem(FINISH_KEY);
    return FINISH_IDS.find((id) => id === saved) ?? DEFAULT_FINISH;
  } catch {
    return DEFAULT_FINISH;
  }
}

/**
 * Shooting Gallery on the phone. It walks the player through setup,
 * streams their aim, and sends trigger pulls. It decides nothing about
 * hits or scores: that is always the host's call.
 */
export class GalleryPhone {
  readonly aim: PhoneAim;
  readonly store: StoreApi<PhoneState>;
  private readonly off: () => void;
  private rearm: ReturnType<typeof setTimeout> | null = null;
  private readyTappedAt = -Infinity;

  constructor(private readonly room: PhoneRoomApi) {
    this.aim = new PhoneAim(room);
    this.store = createStore<PhoneState>(() => ({ step: "calibrate", finish: savedFinish(), ready: false, game: null, scored: null, pumping: false, leftResults: false }));
    this.off = room.on((event) => this.onRoom(event));
    this.resend();
  }

  get seat(): number {
    return this.room.seat;
  }

  goTo(step: SetupStep): void {
    this.store.setState({ step, ready: step === "ready" ? this.store.getState().ready : false });
    // Once calibrated the aim streams all the time, so the gun on the big screen follows in the lobby too.
    if (step !== "calibrate") this.aim.stream(true);
    this.room.send({ kind: "setup", step });
  }

  chooseFinish(finish: FinishId): void {
    this.store.setState({ finish });
    try {
      localStorage.setItem(FINISH_KEY, finish);
    } catch {
      // The pick still counts for this game, it is just not remembered.
    }
    this.room.send({ kind: "gun", finish });
  }

  setReady(ready: boolean): void {
    this.readyTappedAt = performance.now();
    this.store.setState({ ready });
    this.room.send({ kind: "ready", ready });
  }

  /** From the results page back to setup, for a phone that has to calibrate again first. */
  leaveResults(): void {
    this.store.setState({ leftResults: true });
    this.goTo("calibrate");
  }

  fire(): void {
    if (this.store.getState().pumping) return;
    this.aim.fire();
    this.store.setState({ pumping: true });
    this.rearm = setTimeout(() => this.store.setState({ pumping: false }), REARM_MS);
  }

  recenter(): void {
    this.aim.recenter();
    navigator.vibrate?.(8);
  }

  dispose(): void {
    this.off();
    if (this.rearm) clearTimeout(this.rearm);
    this.aim.dispose();
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resend();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (!parsed.success) return;
    const message = parsed.data;
    if (message.kind === "scored") {
      this.store.setState({ scored: { ...message, at: performance.now() } });
      navigator.vibrate?.(message.bull || message.target === "golden" ? [25, 40, 25, 40, 25] : [18, 30, 18]);
      return;
    }
    const mine = message.players.find((p) => p.seat === this.room.seat);
    if (message.phase !== "results") this.store.setState({ leftResults: false });
    // The host clears everyone's ready flag when a round ends, and its word is final, once it has heard our last tap.
    const settled = performance.now() - this.readyTappedAt > READY_HOLD_MS;
    this.store.setState(settled ? { game: message, ready: mine?.ready ?? false } : { game: message });
  }

  /** After a reconnect or a host reload, tells the host everything chosen so far. */
  private resend(): void {
    const { step, finish, ready } = this.store.getState();
    this.room.send({ kind: "setup", step });
    this.room.send({ kind: "gun", finish });
    if (ready) this.room.send({ kind: "ready", ready });
  }
}
