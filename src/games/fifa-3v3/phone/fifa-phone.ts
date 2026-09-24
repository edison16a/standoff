import { PhonePad } from "@/games/kit/pad/phone-pad";
import type { Stick } from "@/games/kit/pad/stick-math";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import { BUTTONS, hostMessageSchema, type HostMessage, type PhoneMessage } from "../protocol";
import type { CharacterId } from "../roster";
import { buzz } from "./haptics";
import { usePhoneStore as store, type SetupStep } from "./phone-store";

/**
 * FIFA 3v3 on the phone. It shows the setup steps, then turns the phone
 * into a controller: the kit's thumb stick and two buttons, streamed to
 * the host. It makes no game decisions; what the player does on the
 * pitch is always the host's call.
 */
export class FifaPhone {
  readonly pad: PhonePad;
  private readonly unsubscribe: () => void;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState() });
    this.pad = new PhonePad(room);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.send({ kind: "hello" });
  }

  dispose(): void {
    this.pad.dispose();
    this.unsubscribe();
  }

  goTo(step: SetupStep): void {
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

  /** Streams the pad only while the controller is on screen. */
  controlling(on: boolean): void {
    this.pad.stream(on);
    if (!on) this.pad.releaseAll();
  }

  stick(stick: Stick): void {
    this.pad.setStick(stick);
  }

  shoot(down: boolean): void {
    if (down) this.pad.press(BUTTONS.shoot);
    else this.pad.release(BUTTONS.shoot);
  }

  action(down: boolean): void {
    if (down) this.pad.press(BUTTONS.action);
    else this.pad.release(BUTTONS.action);
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
    tone(this.room.audio, this.room.audio.bus("ui"), this.room.audio.now, { type: "triangle", frequency: 1500, decay: 0.04, peak: 0.25 });
  }
}
