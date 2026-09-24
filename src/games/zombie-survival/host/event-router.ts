import type { HostRoomApi } from "@/platform/games/game-api";
import type { HostAudio } from "../audio/host-audio";
import type { GameEvent } from "../engine/events";
import type { SurvivalGame } from "../engine/game";
import { stage, storyBeat } from "../engine/stages";
import { isBoss, KINDS } from "../engine/zombie-kinds";
import type { BuzzEvent } from "../protocol/messages";
import { useSurvivalStore, type Toast } from "./host-store";
import type { PhoneLink } from "./phone-link";

/** How long an achievement stays up. */
const TOAST_MS = 4200;
/** At most this many achievements on screen at once. */
const TOAST_MAX = 4;

/**
 * Sends each game event where it belongs: the sound, the phone that
 * should buzz, and the radio and achievements on screen.
 */
export class EventRouter {
  private nextId = 1;

  constructor(
    private readonly phones: PhoneLink,
    private readonly audio: HostAudio,
    private readonly room: HostRoomApi,
  ) {}

  route(event: GameEvent, game: SurvivalGame): void {
    this.audio.react(event, game);
    switch (event.type) {
      case "hit":
        if (!event.killed) this.buzz(event.seat, event.part === "weak" ? "weak" : "hit");
        return;
      case "kill":
        return this.buzz(event.seat, "kill");
      case "dry":
        return this.buzz(event.seat, "dry");
      case "reloaded":
        return this.buzz(event.seat, "reloaded");
      case "swing":
        useSurvivalStore.setState({ hurtAt: performance.now() });
        for (const m of game.squad.present()) this.buzz(m.seat, "hurt");
        return;
      case "radio":
        useSurvivalStore.setState({ radio: { id: this.nextId++, from: event.line.from, text: event.line.text } });
        return;
      case "achievement":
        return this.toast({ id: this.nextId++, title: event.title, text: event.text, seat: event.seat });
      case "phase":
        if (event.phase !== "fight") return;
        this.banner(`Stage ${event.stage}`, stage(event.stage).title, "stage");
        // Each note is for its own checkpoint. After the chopper there is none, so an old one must not come back.
        useSurvivalStore.setState({ checkpoint: null });
        return;
      case "spawn":
        if (isBoss(event.kind)) this.banner(KINDS[event.kind].name, "Shoot the glowing joints", "boss");
        return;
      case "stage-clear":
        // Only the story's big moments stop the show. Any other checkpoint is a quick note, and on you go.
        if (storyBeat(event.stage)) this.banner("Checkpoint", event.healed > 0 ? `Supplies found. Health up ${event.healed}` : "Stage cleared", "checkpoint");
        else useSurvivalStore.setState({ checkpoint: { id: this.nextId++, stage: event.stage, title: stage(event.stage).title, healed: event.healed } });
        return;
      default:
        return;
    }
  }

  private banner(title: string, sub: string, tone: "stage" | "boss" | "checkpoint"): void {
    useSurvivalStore.setState({ banner: { id: this.nextId++, title, sub, tone } });
  }

  private buzz(seat: number, event: BuzzEvent): void {
    const player = this.room.players().find((p) => p.seat === seat);
    if (player?.connected) this.phones.send(seat, { kind: "buzz", event });
  }

  private toast(toast: Toast): void {
    const toasts = [...useSurvivalStore.getState().toasts, toast].slice(-TOAST_MAX);
    useSurvivalStore.setState({ toasts });
    setTimeout(() => {
      useSurvivalStore.setState((state) => ({ toasts: state.toasts.filter((t) => t.id !== toast.id) }));
    }, TOAST_MS);
  }
}
