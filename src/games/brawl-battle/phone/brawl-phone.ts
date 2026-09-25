import { PhonePad } from "@/games/kit/pad/phone-pad";
import type { Stick } from "@/games/kit/pad/stick-math";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import { MOVEMENT } from "../engine/tuning";
import { BUTTONS, hostMessageSchema, type ButtonName, type HostMessage, type PhoneMessage } from "../protocol";
import type { CharacterId } from "../roster";
import { buzz, FLASH_WORDS } from "./haptics";
import { usePhoneStore as store, type SetupStep } from "./phone-store";

/**
 * Brawl Battle on the phone. It walks the player through picking a
 * fighter, then becomes a controller: the direction pad streams as the
 * kit's stick, up also goes as a reliable press, and the three buttons
 * go through the kit. It makes no game decisions.
 */
export class BrawlPhone {
  readonly pad: PhonePad;
  private up = false;
  private flashKey = 0;
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

  /** Streams the pad while the controller is on screen. */
  stream(on: boolean): void {
    this.pad.stream(on);
    if (!on) {
      this.pad.releaseAll();
      this.up = false;
    }
  }

  /** The direction pad moved. Up going on or off also goes as a press, so a quick tap always jumps. */
  setDirection(stick: Stick): void {
    this.pad.setStick(stick);
    const up = stick.y >= MOVEMENT.flick;
    if (up === this.up) return;
    this.up = up;
    if (up) this.pad.press(BUTTONS.up);
    else this.pad.release(BUTTONS.up);
  }

  press(button: ButtonName): void {
    this.pad.press(button);
  }

  release(button: ButtonName): void {
    this.pad.release(button);
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
    const { wanted } = store.getState();
    store.setState({ host: message, wanted: wanted ?? message.pick });
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
    buzz("tap");
    tone(this.room.audio, this.room.audio.bus("ui"), this.room.audio.now, { type: "triangle", frequency: 1500, decay: 0.04, peak: 0.25 });
  }
}
