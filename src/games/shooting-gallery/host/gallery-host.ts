import { HostAim } from "@/games/kit/aim/host-aim";
import { playerColor } from "@/games/kit/players";
import type { HostRoomApi, HostRoomEvent, Player } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { GalleryAudio } from "../audio/gallery-audio";
import { tableFor } from "../engine/high-scores";
import type { Round, Shot } from "../engine/round";
import { isRoundChoice } from "../engine/rules";
import { winners } from "../engine/scoring";
import { phoneMessageSchema, type GalleryPhase } from "../protocol";
import { GalleryCamera } from "../render/camera";
import type { Shooter, StageEvent, StageSource } from "../render/stage-source";
import { boardEntries } from "./best-entries";
import { BestStore } from "./best-store";
import { DropoutWatch } from "./dropout-watch";
import { createHostStore, type HostStore } from "./host-store";
import { everyoneReady, lineUp } from "./lobby";
import { Publisher } from "./publisher";
import { RoundDriver } from "./round-driver";
import { SeatBook } from "./seat-book";

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
  private readonly seats = new SeatBook();
  private readonly listeners = new Set<(event: StageEvent) => void>();
  private readonly offs: (() => void)[] = [];
  private current: GalleryPhase = "lobby";
  private bestPlaces = new Map<Seat, number | null>();
  private winners: Seat[] = [];
  private readonly publisher: Publisher;
  private readonly dropouts = new DropoutWatch(
    () => this.everyoneGone(),
    () => this.abandon(),
  );

  constructor(private readonly room: HostRoomApi) {
    this.aim = new HostAim(room);
    this.publisher = new Publisher(room, this.store);
    this.audio = new GalleryAudio(room.audio);
    this.driver = new RoundDriver(this.camera, this.audio, {
      go: () => this.setPhase("playing"),
      over: () => this.finishRound(),
      shot: (shot) => this.onShot(shot),
    });
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.seats.seat(player.seat);
    this.offs.push(this.aim.onFire((seat, point) => this.driver.fire(seat, point)));
    this.offs.push(room.on((event) => this.onRoom(event)));
    this.audio.phase("lobby");
    this.store.setState({ best: tableFor(this.best.current, this.store.getState().seconds) });
    this.publish();
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.dropouts.dispose();
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

  /** A gun for everyone in the round, or in the lobby for everyone here. */
  shooters(): Shooter[] {
    const players = this.room.players();
    const seats = this.driver.live?.seats ?? [...this.seats.known].sort((a, b) => a - b);
    return seats
      .filter((seat) => players[seat - 1]?.connected)
      .map((seat) => {
        const point = this.aim.point(seat);
        const aim = point ? this.driver.round.probe(this.camera.ray(point)).point : null;
        return { seat, finish: this.seats.seat(seat).finish, colour: playerColor(seat), aim };
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
    const seats = lineUp(this.seats.lobby(this.room.players()));
    if (seats.length === 0) return;
    this.driver.begin(seats, this.store.getState().seconds);
    this.bestPlaces = new Map();
    this.winners = [];
    this.room.setPlaying(true);
    this.setPhase("countdown");
  }

  /** Back to the lobby from the results, keeping everyone's setup. */
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
    if (event.type === "joined") this.seats.seat(event.seat);
    if (event.type === "left") {
      this.seats.unready(event.seat);
      this.dropouts.check();
      // The one player everyone was waiting for may be the one who left.
      this.afterSetupChange();
    }
    if (event.type === "message") {
      const parsed = phoneMessageSchema.safeParse(event.payload);
      // Aim streams in from every phone many times a second. It changes
      // nothing the phones show, so it must not resend everyone's state.
      if (!parsed.success) return;
      if (this.seats.apply(event.seat, parsed.data)) this.audio.sfx.click();
      this.afterSetupChange();
    }
    if (event.type === "resync") {
      for (const player of this.room.players()) if (player.connected) this.seats.seat(player.seat);
      this.dropouts.check();
    }
    // Names, arrivals and departures all change what phones show, so always resend.
    this.publisher.forget();
    this.publish();
  }

  private afterSetupChange(): void {
    // In the results, everyone asking to play again goes straight back round.
    if (this.current === "results" && everyoneReady(this.seats.lobby(this.room.players()))) this.toLobby();
    else this.maybeStart();
  }

  private maybeStart(): void {
    if (this.current === "lobby" && everyoneReady(this.seats.lobby(this.room.players()))) this.start();
  }

  private everyoneGone(): boolean {
    const live = this.driver.live;
    const players = this.room.players();
    return live !== null && this.current !== "results" && !live.seats.some((seat) => players[seat - 1]?.connected);
  }

  /** The whole round dropped out and nobody came back, so there is nobody to play for. */
  private abandon(): void {
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
    // Only players who typed a name go on the board. The results say so.
    const entries = boardEntries(standings, this.room.players(), seconds, Date.now());
    const places = entries.length > 0 ? this.best.add(entries.map((e) => e.entry)) : [];
    this.bestPlaces = new Map(entries.map((e, i) => [e.seat, places[i] ?? null]));
    this.winners = winners(standings);
    this.seats.unreadyAll();
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

  private publish(): void {
    const players = this.room.players();
    const input = {
      phase: this.current,
      seconds: this.store.getState().seconds,
      players,
      known: this.seats.known,
      setups: this.seats.all,
      round: this.driver.live,
      bestPlaces: this.bestPlaces,
      winners: this.winners,
    };
    this.publisher.publish(input, this.seats.lobby(players));
  }
}
