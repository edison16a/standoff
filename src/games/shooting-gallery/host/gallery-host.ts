import { HostAim } from "@/games/kit/aim/host-aim";
import { playerColor } from "@/games/kit/players";
import type { HostRoomApi, HostRoomEvent, Player } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { GalleryAudio } from "../audio/gallery-audio";
import { tableFor } from "../engine/high-scores";
import type { Round, Shot } from "../engine/round";
import { isRoundChoice } from "../engine/rules";
import { winners } from "../engine/scoring";
import { phoneMessageSchema, type GalleryPhase, type PhoneMessage } from "../protocol";
import { GalleryCamera } from "../render/camera";
import type { Shooter, StageEvent, StageSource } from "../render/stage-source";
import { BestStore } from "./best-store";
import { createHostStore, type HostStore } from "./host-store";
import { buildState, displayName } from "./host-view";
import { everyoneReady, freshSetup, lineUp, startHint, type LobbySeat, type SeatSetup } from "./lobby";
import { RoundDriver } from "./round-driver";

/**
 * Shooting Gallery on the computer, for one room. It is the referee: the
 * phones send their aim and trigger pulls, and every score, every hit and
 * every screen they show comes from here. The room itself (connection,
 * seats, names) belongs to the platform.
 */
export class GalleryHost implements StageSource {
  readonly camera = new GalleryCamera();
  readonly aim: HostAim;
  readonly store: HostStore = createHostStore();
  /** Every seat, for the aim kit's calibration overlay. */
  readonly players = (): Player[] => [...this.room.players()];
  private readonly audio: GalleryAudio;
  private readonly driver: RoundDriver;
  private readonly best = new BestStore();
  private readonly setups = new Map<Seat, SeatSetup>();
  private readonly known = new Set<Seat>();
  private readonly listeners = new Set<(event: StageEvent) => void>();
  private readonly offs: (() => void)[] = [];
  private current: GalleryPhase = "lobby";
  private bestPlaces = new Map<Seat, number | null>();
  private winners: Seat[] = [];
  private lastSent = "";

  constructor(private readonly room: HostRoomApi) {
    this.aim = new HostAim(room);
    this.audio = new GalleryAudio(room.audio);
    this.driver = new RoundDriver(this.camera, this.audio, {
      go: () => this.setPhase("playing"),
      over: () => this.finishRound(),
      shot: (shot) => this.onShot(shot),
    });
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.seat(player.seat);
    this.offs.push(this.aim.onFire((seat, point) => this.driver.fire(seat, point)));
    this.offs.push(room.on((event) => this.onRoom(event)));
    this.audio.phase("lobby");
    this.store.setState({ best: tableFor(this.best.current, this.store.getState().seconds) });
    this.publish();
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.aim.dispose();
    this.audio.dispose();
    this.listeners.clear();
    this.room.setPlaying(false);
  }

  /* The stage source the renderer reads. */

  tick(nowMs: number): void {
    this.driver.tick(nowMs);
    this.publish();
  }

  round(): Round {
    return this.driver.round;
  }

  phase(): GalleryPhase {
    return this.current;
  }

  shooters(): Shooter[] {
    const live = this.driver.live;
    const players = this.room.players();
    const seats = live ? live.seats : [...this.known].sort((a, b) => a - b);
    return seats
      .filter((seat) => players[seat - 1]?.connected)
      .map((seat) => {
        const point = this.aim.point(seat);
        const aim = point ? this.driver.round.probe(this.camera.ray(point)).point : null;
        return { seat, finish: this.setupOf(seat).finish, colour: playerColor(seat), aim };
      });
  }

