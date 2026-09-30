import { PhoneAim } from "@/games/kit/aim/phone-aim";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import type { GunId } from "../engine/guns";
import { hostMessageSchema, type HostMessage, type PhoneMessage } from "../protocol";
import { buzz, FLASH_WORDS } from "./haptics";
import { usePhoneStore as store, type SetupStep } from "./phone-store";

/**
 * Paintball Battle on the phone. It walks the player through aiming at
 * their own view, picking a gun and saying ready, then becomes the gun:
 * it streams the aim through the kit and sends the trigger going down
 * and up, and Reload. It decides nothing: the host says what landed and
 * how many rounds are left.
 */
export class CounterPhone {
  readonly aim: PhoneAim;
  private held = false;
  private ducked = false;
  /** Which of ADVANCE and RETREAT are held; both at once cancel out. */
  private readonly steps = { advance: false, retreat: false };
  private dir = 0;
  private flashKey = 0;
  private readonly unsubscribe: () => void;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState() });
    this.aim = new PhoneAim(room);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.send({ kind: "hello" });
  }

  dispose(): void {
    this.releaseAll();
    this.aim.dispose();
    this.unsubscribe();
  }

  goTo(step: SetupStep): void {
    this.click();
    store.setState({ step });
  }

  calibrated(): void {
    this.click();
    // The kit leaves its test view's stream running; the controller starts its own when play begins.
    this.aim.stream(false);
    store.setState({ calibrated: true, step: 1 });
  }

  /** Calibrate again, from the ready page or the controller. */
  aimAgain(): void {
    this.click();
    store.setState({ calibrated: false, step: 0 });
  }

  pick(gun: GunId): void {
    this.click();
    store.setState({ wanted: gun });
  }

  /** Confirms the gun on screen and moves on to Ready. */
  confirmGun(): void {
    this.send({ kind: "gun", gun: store.getState().wanted });
    this.goTo(2);
  }

  setReady(ready: boolean): void {
    this.click();
    if (ready) this.send({ kind: "gun", gun: store.getState().wanted });
    this.send({ kind: "ready", ready });
  }

  /** The trigger going down: the kit's fire carries the exact aim, and the press holds an automatic on. */
  pressTrigger(): void {
    if (this.held) return;
    this.held = true;
    this.aim.fire();
    this.send({ kind: "trigger", down: true });
  }

  releaseTrigger(): void {
    if (!this.held) return;
    this.held = false;
    this.send({ kind: "trigger", down: false });
  }

  /** Crouch held or let go. Letting go brings the fighter up to shoot. */
  crouch(down: boolean): void {
    if (down === this.ducked) return;
    this.ducked = down;
    if (down) buzz("tap");
    this.send({ kind: "crouch", down });
  }

  /** ADVANCE or RETREAT going down or up. The host hears only the way the fighter should go. */
  step(which: "advance" | "retreat", down: boolean): void {
    if (this.steps[which] === down) return;
    this.steps[which] = down;
    if (down) buzz("tap");
    const dir = (this.steps.advance ? 1 : 0) - (this.steps.retreat ? 1 : 0);
    if (dir === this.dir) return;
    this.dir = dir;
    this.send({ kind: "move", dir: dir as -1 | 0 | 1 });
  }

  /** Lets go of every held button, as when the page loses focus. */
  releaseAll(): void {
    this.releaseTrigger();
    this.crouch(false);
    this.step("advance", false);
    this.step("retreat", false);
  }

  reload(): void {
    this.click();
    this.send({ kind: "reload" });
  }

  recenter(): void {
    this.click();
    this.aim.recenter();
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resendChoices();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (parsed.success) this.onHost(parsed.data);
  }

  private onHost(message: HostMessage): void {
    if (message.kind === "buzz") {
      buzz(message.event);
      const word = FLASH_WORDS[message.event];
      if (word) store.setState({ flash: { key: ++this.flashKey, ...word } });
      return;
    }
    const before = store.getState().host;
    // Back in the lobby after a match: pick up at the gun, still calibrated.
    if (before && before.phase !== "lobby" && message.phase === "lobby") {
      this.releaseAll();
      store.setState({ step: store.getState().calibrated ? 2 : 0 });
    }
    if (!before && message.gun) store.setState({ wanted: message.gun });
    store.setState({ host: message, reload: this.reloadClock(message) });
  }

  /** The reload on this phone's clock. The host rounds the time left, so small differences are noise and would make the bar twitch. */
  private reloadClock(message: Extract<HostMessage, { kind: "state" }>): { from: number; to: number } | null {
    if (!message.reloading) return null;
    const now = performance.now();
    const running = store.getState().reload;
    const to = now + message.reloadLeft * 1000;
    if (running && Math.abs(running.to - to) < 350) return running;
    return { from: running?.from ?? now, to };
  }

  /** After a reconnect or a host reload, tell the host what we had chosen. */
  private resendChoices(): void {
    const { host, wanted, step } = store.getState();
    if (step >= 2 || host?.gun) this.send({ kind: "gun", gun: wanted });
    if (host?.ready) this.send({ kind: "ready", ready: true });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }

  private click(): void {
    buzz("tap");
    tone(this.room.audio, this.room.audio.bus("ui"), this.room.audio.now, { type: "triangle", frequency: 1500, decay: 0.04, peak: 0.25 });
  }
}
