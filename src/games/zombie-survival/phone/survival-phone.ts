import { PhoneAim } from "@/games/kit/aim/phone-aim";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import { WEAPONS, type WeaponId } from "../engine/weapons";
import { hostMessageSchema, type BuzzEvent, type HostMessage, type PhoneMessage } from "../protocol/messages";
import { usePhoneStore as store } from "./phone-store";
import { TriggerHold } from "./trigger";

/** Vibration patterns, in milliseconds, for what the host reports. */
const BUZZ: Record<BuzzEvent, number | number[]> = {
  hit: 18,
  kill: [30, 30, 40],
  weak: [20, 20, 20],
  hurt: [80, 40, 80],
  dry: 8,
  reloaded: 25,
};

/**
 * Zombie Survival on the phone. It aims (through the kit), holds the
 * trigger at the gun's rate, and sends choices and button presses. It
 * decides nothing about the game: the host says what landed and how
 * much ammo is left.
 */
export class SurvivalPhone {
  readonly aim: PhoneAim;
  private readonly trigger: TriggerHold;
  private readonly unsubscribe: () => void;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState(), seat: room.seat });
    this.aim = new PhoneAim(room);
    this.trigger = new TriggerHold(() => this.aim.fire());
    this.unsubscribe = room.on((event) => this.onRoom(event));
  }

  dispose(): void {
    this.trigger.release();
    this.aim.dispose();
    this.unsubscribe();
  }

  calibrated(): void {
    this.click();
    store.setState({ calibrated: true, step: 1 });
  }

  goTo(step: number): void {
    this.click();
    store.setState({ step });
  }

  pick(weapon: WeaponId): void {
    this.click();
    store.setState({ weapon, ready: false });
  }

  /** Confirms the gun on screen and moves on to Ready. */
  confirmWeapon(): void {
    const { weapon } = store.getState();
    this.send({ kind: "weapon", weapon });
    this.goTo(2);
  }

  setReady(ready: boolean): void {
    this.click();
    const { weapon } = store.getState();
    if (ready) this.send({ kind: "weapon", weapon });
    store.setState({ ready });
    this.send({ kind: "ready", ready });
  }

  pressTrigger(): void {
    const weapon = store.getState().gun?.weapon ?? store.getState().weapon;
    const spec = WEAPONS[weapon];
    this.trigger.press(spec.auto, spec.rate);
  }

  releaseTrigger(): void {
    this.trigger.release();
  }

  reload(): void {
    this.click();
    this.send({ kind: "reload" });
  }

  retry(): void {
    this.click();
    this.send({ kind: "retry" });
  }

  again(): void {
    this.click();
    store.setState({ ready: false, step: store.getState().calibrated ? 1 : 0 });
    this.send({ kind: "again" });
  }

  recenter(): void {
    this.click();
    this.aim.recenter();
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resend();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (parsed.success) this.onHost(parsed.data);
  }

  private onHost(message: HostMessage): void {
    switch (message.kind) {
      case "state": {
        const { state, calibrated } = store.getState();
        // Back in the lobby after a run: the host cleared every ready flag, so start from the gun pick.
        if (state && state.phase !== "lobby" && message.phase === "lobby") {
          this.trigger.release();
          store.setState({ ready: false, step: calibrated ? 1 : 0 });
        }
        store.setState({ state: message });
        return;
      }
      case "gun": {
        const before = store.getState().gun;
        const started = message.reloading && !before?.reloading;
        store.setState({ gun: message, reloadFrom: message.reloading ? (started ? performance.now() : store.getState().reloadFrom) : null });
        return;
      }
      case "score":
        store.setState({ score: message });
        return;
      case "buzz":
        navigator.vibrate?.(BUZZ[message.event]);
        return;
    }
  }

  /** After a reconnect or a host reload, say again what this player chose. */
  private resend(): void {
    const { weapon, ready, step } = store.getState();
    if (step >= 2 || ready) this.send({ kind: "weapon", weapon });
    if (ready) this.send({ kind: "ready", ready });
  }

  private click(): void {
    tone(this.room.audio, this.room.audio.bus("ui"), this.room.audio.now, { type: "triangle", frequency: 1500, decay: 0.035, peak: 0.25 });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }
}
