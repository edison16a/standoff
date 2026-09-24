import { subscribeOrientation } from "@/games/kit/motion/orientation";
import type { Quat } from "@/games/kit/motion/math3d";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import type { CharacterId } from "../characters";
import { hostMessageSchema, type HostMessage, type PhoneMessage } from "../protocol";
import { useControllerStore as store } from "./controller-store";
import { buzz } from "./haptics";
import { screenAngle, steerFromRoll, tiltOf, type Tilt } from "./tilt";

/** Input goes out this often while racing, and at once on any button change. */
const SEND_MS = 33;

export interface Pedals {
  drive: boolean;
  brake: boolean;
  /** Only used when steering with the on screen arrows. */
  left: boolean;
  right: boolean;
}

/**
 * Magic Kart on the phone. It reads the tilt, turns it into steering,
 * adds the pedals and the power up button, and streams them to the host.
 * It makes no game decisions: what the kart does is always the host's
 * call. Joining the room and staying in it is the platform's job.
 */
export class KartPhone {
  /** The latest tilt, read by the level and the wheel gauge every frame. */
  tilt: Tilt | null = null;
  private zero = 0;
  private pedals: Pedals = { drive: false, brake: false, left: false, right: false };
  private readonly stopSensors: (() => void) | null;
  private readonly unsubscribe: () => void;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState() });
    const onQuat = (q: Quat) => {
      this.tilt = tiltOf(q, screenAngle());
    };
    this.stopSensors = room.motion === "granted" ? subscribeOrientation(onQuat, () => store.setState({ sensorsLive: true })) : null;
    if (room.motion !== "granted") store.setState({ steerMode: "buttons" });
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.timer = setInterval(() => this.stream(false), SEND_MS);
    this.send({ kind: "hello" });
  }

  dispose(): void {
    clearInterval(this.timer);
    this.stopSensors?.();
    this.unsubscribe();
  }

  /** Steering from -1 to 1, from the tilt or the arrow buttons. */
  get steer(): number {
    if (store.getState().steerMode === "buttons" || !this.tilt) return (this.pedals.right ? 1 : 0) - (this.pedals.left ? 1 : 0);
    return steerFromRoll(this.tilt.roll, this.zero);
  }

  /** Takes the phone's resting roll as straight ahead. */
  calibrate(): void {
    this.zero = this.tilt?.roll ?? 0;
    store.setState({ calibrated: true });
    this.click();
  }

  useButtons(): void {
    store.setState({ steerMode: "buttons", calibrated: true });
  }

  goTo(step: "calibrate" | "kart" | "ready"): void {
    store.setState({ step });
    this.click();
  }

  pick(character: CharacterId): void {
    store.setState({ wanted: character });
    this.click();
    this.send({ kind: "pick", character });
  }

  setReady(ready: boolean): void {
    this.click();
    this.send({ kind: "ready", ready });
  }

  setPedals(next: Partial<Pedals>): void {
    const before = this.pedals;
    this.pedals = { ...before, ...next };
    if (this.pedals.drive !== before.drive || this.pedals.brake !== before.brake) this.stream(true);
  }

  useItem(): void {
    this.send({ kind: "use" });
    buzz("pickup");
  }

  private get driving(): boolean {
    const host = store.getState().host;
    return !!host && host.racing && (host.phase === "countdown" || host.phase === "racing");
  }

  /** Sends the wheel and pedals. Button changes go reliably, the steady stream may drop. */
  private stream(reliable: boolean): void {
    if (!this.driving) return;
    const message: PhoneMessage = { kind: "input", steer: Math.round(this.steer * 1000) / 1000, drive: this.pedals.drive, brake: this.pedals.brake };
    if (reliable) this.room.send(message);
    else this.room.sendLossy(message);
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resendChoices();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (parsed.success) this.onHost(parsed.data);
  }

  private onHost(message: HostMessage): void {
    if (message.kind === "buzz") return buzz(message.event);
    const { wanted } = store.getState();
    // The host refused the pick (someone else got there first), so show what it has.
    const refused = wanted !== null && message.pick !== wanted && message.taken.includes(wanted);
    store.setState({ host: message, wanted: refused ? message.pick : (wanted ?? message.pick) });
  }

  /** After a reconnect or a host reload, tell the host what we had chosen. */
  private resendChoices(): void {
    const { wanted, host } = store.getState();
    if (wanted) this.send({ kind: "pick", character: wanted });
    if (host?.ready) this.send({ kind: "ready", ready: true });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }

  private click(): void {
    tone(this.room.audio, this.room.audio.bus("ui"), this.room.audio.now, { type: "triangle", frequency: 1600, decay: 0.04, peak: 0.25 });
  }
}
