import * as THREE from "three";
import type { PlayerEvent, PlayerState } from "../engine/player";
import type { Level } from "../engine/types";
import { Avatar, type Skin } from "./avatar";
import { Backdrop } from "./backdrop";
import { Effects } from "./effects";
import { LevelView } from "./level-view";
import { Post, type Viewport } from "./post";
import { Signs } from "./signs";
import { themeFor } from "./themes";
import { ViewCamera, type Framing } from "./view-camera";

export interface DrawPlayer {
  state: PlayerState | null;
  /** What happened to this player since the last frame. */
  events: readonly PlayerEvent[];
  attempt: number;
  /** A new attempt began since the last frame, so the camera jumps back. */
  restarted: boolean;
  /** Practice checkpoints, drawn as diamonds. */
  checkpoints?: readonly { x: number; y: number }[];
}

export interface DrawInput {
  time: number;
  dt: number;
  /** 1 on each beat of the music, fading to 0. */
  pulse: number;
  players: DrawPlayer[];
  /** Which player each view follows, top view first. */
  views: number[];
}

/** Skins by player: red with gold trim, green with cyan, like the seat colours. */
export const SKINS: Skin[] = [
  { main: 0xff4757, trim: 0xffe14d },
  { main: 0x2ed573, trim: 0x5ff3ff },
];

/**
 * Draws Cube Game: the level, the backdrop, every player and their
 * sparks, in one view or two stacked for split screen. Each view shows
 * its own player solid and the rival as a ghost.
 */
export class GameRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly post: Post;
  private readonly effects = new Effects();
  private readonly cameras = [new ViewCamera(), new ViewCamera()];
  private readonly avatars: Avatar[];
  private readonly ghosts: Avatar[];
  private readonly signs = new Signs();
  private level: LevelView | null = null;
  private backdrop: Backdrop | null = null;
  private levelId: string | null = null;
  private size = { width: 1, height: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.post = new Post(this.renderer, this.scene);
    this.scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x201040, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 8, 10);
    this.scene.add(key, this.effects.group, this.signs.group);
    this.avatars = SKINS.map((skin) => new Avatar(skin));
    this.ghosts = SKINS.map((skin) => new Avatar(skin, true));
    for (const avatar of [...this.avatars, ...this.ghosts]) this.scene.add(avatar.group);
  }

  setLevel(level: Level): void {
    if (this.levelId === level.id) return;
    this.levelId = level.id;
    this.level?.dispose();
    this.backdrop?.dispose();
    if (this.level) this.scene.remove(this.level.group);
    if (this.backdrop) this.scene.remove(this.backdrop.group);
    const theme = themeFor(level.theme);
    this.level = new LevelView(level, theme);
    this.backdrop = new Backdrop(theme, level.endX);
    this.scene.add(this.backdrop.group, this.level.group);
    this.scene.background = new THREE.Color(theme.skyHigh);
    this.effects.clear();
  }

  /** Showcase shots frame the players closer than play does. */
  setFraming(framing: Framing | null): void {
    for (const camera of this.cameras) camera.framing = framing;
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.size = { width, height };
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.post.setSize(width, height, pixelRatio);
  }

  /** Moves everything on by a frame and, unless `render` is false, draws it. */
  draw(input: DrawInput, render = true): void {
    const { players, views, dt, time, pulse } = input;
    players.forEach((player, i) => {
      if (player.restarted && player.state) this.cameras[views.indexOf(i)]?.snap(player.state);
      for (const event of player.events) {
        if (player.state) this.effects.event(event, player.state, SKINS[i]!);
        if (event.type === "land") this.avatars[i]?.land();
        const camera = this.cameras[views.indexOf(i)];
        if (event.type === "death") camera?.shake(1);
        if (event.type === "portal" || event.type === "finish") camera?.punch();
      }
      if (player.state) this.effects.trail(player.state, SKINS[i]!, dt);
      this.avatars[i]?.update(player.state, dt);
      this.ghosts[i]?.update(players.length > 1 ? player.state : null, dt);
      this.signs.setAttempt(i, player.attempt);
      this.signs.setCheckpoints(i, player.checkpoints ?? []);
    });
    for (let i = players.length; i < this.avatars.length; i++) {
      this.avatars[i]!.update(null, dt);
      this.ghosts[i]!.update(null, dt);
    }
    this.effects.update(dt);
    this.level?.update(time, pulse);

    const { width, height } = this.size;
    const tall = height / views.length;
    const viewports: Viewport[] = views.map((p, v) => {
      const camera = this.cameras[v]!;
      camera.setAspect(width / tall);
      camera.follow(players[p]?.state ?? null, dt, time);
      return {
        camera: camera.camera,
        x: 0,
        y: v * tall,
        width,
        height: tall,
        prepare: () => this.prepare(p, players, camera, time, pulse),
      };
    });
    this.effects.particles.setScale(tall / (2 * Math.tan(THREE.MathUtils.degToRad(13))));
    if (render) this.post.draw(viewports);
  }

  /** Before drawing one view: its player solid, rivals as ghosts, its own sign, and the sky behind its camera. */
  private prepare(p: number, players: DrawPlayer[], camera: ViewCamera, time: number, pulse: number): void {
    this.avatars.forEach((avatar, i) => (avatar.group.visible = i === p && !!players[i]?.state && !players[i]!.state!.dead));
    this.ghosts.forEach((ghost, i) => (ghost.group.visible = i !== p && !!players[i]?.state && !players[i]!.state!.dead));
    this.signs.show(p, time);
    this.level?.showUsed(players[p]?.state ? { pads: players[p]!.state!.usedPads, orbs: players[p]!.state!.usedOrbs } : null);
    this.backdrop?.update(camera.centerX, camera.horizonAt(160, 150.5), time, pulse);
  }

  dispose(): void {
    this.level?.dispose();
    this.backdrop?.dispose();
    this.effects.dispose();
    this.signs.dispose();
    for (const avatar of [...this.avatars, ...this.ghosts]) avatar.dispose();
    this.post.dispose();
    this.renderer.dispose();
  }
}
