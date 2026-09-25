import { HostAim } from "@/games/kit/aim/host-aim";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { HostAudio } from "../audio/host-audio";
import type { GameEvent } from "../engine/events";
import { SurvivalGame } from "../engine/game";
import type { Offset, PelletHit } from "../engine/shooting";
import type { WeaponId } from "../engine/weapons";
import { phoneMessageSchema, type PhoneMessage } from "../protocol/messages";
import { lowQuality } from "../render/quality";
import { debugStage, exposeForTests } from "./debug";
import { EventRouter } from "./event-router";
import { emptyHud, useSurvivalStore } from "./host-store";
import { Lobby } from "./lobby";
import { PhoneLink } from "./phone-link";
import { armedSeats, buildGun, buildHud, buildScore, buildState } from "./views";

/** What the session needs from the 3D view: raycasts and effects. */
export interface SurvivalView {
  cast(seat: Seat, point: ScreenPoint, offsets: readonly Offset[]): (PelletHit | null)[];
  shotFx(seat: Seat): void;
  react(event: GameEvent): void;
}

/** The longest step the game takes at once, so a hidden tab does not teleport the zombies. */
const MAX_STEP = lowQuality() ? 0.3 : 1 / 20;

/**
 * Zombie Survival on the computer, for one room. It is the referee: the
 * phones send trigger pulls and choices, and everything they see comes
 * back from here. It owns the game, the lobby, the aim and the sound, and
 * the 3D view plugs in while it is on screen.
 */
export class SurvivalHost {
  readonly aim: HostAim;
  game = new SurvivalGame();
  readonly lobby = new Lobby();
  readonly audio: HostAudio;
  private view: SurvivalView | null = null;
  private readonly phones: PhoneLink;
  private readonly router: EventRouter;
  private readonly unsubscribe: () => void;
  private readonly offFire: () => void;
  private lastTick = 0;
  private healed = 0;

  constructor(private readonly room: HostRoomApi) {
    this.aim = new HostAim(room);
    this.audio = new HostAudio(room.audio);
    this.phones = new PhoneLink(room);
    this.router = new EventRouter(this.phones, this.audio, room);
    useSurvivalStore.setState({ hud: emptyHud(), radio: null, banner: null, checkpoint: null, toasts: [], hurtAt: 0 });
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.offFire = this.aim.onFire((seat, point) => this.onFire(seat, point));
    exposeForTests("__zsHost", this);
    this.sync();
  }

  get players() {
    return this.room.players();
  }

  attachView(view: SurvivalView | null): void {
    this.view = view;
  }

  armed(): { seat: Seat; weapon: WeaponId }[] {
    return armedSeats(this.room.players(), this.lobby, this.game);
  }

  aimAt(seat: Seat, nowMs: number): ScreenPoint | null {
    return this.aim.point(seat, nowMs);
  }

  dispose(): void {
    this.unsubscribe();
    this.offFire();
    this.aim.dispose();
    this.audio.dispose();
    this.room.setPlaying(false);
  }

  /** Called every animation frame by the 3D view. */
  tick(nowMs: number): void {
    const dt = this.lastTick ? Math.min(MAX_STEP, (nowMs - this.lastTick) / 1000) : 0;
    this.lastTick = nowMs;
    // With every player gone the world holds still until someone returns.
    if (this.game.running && this.game.squad.present().length > 0) this.game.update(dt);
    for (const event of this.game.drain()) this.route(event);
    this.audio.frame(this.game, dt);
    this.sync();
  }

  /** The Start button: begins with whoever is ready now. Others can join mid run. */
  start(): void {
    if (this.game.running) return;
    const ready = this.lobby.readySeats(this.connectedSeats());
    if (ready.length === 0) return;
    const players = ready.map((seat) => ({ seat, weapon: this.lobby.get(seat).weapon! }));
    this.game = new SurvivalGame();
    this.game.start(players, debugStage());
    this.room.setPlaying(true);
    this.audio.onStart();
  }

  retry(): void {
    this.game.retry();
  }

  /** Ends the run and goes back to the weapon pick, keeping the room. */
  backToLobby(): void {
    this.game = new SurvivalGame();
    this.lobby.clearReady();
    this.room.setPlaying(false);
    this.audio.onLobby();
    useSurvivalStore.setState({ radio: null, banner: null, checkpoint: null, toasts: [] });
  }

  private onFire(seat: Seat, point: ScreenPoint): void {
    const view = this.view;
    if (!view) return;
    if (this.game.fire(seat, (offsets) => view.cast(seat, point, offsets))) view.shotFx(seat);
  }

  private onRoom(event: HostRoomEvent): void {
    switch (event.type) {
      case "joined":
        if (!event.rejoined) {
          // A new phone in a seat someone left: it must not inherit their gun, ready flag or score.
          this.lobby.forget(event.seat);
          this.game.release(event.seat);
        }
        this.game.setPresent(event.seat, true);
        this.phones.forget(event.seat);
        return;
      case "left":
        this.game.setPresent(event.seat, false);
        if (!this.game.running && this.lobby.everyoneReady(this.connectedSeats())) this.start();
        return;
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.onPhone(event.seat, parsed.data);
        return;
      }
      case "resync":
        for (const player of this.room.players()) this.game.setPresent(player.seat, player.connected);
        this.phones.forget();
        return;
      default:
        return;
    }
  }

  private onPhone(seat: Seat, message: PhoneMessage): void {
    switch (message.kind) {
      case "weapon":
        // Mid run a gun change waits for the next ready, which enlists the new gun.
        return this.lobby.pick(seat, message.weapon);
      case "ready": {
        this.lobby.setReady(seat, message.ready);
        const weapon = this.lobby.get(seat).weapon;
        if (this.game.running && message.ready && weapon) this.game.join(seat, weapon);
        if (!this.game.running && this.lobby.everyoneReady(this.connectedSeats())) this.start();
        return;
      }
      case "reload":
        return this.game.reload(seat);
      case "retry":
        return this.retry();
      case "again":
        if (this.game.phase === "escaped") this.backToLobby();
        return;
    }
  }

  private route(event: GameEvent): void {
    this.view?.react(event);
    if (event.type === "stage-clear") this.healed = event.healed;
    this.router.route(event, this.game);
  }

  private connectedSeats(): Seat[] {
    return this.room.players().filter((p) => p.connected).map((p) => p.seat);
  }

  /** Brings the HUD and every phone up to date, sending only what changed. */
  private sync(): void {
    const hud = buildHud(this.room.players(), this.lobby, this.game, this.healed);
    const current = useSurvivalStore.getState().hud;
    if (JSON.stringify(current) !== JSON.stringify(hud)) useSurvivalStore.setState({ hud });
    this.phones.state(buildState(hud));
    for (const player of this.room.players()) {
      if (!player.connected) continue;
      const gun = buildGun(this.game, player.seat);
      if (gun) this.phones.gun(player.seat, gun);
      const score = buildScore(this.game, player.seat);
      if (score) this.phones.score(player.seat, score);
    }
  }
}
