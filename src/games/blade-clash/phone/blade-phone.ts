import { Sfx } from "@/games/blade-clash/audio/sfx";
import type { CharacterId } from "@/games/blade-clash/characters";
import { MotionPipeline } from "@/games/blade-clash/motion/motion-pipeline";
import type { AimPoint, SwordCalibration } from "@/games/blade-clash/motion/sword-aim";
import type { Slot } from "@/games/blade-clash/players";
import { hostMessageSchema, type CalibrationStep, type HostMessage, type PhoneMessage } from "@/games/blade-clash/protocol";
import { subscribeOrientation } from "@/games/kit/motion/orientation";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { useControllerStore as store } from "./controller-store";
import { buzz } from "./haptics";
import { MotionStream, type ControllerFrame } from "./motion-stream";

/**
 * Blade Clash on the phone. It reads the sensors, turns them into how the
 * sword is held, adds the footwork buttons, and streams both to the host.
 * It makes no game decisions: every hit and clash is worked out on the
 * computer, which tells the phone so it can buzz. Joining the room and
 * staying in it is the platform's job.
 */
export class BladePhone {
  readonly pipeline = new MotionPipeline();
  readonly sfx: Sfx;
  private readonly motion: MotionStream;
  private readonly stopSensors: (() => void) | null;
  private readonly unsubscribe: () => void;
  /** Footwork from the Forward and Back buttons: 1, -1 or 0. */
  private move = 0;
  private step: CalibrationStep | null = null;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState(), slot: room.seat as Slot });
    this.sfx = new Sfx(room.audio);
    this.motion = new MotionStream(
      () => this.frame,
      (frame) => room.sendLossy({ kind: "motion", ...frame }),
      // The host draws this sword from the moment it is calibrated, lobby included, so players see it follow.
      () => store.getState().calibrated && store.getState().game?.phase !== "matchOver",
    );
    // No sensors, or no permission: the drag pad needs no calibration.
    this.stopSensors =
      room.motion === "granted"
        ? subscribeOrientation(
            (q) => this.pipeline.onOrientation(q),
            () => store.setState({ sensorsLive: true }),
          )
        : null;
    if (room.motion !== "granted") this.useTouchControls();
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.motion.start();
  }

  /** How the sword is held right now, as sent to the host. */
  get frame(): ControllerFrame {
    return { ...this.pipeline.control, move: this.move };
  }

  dispose(): void {
    this.motion.stop();
    this.stopSensors?.();
    this.unsubscribe();
    this.sfx.dispose();
  }

  /** Tells the big screen which target to show in this player's half. */
  showStep(step: CalibrationStep): void {
    this.step = step;
    this.send({ kind: "calibrate", step });
  }

  /** A calibration target was held long enough. */
  captured(): void {
    buzz("captured");
    this.sfx.chime();
  }

  setCalibration(calibration: SwordCalibration): void {
    this.pipeline.setCalibration(calibration);
    store.setState({ calibrated: true });
  }

  /** No sensors: play with the drag pad. */
  useTouchControls(): void {
    store.setState({ inputMode: "touch", calibrated: true });
  }

  /** The drag pad's point, or null when the finger lifts. */
  drag(point: AimPoint | null): void {
    this.pipeline.drag(point);
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

  /** Ask for a rematch, the menu, or the computer as opponent. */
  press(payload: Extract<PhoneMessage, { kind: "rematch" | "menu" | "solo" }>): void {
    this.sfx.click();
    this.send(payload);
  }

  /** Held Forward (1), held Back (-1), or neither (0). */
  setMove(value: -1 | 0 | 1): void {
    this.move = value;
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resendChoices();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (parsed.success) this.onHost(parsed.data);
  }

  private onHost(message: HostMessage): void {
    if (message.kind === "feedback") {
      buzz(message.event);
      store.setState({ flash: { event: message.event, at: performance.now() } });
      return;
    }
    // The host is the source of truth for picks: it refuses a taken fighter.
    const slot = store.getState().slot;
    const mine = slot ? { pick: message.picks[slot - 1] ?? null, ready: message.ready[slot - 1] ?? false } : {};
    store.setState({ game: message, ...mine });
  }

  /** After a reconnect or a host reload, tell the host what we had chosen. */
  private resendChoices(): void {
    const { pick, ready } = store.getState();
    if (this.step) this.send({ kind: "calibrate", step: this.step });
    if (pick) this.send({ kind: "pick", characterId: pick });
    if (ready) this.send({ kind: "ready", ready });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }
}
