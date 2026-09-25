import { HostPad } from "@/games/kit/pad/host-pad";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { Difficulty } from "../engine/bots/brain";
import { Rng } from "../engine/rng";
import { pickStage } from "../engine/stages";
import type { MatchState } from "../engine/types";
import { phoneMessageSchema, type PhoneMessage, type RoomPhase } from "../protocol";
import { fighterColours } from "../render/colors";
import { buzzesFor } from "./buzz";
import { callout, type Callout } from "./callouts";
import { DemoMatch } from "./demo";
import { useBrawlStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver, type StepHooks } from "./match-driver";
import { PhoneLink } from "./phone-link";
import { nameFor, publish, roomPhaseOf } from "./publish";

/** The overlay and the phones are refreshed this often; the canvas every frame. */
const HUD_MS = 100;
const BANNER_MS = 2200;

/**
 * Brawl Battle on the computer, for one room. It keeps the lobby, runs
 * the match, directs the sound and the announcer, and it is the referee:
 * phones send their pad, and everything they show comes back from here.
 */
export class BrawlHost {
  readonly lobby = new Lobby();
  driver: MatchDriver | null = null;
  readonly audio: SoundDirector;
  private readonly demo = new DemoMatch();
  private readonly pad: HostPad;
  private readonly phones: PhoneLink;
  private readonly unsubscribe: () => void;
  private readonly unpress: () => void;
  private hits: number[] = [];
  private lastHud = 0;
  private lastFrame = 0;
  private turn = 0;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPhase: RoomPhase = "lobby";
  /** Browser tests on slow machines run the match faster than real time. Always 1 in play. */
  turbo = 1;

  constructor(private readonly room: HostRoomApi) {
    this.audio = new SoundDirector(room.audio);
    this.pad = new HostPad(room);
    this.phones = new PhoneLink(room);
    store.setState({ ...store.getInitialState() });
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.unpress = this.pad.onPress((seat, button, down) => this.driver?.press(seat, button, down));
    this.audio.setPhase("lobby", null);
    this.refresh(performance.now());
  }

  dispose(): void {
    this.unsubscribe();
    this.unpress();
    this.pad.dispose();
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): RoomPhase {
    return roomPhaseOf(this.driver);
  }

  /** The match on screen: the real one, or the demo behind the lobby. */
  get match(): MatchState {
    return this.driver?.state ?? this.demo.state;
  }

  get alpha(): number {
    return this.driver?.alpha ?? this.demo.alpha;
  }

  nameOf(id: number): string {
    return nameFor(this.match, id, this.room.players());
  }

  setBots(count: number): void {
    this.lobby.setBots(count);
    this.refresh(performance.now());
  }

  setDifficulty(difficulty: Difficulty): void {
    this.lobby.setDifficulty(difficulty);
    this.refresh(performance.now());
  }

  /** Starts a match on a stage picked at random, computers filling the places asked for. */
  start(): void {
    if (this.phase === "countdown" || this.phase === "fight" || this.phase === "game") return;
    if (!this.lobby.canStart()) return;
    const seed = Math.floor(Math.random() * 1e9);
    const stage = pickStage(new Rng(seed));
    this.driver = new MatchDriver(this.lobby.entrants(), { seed, stage, difficulty: this.lobby.difficulty });
    for (const player of this.room.players()) if (!player.connected) this.driver.setOnline(player.seat, false);
    this.hits = this.driver.state.fighters.map(() => 0);
    this.room.setPlaying(true);
    this.phones.forget();
    this.refresh(performance.now());
  }

  /** From the results: back to the lobby, keeping everyone's choices. */
  backToLobby(): void {
    this.driver = null;
    this.room.setPlaying(false);
    this.refresh(performance.now());
  }

  /** Called every animation frame with the renderer's step hooks. Returns the game time that passed. */
  tick(nowMs: number, hooks: StepHooks & { before(): void; after(): void }): number {
    const realDt = this.lastFrame ? (nowMs - this.lastFrame) / 1000 : 0;
    this.lastFrame = nowMs;
    let dt = 0;
    const driver = this.driver;
    if (driver) {
      const after = (m: MatchState) => {
        hooks.after();
        for (const e of m.events) this.onMatchEvent(e, m);
      };
      for (let i = 0; i < this.turbo; i++) dt += driver.advance(realDt, (seat) => this.pad.stick(seat, nowMs), { before: hooks.before, after });
      this.audio.frame(driver.state);
    } else dt = this.demo.advance(realDt, hooks.before, hooks.after);
    const phase = this.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.audio.setPhase(phase, this.driver?.state.stage.id ?? null);
      // The results are a good moment for someone new to scan in for the next match.
      if (phase === "results") this.room.setPlaying(false);
      this.refresh(nowMs);
    }
    if (nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return dt;
  }

  private onMatchEvent(e: MatchState["events"][number], m: MatchState): void {
    this.audio.event(e, m);
    for (const b of buzzesFor(e, m)) this.phones.buzz(b.seat, b.kind);
    if (e.type === "hit") this.hits[e.target] = (this.hits[e.target] ?? 0) + 1;
    if (e.type === "game") this.driver?.slowMo(0.35, 1.1);
    const words = callout(e, m, (id) => this.nameOf(id), this.turn++);
    if (words?.say) this.audio.announcer.say(words.say.text, words.say.priority);
    if (words?.banner) this.showBanner(words.banner, m);
    if (e.type === "hit" || e.type === "ko" || e.type === "game" || e.type === "ultReady") this.refresh(performance.now());
  }

  private showBanner(banner: NonNullable<Callout["banner"]>, m: MatchState): void {
    const colour = banner.fighter !== null ? (fighterColours(m.fighters)[banner.fighter]?.colour ?? "#ffffff") : "#ffffff";
    const key = this.turn;
    store.setState({ banner: { key, text: banner.text, sub: banner.sub, colour } });
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      if (store.getState().banner?.key === key) store.setState({ banner: null });
    }, BANNER_MS);
  }

  private onRoom(event: HostRoomEvent): void {
    switch (event.type) {
      case "joined":
        this.lobby.connect(event.seat);
        this.driver?.setOnline(event.seat, true);
        this.phones.forget(event.seat);
        break;
      case "left":
        this.lobby.disconnect(event.seat);
        this.driver?.setOnline(event.seat, false);
        break;
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.onPhone(event.seat, parsed.data);
        return;
      }
      case "resync":
        for (const player of this.room.players()) {
          if (player.connected) this.lobby.connect(player.seat);
          else this.lobby.disconnect(player.seat);
          this.driver?.setOnline(player.seat, player.connected);
        }
        this.phones.forget();
        break;
      default:
        break;
    }
    this.refresh(performance.now());
  }

  private onPhone(seat: number, message: PhoneMessage): void {
    if (message.kind === "pick") this.lobby.pick(seat, message.character);
    else if (message.kind === "ready") this.lobby.setReady(seat, message.ready);
    else this.phones.forget(seat);
    this.refresh(performance.now());
  }

  private refresh(nowMs: number): void {
    this.lastHud = nowMs;
    publish({ nowMs, players: this.room.players(), lobby: this.lobby, driver: this.driver, phones: this.phones, hits: this.hits });
  }
}
