import { PhonePad } from "@/games/kit/pad/phone-pad";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { tone } from "@/platform/audio/voices";
import type { Button } from "../engine/types";
import { hostMessageSchema, type HostMessage, type PhoneMessage } from "../protocol";
import type { CharacterId } from "../roster";
import { useControllerStore as store, type SetupStep } from "./controller-store";
import { buzz, toneOf } from "./haptics";

/**
 * Basketball 3v3 on the phone. It walks the player through picking a star,
 * then becomes a controller: the kit's thumb stick and buttons stream to
 * the host, and Shoot also times its own hold, so the host can judge the
 * release free of network lag. It makes no game decisions.
 */
export class NbaPhone {
  readonly pad: PhonePad;
  private shootAt: number | null = null;
  private flashKey = 0;
  private streaming = false;
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

  /** Streams the stick while the controller is on screen. */
  stream(on: boolean): void {
    this.pad.stream(on);
    this.streaming = on;
    if (on) return;
    this.pad.releaseAll();
    this.shootAt = null;
    // The meter and the last word flashed (You win!, +2) belong to that game, not to the next controller shown.
    store.setState({ flash: null, aimingSince: null });
  }

  press(button: Button): void {
    if (button === "shoot") {
      this.shootAt = performance.now();
      store.setState({ aimingSince: this.shootAt });
    }
    this.pad.press(button);
  }

  release(button: Button): void {
    if (button === "shoot" && this.shootAt !== null) {
      // The phone's own measure of the hold goes first, then the kit's release.
      this.send({ kind: "release", heldMs: Math.min(5000, performance.now() - this.shootAt) });
      this.shootAt = null;
      store.setState({ aimingSince: null });
    }
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
      // Words are only for the controller on screen; one kept for later would pop up stale.
      if (message.text && this.streaming) store.setState({ flash: { key: ++this.flashKey, text: message.text, tone: toneOf(message.event) } });
      return;
    }
    const { wanted } = store.getState();
    // The host refused the pick (someone else got there first), so show what it has.
    const refused = wanted !== null && message.pick !== wanted && message.taken.includes(wanted);
    store.setState({ host: message, wanted: refused ? message.pick : (wanted ?? message.pick) });
    // Once the ball has left the hands (the host let a long hold go by itself), the meter stops.
    if (this.shootAt !== null && !message.court?.hasBall) this.release("shoot");
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
