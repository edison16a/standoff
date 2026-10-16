import { PhonePad } from "@/games/kit/pad/phone-pad";
import type { Stick } from "@/games/kit/pad/stick-math";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import { hostMessageSchema, PAD_BUTTONS, type Call, type HostMessage, type PadButton, type PhoneMessage } from "../protocol";
import type { BuildId } from "../builds";
import { buzz, tick } from "./haptics";
import { followMeter, tapMeter } from "./kick-meter";
import { usePhoneStore as store, type SetupStep } from "./phone-store";

/**
 * Football 3v3 on the phone. It shows the setup steps, then turns the
 * phone into the controller for whatever this player is doing: the QB's
 * move stick and throw buttons, a runner's stick, the defence's buttons, the
 * play call, the kick meters. It makes no game decisions; what happens
 * on the field is always the host's call.
 */
export class FootballPhone {
  readonly pad: PhonePad;
  private readonly off: () => void;
  /** The throw button last lit on the big screen, so the host hears only changes. */
  private lit: number | null = null;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState() });
    this.pad = new PhonePad(room);
    this.off = room.on((event) => this.onRoom(event));
    this.send({ kind: "hello" });
  }

  dispose(): void {
    this.pad.dispose();
    this.off();
  }

  goTo(step: SetupStep): void {
    store.setState({ step });
    this.click();
  }

  pick(build: BuildId): void {
    store.setState({ wanted: build });
    this.click();
    this.send({ kind: "pick", build });
  }

  setReady(ready: boolean): void {
    this.click();
    this.send({ kind: "ready", ready });
  }

  /** Streams the pad only while the controller is on screen. */
  controlling(on: boolean): void {
    this.pad.stream(on);
    if (!on) this.letGo();
  }

  /** The move stick. */
  move(stick: Stick): void {
    this.pad.setStick(stick);
  }

  press(button: PadButton | "skip", down: boolean): void {
    if (down) this.pad.press(button);
    else this.pad.release(button);
  }

  /** Letting go on one of the QB's throw buttons: throw to that runner, sent reliably. The throw ends the light too. */
  throwTo(slot: number): void {
    this.lit = null;
    this.send({ kind: "throw", slot });
  }

  /** The QB's finger held on a throw button (or off them all): his runner lights up on the big screen. Sent only on a change. */
  highlight(slot: number | null): void {
    if (slot === this.lit) return;
    this.lit = slot;
    if (slot !== null) tick();
    this.send({ kind: "highlight", slot });
  }

  call(call: Call): void {
    this.click();
    this.send({ kind: "call", call });
  }

  /** On the page of plays: pick one by its place, deal a fresh page, or go back to the call. */
  playbook(action: number | "redeal" | "back"): void {
    this.click();
    this.send({ kind: "play", action });
  }

  /** A tap on the kick button: the reading drawn on this phone at that instant goes to the host, and the next meter starts. */
  kick(): void {
    const tap = tapMeter(store.getState().kick, performance.now());
    if (!tap) return;
    store.setState({ kick: tap.next });
    this.send({ kind: "kick", value: Math.max(-1, Math.min(1, tap.value)) });
  }

  /**
   * The buttons on screen changed: whatever was held under the old layout
   * is let go, so nothing sticks. The move stick is kept when it stays on
   * screen, so a thumb steering through a switch (the QB pressing Run)
   * keeps running.
   */
  letGo({ keepStick = false }: { keepStick?: boolean } = {}): void {
    for (const button of [...PAD_BUTTONS, "skip"]) this.pad.release(button);
    if (!keepStick) this.pad.setStick({ x: 0, y: 0 });
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resendChoices();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (parsed.success) this.onHost(parsed.data);
  }

  private onHost(message: HostMessage): void {
    if (message.kind === "buzz") return buzz(message.event);
    const { wanted, host, kick } = store.getState();
    // The host refused the pick (someone else got there first), so show what it has.
    const refused = wanted !== null && message.pick !== wanted && message.taken.includes(wanted);
    const meter = followMeter(kick, host?.meter?.stage ?? null, message.meter?.stage ?? null, performance.now());
    store.setState({ host: message, kick: meter, wanted: refused ? message.pick : (wanted ?? message.pick) });
  }

  /** After a reconnect or a host reload, tell the host what we had chosen. */
  private resendChoices(): void {
    const { wanted, host } = store.getState();
    if (wanted) this.send({ kind: "pick", build: wanted });
    if (host?.ready) this.send({ kind: "ready", ready: true });
    if (this.lit !== null) this.send({ kind: "highlight", slot: this.lit });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }

  private click(): void {
    tone(this.room.audio, this.room.audio.bus("ui"), this.room.audio.now, { type: "triangle", frequency: 1500, decay: 0.04, peak: 0.25 });
  }
}