  listen(listener: (event: StageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /* Buttons on the computer. */

  setSeconds(seconds: number): void {
    if (this.current !== "lobby" || !isRoundChoice(seconds)) return;
    this.store.setState({ seconds, best: tableFor(this.best.current, seconds) });
    this.audio.sfx.click();
    this.publish();
  }

  start(): void {
    if (this.current !== "lobby") return;
    const seats = lineUp(this.lobbySeats());
    if (seats.length === 0) return;
    this.driver.begin(seats, this.store.getState().seconds);
    this.bestPlaces = new Map();
    this.winners = [];
    this.room.setPlaying(true);
    this.setPhase("countdown");
  }

  /** From the results back to the lobby, keeping everyone's setup. */
  toLobby(): void {
    if (this.current === "lobby") return;
    this.driver.end();
    this.room.setPlaying(false);
    this.setPhase("lobby");
    this.maybeStart();
  }

  toggleMusic(): void {
    const musicOn = !this.store.getState().musicOn;
    this.audio.setMusic(musicOn);
    this.store.setState({ musicOn });
  }

  /* Room events. */

  private onRoom(event: HostRoomEvent): void {
    switch (event.type) {
      case "joined":
        this.seat(event.seat);
        break;
      case "left":
        this.setupOf(event.seat).ready = false;
        this.abandonIfEmpty();
        break;
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.onPhone(event.seat, parsed.data);
        break;
      }
      case "resync":
        for (const player of this.room.players()) if (player.connected) this.seat(player.seat);
        this.abandonIfEmpty();
        break;
      default:
        break;
    }
    // Names, arrivals and departures all change what phones show, so always resend.
    this.lastSent = "";
    this.publish();
  }

  private onPhone(seat: Seat, message: PhoneMessage): void {
    const setup = this.setupOf(seat);
    this.known.add(seat);
    if (message.kind === "setup") {
      setup.step = message.step;
      if (message.step === "calibrate") setup.ready = false;
    } else if (message.kind === "gun") {
      setup.finish = message.finish;
    } else {
      setup.ready = message.ready && (setup.step === "gun" || setup.step === "ready");
      if (setup.ready) this.audio.sfx.click();
    }
    // In the results, everyone asking to play again goes straight back round.
    if (this.current === "results" && everyoneReady(this.lobbySeats())) this.toLobby();
    else this.maybeStart();
  }

  private seat(seat: Seat): void {
    this.known.add(seat);
    this.setupOf(seat);
  }

  private setupOf(seat: Seat): SeatSetup {
    let setup = this.setups.get(seat);
    if (!setup) this.setups.set(seat, (setup = freshSetup()));
    return setup;
  }

  private lobbySeats(): LobbySeat[] {
    const players = this.room.players();
    return [...this.known].map((seat) => ({ seat, connected: players[seat - 1]?.connected ?? false, ...this.setupOf(seat) }));
  }

  private maybeStart(): void {
    if (this.current === "lobby" && everyoneReady(this.lobbySeats())) this.start();
  }

  /** Everyone in the round has gone, so there is nobody to play for. */
  private abandonIfEmpty(): void {
    const live = this.driver.live;
    if (!live || this.current === "results") return;
    const players = this.room.players();
    if (live.seats.some((seat) => players[seat - 1]?.connected)) return;
    this.driver.end();
    this.room.setPlaying(false);
    this.setPhase("lobby");
  }

  /* The round's moments. */

  private onShot(shot: Shot): void {
    this.emit({ type: "shot", shot, colour: playerColor(shot.seat) });
    if (shot.kind) this.room.send(shot.seat, { kind: "scored", points: shot.points, target: shot.kind, bull: shot.bull });
  }

  private finishRound(): void {
    const live = this.driver.live;
    if (!live) return;
    const standings = live.standings();
    const seconds = this.store.getState().seconds;
    this.winners = winners(standings);
    const at = Date.now();
    const entries = standings.map((s) => ({ name: displayName(this.room.players(), s.seat), score: s.score, accuracy: s.accuracy, seconds, at }));
    const places = this.best.add(entries);
    this.bestPlaces = new Map(standings.map((s, i) => [s.seat, places[i] ?? null]));
    for (const setup of this.setups.values()) setup.ready = false;
    this.store.setState({ best: tableFor(this.best.current, seconds) });
    this.setPhase("results");
  }

  private setPhase(phase: GalleryPhase): void {
    this.current = phase;
    this.audio.phase(phase);
    this.emit({ type: "phase", phase, winnerColours: phase === "results" ? this.winners.map(playerColor) : [] });
    this.publish();
  }

  private emit(event: StageEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  /** Sends the phones their state and refreshes the computer's HUD, but only when something changed. */
  private publish(): void {
    const seats = this.lobbySeats();
    const game = buildState({
      phase: this.current,
      seconds: this.store.getState().seconds,
      players: this.room.players(),
      known: this.known,
      setups: this.setups,
      round: this.driver.live,
      bestPlaces: this.bestPlaces,
      winners: this.winners,
    });
    const serialized = JSON.stringify(game);
    if (serialized === this.lastSent) return;
    this.lastSent = serialized;
    this.room.send("all", game);
    this.store.setState({ game, canStart: this.current === "lobby" && lineUp(seats).length > 0, hint: startHint(seats) });
  }
}
