import { PhoneAim } from "@/games/kit/aim/phone-aim";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { BladeId } from "../blades";
import { hostMessageSchema, type PhoneMessage, type SetupStep } from "../protocol";
import { buzz } from "./haptics";
import { useFruitPhone as store } from "./phone-store";

/**
 * Fruit Slicer on the phone. It walks the player through setup, then just
 * aims: the kit streams where the phone points and the host decides what
 * got cut. There is no button to press during play. Joining the room and
 * staying in it is the platform's job.
 */
export class FruitPhone {
  readonly aim: PhoneAim;
  private readonly unsubscribe: () => void;

  constructor(private readonly room: PhoneRoomApi) {
    store.setState({ ...store.getInitialState(), seat: room.seat });
    this.aim = new PhoneAim(room);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.send({ kind: "setup", step: "calibrate" });
  }

  dispose(): void {
    this.aim.dispose();
    this.unsubscribe();
  }

  /** Moves to a setup page and tells the host, so the lobby shows how far along we are. */
  goTo(step: SetupStep): void {
    store.setState({ step, ready: false });
    this.send({ kind: "setup", step });
    // Past calibration the blade is always live on the big screen, so the player can see it while choosing.
    if (step !== "calibrate") this.aim.stream(true);
  }

  chooseBlade(blade: BladeId): void {
    store.setState({ blade });
    this.send({ kind: "blade", blade });
  }

  setReady(ready: boolean): void {
    store.setState({ ready, step: "ready" });
    this.send({ kind: "ready", ready });
    this.aim.stream(true);
  }

  recenter(): void {
    this.aim.recenter();
    navigator.vibrate?.(10);
  }

  private onRoom(event: PhoneRoomEvent): void {
    if (event.type === "rejoined") return this.resend();
    const parsed = hostMessageSchema.safeParse(event.payload);
    if (!parsed.success) return;
    const message = parsed.data;
    if (message.kind === "state") store.setState({ game: message });
    else {
      buzz(message.event);
      store.setState({ flash: { event: message.event, at: performance.now() } });
    }
  }

  /** After a reconnect or a host reload, tell the host everything we had chosen. */
  private resend(): void {
    const { step, blade, ready } = store.getState();
    this.send({ kind: "blade", blade });
    this.send({ kind: "setup", step });
    if (ready) this.send({ kind: "ready", ready });
  }

  private send(payload: PhoneMessage): void {
    this.room.send(payload);
  }
}
