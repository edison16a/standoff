import { HostAim } from "@/games/kit/aim/host-aim";
import { playerColor } from "@/games/kit/players";
import type { HostRoomApi, HostRoomEvent, Player } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { MatchEvent, MatchPhase, Seat } from "../engine/events";
import type { Settings } from "../engine/settings";
import { phoneMessageSchema, type PhoneMessage } from "../protocol";
import type { RenderFrame } from "../render/fruit-renderer";
import { LOBBY_HUD, useFruitStore } from "./host-store";
import { PhoneLink, phoneState } from "./phone-link";
import { RoundDriver } from "./round-driver";
import { buzzFor, roundHud } from "./round-view";
import { SeatBook } from "./seat-book";
import type { Screen } from "./screen";

/**
 * Fruit Slicer on the computer, for one room. It is the referee: phones
 * send their aim and their choices, and everything they see comes back
 * from here. It runs the lobby and the rounds, and passes every event to
 * the screen, the sound and the phones.
 */
export class FruitHost {
  readonly aim: HostAim;
  private readonly seats = new SeatBook();
  private readonly driver = new RoundDriver();
  private readonly phones: PhoneLink;
  private readonly sound: SoundDirector;
  private readonly unsubscribe: () => void;
  private screen: Screen | null = null;
  /** Events raised outside the frame loop, such as a round ended because everyone left. */
  private pending: MatchEvent[] = [];
  private hudKey = "";
  private lastCountdown = 0;
  /** Names as the round began, so a seat someone else takes over mid round keeps its player's name on the board. */
  private roster = new Map<Seat, string>();

  constructor(private readonly room: HostRoomApi) {
    this.aim = new HostAim(room);
    this.phones = new PhoneLink(room);
    this.sound = new SoundDirector(room.audio);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    useFruitStore.setState({ hud: LOBBY_HUD });
    this.syncSeats();
  }

  /** Every seat, for the aim kit's calibration targets. */
  players = (): Player[] => [...this.room.players()];

  nameOf = (seat: Seat): string => this.room.players().find((p) => p.seat === seat)?.name ?? `Player ${seat}`;

  /** The name on the scoreboard: as it was when the round began, so a seat that changes hands keeps its player's name. */
  private boardName = (seat: Seat): string => this.roster.get(seat) ?? this.nameOf(seat);

  /** The canvas hands itself over once it is up, and takes itself back when it goes. */
  attach(screen: Screen): () => void {
    this.screen = screen;
    return () => {
      if (this.screen === screen) this.screen = null;
    };
  }

  setSettings(patch: Partial<Settings>): void {
    if (this.driver.inRound) return;
    useFruitStore.setState((state) => ({ settings: { ...state.settings, ...patch } }));
    this.sound.sfx.click();
  }

  /** Seats that would play if a round started now. */
  private contenders(): Seat[] {
    return this.seats.readyAmong(this.room.players().filter((p) => p.connected).map((p) => p.seat));
  }

  /** Starts a round with everyone who is ready. Also serves as Play again. */
  start(): void {
    const seats = this.contenders();
    if (seats.length === 0 || this.driver.inRound) return;
    this.sound.sfx.click();
    this.sound.roundStarting();
    this.screen?.calm();
    this.screen?.reset();
    this.driver.start(useFruitStore.getState().settings, seats);
    this.roster = new Map(seats.map((seat) => [seat, this.nameOf(seat)]));
    this.lastCountdown = 0;
    // The join code tucks away as soon as the countdown starts, not when the first fruit flies.
    this.room.setPlaying(true);
  }

  toLobby(): void {
    this.driver.stop();
    this.sound.sfx.click();
    this.sound.lobby();
    this.screen?.calm();
    this.room.setPlaying(false);
  }

  dispose(): void {
    this.unsubscribe();
    this.aim.dispose();
    this.sound.stop();
    this.room.setPlaying(false);
  }

