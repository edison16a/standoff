import type { SoundDirector } from "../audio/sound-director";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { isGreen } from "../engine/shot-model";
import { BannerBoard, REPLAY_SOUNDS, slowForMoment } from "./banners";
import type { Buzzer } from "./buzzer";
import { banner } from "./callouts";
import type { MatchDriver } from "./match-driver";

type Listener = (event: MatchEvent) => void;

/** The events that change what the overlay or the phones should show straight away. */
const PROMPT = new Set<MatchEvent["type"]>(["score", "win", "go", "check", "checkUp", "foul", "andOne", "freeThrow"]);

interface FanoutDeps {
  audio: SoundDirector;
  buzzer: Buzzer;
  nameOf: (id: number) => string;
  /** Pushes the overlay and the phones now instead of at the next beat. */
  refresh: () => void;
}

/**
 * Sends each match event where it belongs: the sound, the renderer's
 * effects, the phones' buzzes, the banners and the slow motion beats.
 * The demo behind the lobby and the replay only reach some of them, so
 * neither can buzz a phone or change the game.
 */
export class EventFanout {
  private readonly listeners = new Set<Listener>();
  private readonly banners = new BannerBoard();

  constructor(private readonly deps: FanoutDeps) {}

  /** Match events for the renderer's effects. */
  listen(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The demo game behind the lobby only feeds the picture. */
  demo(event: MatchEvent): void {
    this.effects(event);
  }

  live(event: MatchEvent, driver: MatchDriver): void {
    const m = driver.match;
    const { audio, buzzer, nameOf, refresh } = this.deps;
    audio.event(event, m);
    this.effects(event);
    buzzer.onEvent(event, m, driver.athleteBySeat);
    slowForMoment(event, driver);
    if (event.type === "shot" && isGreen(event.grade) && driver.pilotOf(event.id) !== null) audio.green(event.grade === "gold");
    const shown = banner(event, m, nameOf, this.banners.count);
    if (shown) this.banners.show(shown);
    if (PROMPT.has(event.type)) refresh();
  }

  /** The replay plays the ball's and the players' sounds and the effects, and nothing that changes the game. */
  replay(event: MatchEvent, ghost: Match): void {
    if (REPLAY_SOUNDS.has(event.type)) this.deps.audio.event(event, ghost);
    this.effects(event);
  }

  dispose(): void {
    this.banners.dispose();
  }

  private effects(event: MatchEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
