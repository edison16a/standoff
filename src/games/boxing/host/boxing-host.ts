import { CameraKit, type MoveEvent } from "@/games/kit/camera";
import type { HostRoomApi } from "@/platform/games/game-api";
import { BoxingAudio } from "../audio/boxing-audio";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { DirectorInput } from "../render/director";
import { lookFor, type Look } from "../render/models/looks";
import { Banners } from "./banners";
import { FightDriver } from "./fight-driver";
import { useBoxingStore as store } from "./host-store";
import { hudFrom } from "./hud";
import { MenuDemo } from "./menu-demo";
import { PickControl } from "./pick-control";
import { PlayersFeed } from "./players-feed";
import { loadRecords } from "./records";
import { testRoundMs } from "./dev-overrides";
import { finishFight } from "./results";

const HUD_MS = 100;

/**
 * Boxing on the computer, for one room. It owns the camera kit, runs the
 * menus, the fight and the results, and turns what the camera sees into
 * each boxer's defence, punches and mirrored arms. No phones take part.
 */
export class BoxingHost {
  kit: CameraKit | null = null;
  driver: FightDriver | null = null;
  pick: PickControl | null = null;
  readonly audio: BoxingAudio;
  /** Changes with every new fight, so the picture knows to clear the last one. */
  fightId = 0;
  private readonly demo = new MenuDemo();
  private readonly feed = new PlayersFeed();
  private readonly banners = new Banners();
  private readonly listeners = new Set<(event: MatchEvent, match: Match) => void>();
  private stopKit: (() => void) | null = null;
  private stopDriver: (() => void) | null = null;
  private lastHud = 0;
  private lastTick = 0;
  private lastStage = "";

  constructor(private readonly room: HostRoomApi) {
    this.audio = new BoxingAudio(room.audio);
    store.setState({ ...store.getInitialState(), records: loadRecords() });
  }

  get humans(): [boolean, boolean] {
    return [true, store.getState().players === 2];
  }

  looks(): [Look, Look] {
    const [a, b] = store.getState().picks;
    return [lookFor(a), lookFor(b)];
  }

  listen(listener: (event: MatchEvent, match: Match) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  choosePlayers(players: 1 | 2): void {
    this.audio.confirm();
    if (this.kit && this.kit.players !== players) this.dropKit();
    if (!this.kit) {
      this.kit = new CameraKit({ players });
      this.stopKit = this.kit.onMove((event) => this.onMove(event));
    }
    store.setState({ players, screen: "setup" });
  }

  /** Calibration finished: on to choosing boxers. */
  calibrated(): void {
    this.audio.confirm();
    this.openPick();
  }

  openPick(): void {
    this.pick = new PickControl(store.getState().picks, this.humans);
    this.publishPick();
    store.setState({ screen: "pick" });
  }

  choose(id: 0 | 1, index: number): void {
    this.pick?.choose(id, index);
    this.audio.tick();
    this.publishPick();
  }

  lock(id: 0 | 1): void {
    this.pick?.lock(id);
    this.audio.confirm();
    this.publishPick();
  }

  startFight(): void {
    const humans = this.humans;
    this.stopDriver?.();
    this.driver = new FightDriver({ seed: Math.floor(Math.random() * 1e9), slots: [1, humans[1] ? 2 : null], roundMs: testRoundMs() });
    this.stopDriver = this.driver.listen((event) => this.onMatchEvent(event, this.driver!.match));
    this.banners.clear();
    this.audio.setPlayers(humans);
    this.fightId++;
    this.feed.reset();
    this.room.setPlaying(true);
    store.setState({ screen: "fight", result: null, newBest: null });
  }

  /** From the results: the same boxers again, the choice of boxers, or the start. */
  rematch(): void {
    this.startFight();
  }

  newBoxers(): void {
    this.leaveFight();
    this.openPick();
  }

  menu(): void {
    this.leaveFight();
    store.setState({ screen: "players" });
  }

  skip(): void {
    this.driver?.skip(performance.now());
  }

  /** Every animation frame. */
  tick(now: number): void {
    const dt = this.lastTick ? now - this.lastTick : 16;
    this.lastTick = now;
    const screen = store.getState().screen;
    const driver = screen === "fight" || screen === "results" ? this.driver : null;
    if (driver) this.fightFrame(driver, now);
    else for (const event of this.demo.step(dt)) for (const listener of this.listeners) listener(event, this.demo.match);
    if (screen === "pick" && this.pick && this.kit) {
      const locked = this.pick.update([this.kit.moves(1), this.kit.moves(2)], now);
      if (locked.length) this.audio.confirm();
      this.publishPick();
      if (this.pick.done) this.startFight();
    }
    this.audio.frame(dt / 1000);
  }

  /** What the picture needs this frame. */
  directorInput(now: number): DirectorInput {
    const driver = store.getState().screen === "fight" || store.getState().screen === "results" ? this.driver : null;
    if (!driver) return { match: this.demo.match, shot: "menu", shotMs: now, humans: [false, false], mirrors: [null, null] };
    const mirrors = this.feed.mirror(driver, this.kit);
    const shot = driver.stage === "fight" ? "fight" : driver.stage === "replay" ? "replay" : "celebrate";
    return { match: driver.match, shot, shotMs: now - driver.stageSince, humans: [driver.slots[0] !== null, driver.slots[1] !== null], mirrors };
  }

  dispose(): void {
    this.stopDriver?.();
    this.dropKit();
    this.audio.stop();
    this.room.setPlaying(false);
  }

  private fightFrame(driver: FightDriver, now: number): void {
    this.feed.defend(driver, this.kit, now);
    driver.tick(now);
    if (driver.stage !== this.lastStage) {
      this.audio.replay(driver.stage === "replay");
      this.lastStage = driver.stage;
      if (driver.stage === "results") this.showResults(driver);
    }
    if (now - this.lastHud >= HUD_MS) {
      this.lastHud = now;
      store.setState({ hud: hudFrom(driver, this.looks(), this.banners, now) });
    }
  }

  private showResults(driver: FightDriver): void {
    this.room.setPlaying(false);
    store.setState(finishFight(driver, this.looks(), store.getState().records));
  }

  private leaveFight(): void {
    this.stopDriver?.();
    this.stopDriver = null;
    this.driver = null;
    this.lastStage = "";
    this.audio.replay(false);
    this.room.setPlaying(false);
    store.setState({ hud: null });
  }

  private onMatchEvent(event: MatchEvent, match: Match): void {
    this.audio.event(event);
    this.banners.onEvent(event, performance.now(), this.driver ? [this.driver.slots[0] !== null, this.driver.slots[1] !== null] : [false, false]);
    for (const listener of this.listeners) listener(event, match);
  }

  private onMove(event: MoveEvent): void {
    const screen = store.getState().screen;
    if (screen === "fight" && event.type === "punch") this.driver?.punch(event.slot, event.hand, event.style === "straight", event.power);
    if (screen === "pick" && this.pick?.onMove(event)) {
      this.audio.tick();
      this.publishPick();
    }
  }

  private publishPick(): void {
    if (!this.pick) return;
    const { picks, locked, holding } = this.pick.state;
    store.setState({ picks: [...picks], locked: [...locked], holding: [...holding] });
  }

  private dropKit(): void {
    this.stopKit?.();
    this.stopKit = null;
    this.kit?.dispose();
    this.kit = null;
  }
}