  /** One animation frame: move everything, react to what happened, and bring every screen up to date. */
  tick(dt: number, nowMs: number, halfWidth: number): RenderFrame {
    this.driver.halfWidth = halfWidth;
    const inputs = this.room
      .players()
      .filter((p) => p.connected)
      .map((p) => {
        const setup = this.seats.get(p.seat);
        return { seat: p.seat, point: this.aim.point(p.seat, nowMs), blade: setup.blade, ready: setup.ready };
      });
    const { events, frame } = this.driver.step(dt, inputs);
    const all = this.pending.length ? [...this.pending, ...events] : events;
    this.pending = [];
    this.route(all, halfWidth);
    this.sound.bombs(frame.bodies.filter((body) => body.kind === "bomb").length);
    this.publish();
    return frame;
  }

  private route(events: readonly MatchEvent[], halfWidth: number): void {
    const practice = !this.driver.match;
    for (const event of events) {
      if (event.type === "score") this.screen?.score(event);
      else if (event.type === "phase") this.onPhase(event.phase);
      else if (event.type !== "stun") this.screen?.react(event);
      // Practice cuts in the lobby are just for fun, so the phones stay still.
      const buzz = practice ? null : buzzFor(event);
      if (buzz) this.phones.buzz(buzz.seat, buzz.buzz);
    }
    this.sound.react(events, halfWidth);
  }

  private onPhase(phase: MatchPhase): void {
    if (phase === "over") {
      // Between rounds the code comes back, so someone new can join for the next one.
      this.room.setPlaying(false);
      const winners = this.driver.match?.winners() ?? [];
      if (winners.length) this.screen?.celebrate([...winners.map(playerColor), "#ffd23a", "#ffffff"]);
    }
  }

  /** Writes the HUD to the store and each phone's state to its phone, only when something changed. */
  private publish(): void {
    const hud = roundHud(this.driver.match, this.boardName);
    if (hud.countdown > 0 && hud.countdown !== this.lastCountdown) this.sound.countdown();
    this.lastCountdown = hud.countdown;
    const key = JSON.stringify(hud);
    if (key !== this.hudKey) {
      this.hudKey = key;
      useFruitStore.setState({ hud });
    }
    for (const player of this.room.players()) {
      if (player.connected) this.phones.sendState(player.seat, phoneState(player.seat, hud, this.driver.match));
    }
  }

  private onRoom(event: HostRoomEvent): void {
    switch (event.type) {
      case "players":
        return this.syncSeats();
      case "joined":
        this.phones.forget(event.seat);
        // A different phone in a seat from this round starts fresh next round, never on the last player's score.
        if (!event.rejoined) this.driver.match?.retire(event.seat);
        return this.syncSeats();
      case "left":
        this.drop(event.seat);
        return this.syncSeats();
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.onPhone(event.seat, parsed.data);
        return;
      }
      case "resync":
        // Phones may have come and gone while we were away. Ask the platform, and resend everything.
        for (const player of this.room.players()) if (!player.connected) this.drop(player.seat);
        this.phones.forget();
        return this.syncSeats();
      case "online":
        return;
    }
  }

  /** A phone went away. Its score stays, and a round nobody is left in ends. */
  private drop(seat: Seat): void {
    this.seats.leave(seat);
    this.driver.match?.setActive(seat, false);
    if (this.driver.inRound && this.driver.match?.activeCount === 0) this.pending.push(...this.driver.finish());
  }

  private onPhone(seat: Seat, message: PhoneMessage): void {
    if (message.kind === "setup") this.seats.setStep(seat, message.step);
    if (message.kind === "blade") this.seats.setBlade(seat, message.blade);
    if (message.kind === "ready") {
      this.seats.setReady(seat, message.ready);
      // A player who dropped out of this round and came back picks up where they left off.
      if (message.ready && this.driver.inRound) this.driver.match?.setActive(seat, true);
    }
    this.syncSeats();
  }

  private syncSeats(): void {
    const seats = this.room.players().map((p) => ({ seat: p.seat, name: p.name, connected: p.connected, ...this.seats.get(p.seat) }));
    useFruitStore.setState({ seats });
  }
}
