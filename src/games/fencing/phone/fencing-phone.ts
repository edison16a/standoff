import { Sfx } from "@/games/fencing/audio/sfx";
import type { CharacterId } from "@/games/fencing/characters";
import { MotionPipeline, type ControllerFrame } from "@/games/fencing/motion/motion-pipeline";
import type { Sensitivity, StrikeReport } from "@/games/fencing/motion/gesture";
import type { Slot } from "@/games/fencing/players";
import { hostMessageSchema, type HostMessage, type PhoneMessage, type StrikeAction } from "@/games/fencing/protocol";
import { clampTuning, DEFAULT_TUNING } from "@/games/fencing/tuning";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { useControllerStore as store } from "./controller-store";
import { buzz } from "./haptics";
import { MotionStream } from "./motion-stream";
import { LISTEN_LEVEL } from "./practice";
import { subscribeSensors } from "./sensors";
import { loadSensitivity, saveSensitivity } from "./sensitivity-memory";

/** Phases where the host is drawing this fencer and wants the live reading. */
const STREAMING = new Set(["enGarde", "live", "halt", "paused"]);
/** The sword held level, for devices with no motion sensors. */
const LEVEL = { pitch: 0, yaw: 0, roll: 0 };

type StrikeListener = (action: StrikeAction, report: StrikeReport | null) => void;

/**
 * Fencing on the phone. It reads the sensors, turns them into sword angles
 * and strikes, adds the footwork buttons, and streams them to the host. It
 * makes no game decisions of its own: whether a jab landed is always the
 * host's call. But every strike it reads is shown and felt at once, and the
 * host's verdict follows. Joining the room and staying in it is the
 * platform's job.
 */
export class FencingPhone {
  readonly pipeline: MotionPipeline;
  readonly sfx: Sfx;
  private readonly motion: MotionStream;
  private readonly stopSensors: (() => void) | null;
  private readonly unsubscribe: () => void;
  private readonly strikeListeners = new Set<StrikeListener>();
  /** Footwork from the Forward and Back buttons: 1, -1 or 0. */
  private move = 0;
  private practising = false;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState(), slot: room.seat as Slot, sensitivity: loadSensitivity() });
    this.sfx = new Sfx(room.audio);
    this.pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => this.onStrike(action));
    this.applySensitivity();
    this.motion = new MotionStream(
      () => this.frame,
      (frame) => room.sendLossy({ kind: "motion", ...frame }),
      () => STREAMING.has(store.getState().game?.phase ?? "lobby"),
    );
    // No sensors, or no permission: the on screen buttons need no calibration.
    this.stopSensors = room.motion === "granted" ? subscribeSensors(this.pipeline, () => store.setState({ sensorsLive: true })) : null;
    if (room.motion !== "granted") this.useTouchControls();
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.motion.start();
  }

  /** The live reading being sent, for the gauges on screen. */
  get frame(): ControllerFrame {
    const sword = store.getState().inputMode === "touch" ? LEVEL : this.pipeline.sword;
    return { ...sword, move: this.move };
  }

  dispose(): void {
    this.motion.stop();
    this.stopSensors?.();
    this.unsubscribe();
  }

  calibrate(): boolean {
    const ok = this.pipeline.calibrate();
    if (ok) {
      store.setState({ calibrated: true });
      buzz("captured");
      this.sfx.chime();
    }
    return ok;
  }

  /** No sensors: play with on screen buttons. */
  useTouchControls(): void {
    store.setState({ inputMode: "touch", calibrated: true });
  }

  /** Hears every strike this phone reads, for the practice step. Returns an unsubscribe. */
  onLocalStrike(listener: StrikeListener): () => void {
    this.strikeListeners.add(listener);
    return () => this.strikeListeners.delete(listener);
  }

  /** While practising, the detector listens for gentler strikes and nothing is sent to the host. */
  setPractising(on: boolean): void {
    this.practising = on;
    this.applySensitivity();
  }

  /** The player's own strike levels, kept on this phone for next time. */
  setSensitivity(sensitivity: Sensitivity | null): void {
    store.setState({ sensitivity });
    saveSensitivity(sensitivity);
    this.applySensitivity();
  }

  /** A finger touched or left the screen: its jolt is not a strike. */
  noteTap(): void {
    this.pipeline.noteTap(performance.now());
  }

  pick(characterId: CharacterId): void {
    store.setState({ pick: characterId, ready: false });
    this.sfx.click();
    this.send({ kind: "pick", characterId });
  }

  setReady(ready: boolean): void {
    store.setState({ ready });
    this.sfx.click();
    this.send({ kind: "ready", ready });
  }

  /** Ask for a rematch, or for the computer as opponent. */
  press(payload: Extract<PhoneMessage, { kind: "rematch" | "solo" }>): void {
    this.sfx.click();
    this.send(payload);
  }

  /** Held Forward (1), held Back (-1), or neither (0). */
  setMove(value: -1 | 0 | 1): void {
    this.move = value;
  }

  /** Touch mode strike buttons go through the same path as detected ones. */
  strike(action: StrikeAction): void {
    this.onStrike(action);
  }

  private applySensitivity(): void {
    const own = store.getState().sensitivity ?? { strike: 1 };
    this.pipeline.setSensitivity(this.practising ? { strike: LISTEN_LEVEL } : own);
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resendChoices();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (parsed.success) this.onHost(parsed.data);
  }

  private onHost(message: HostMessage): void {
    switch (message.kind) {
      case "state": {
        // The host is the source of truth for picks: it refuses a taken fencer.
        const slot = store.getState().slot;
        const mine = slot ? { pick: message.picks[slot - 1] ?? null, ready: message.ready[slot - 1] ?? false } : {};
        store.setState({ game: message, ...mine });
        return;
      }
      case "tuning":
        this.pipeline.configure(clampTuning(message.tuning));
        return;
      case "recenter":
        this.pipeline.recenter();
        return;
      case "feedback":
        buzz(message.event);
        store.setState({ verdict: { event: message.event, reason: message.reason, at: performance.now() } });
        return;
    }
  }

  /** After a reconnect or a host reload, tell the host what we had chosen. */
  private resendChoices(): void {
    const { pick, ready } = store.getState();
    if (pick) this.send({ kind: "pick", characterId: pick });
    if (ready) this.send({ kind: "ready", ready });
  }

  private onStrike(action: StrikeAction): void {
    const report = this.pipeline.lastStrike;
    for (const listener of this.strikeListeners) listener(action, report);
    if (this.practising) return;
    if (store.getState().game?.phase !== "live") return;
    // Felt and shown the instant it is read; the referee's verdict follows from the host.
    buzz(action);
    store.setState({ detected: { action, at: performance.now() }, verdict: null });
    this.send({ kind: "strike", action });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }
}
