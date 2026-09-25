import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import { Round } from "../engine/round";
import type { Target } from "../engine/target";
import type { GalleryPhase } from "../protocol";
import { GalleryCamera } from "../render/camera";
import type { FinishId } from "../render/models/finishes";
import type { Shooter, StageEvent, StageSource } from "../render/stage-source";
import { Bot, rayThrough } from "./bots";
import type { ShowcasePlan } from "./shots";

/** Four players, each with a different gun, spread across the booth. */
const CREW: readonly { seat: Seat; finish: FinishId; side: number }[] = [
  { seat: 1, finish: "walnut", side: -2.4 },
  { seat: 2, finish: "gold", side: -0.8 },
  { seat: 3, finish: "cherry", side: 0.8 },
  { seat: 4, finish: "forest", side: 2.4 },
];

/** Far above any id the round's spawner hands out, so the planted golden duck never clashes. */
const GOLDEN_ID = 900_001;

/**
 * A round of the real engine with four computer players and no room. It
 * stands in for the host session, so the game's own renderer draws it
 * exactly as it draws a live round.
 */
export class ShowcaseStage implements StageSource {
  readonly camera = new GalleryCamera();
  private readonly live: Round;
  private readonly bots: Bot[];
  private readonly listeners = new Set<(event: StageEvent) => void>();
  /** Targets the bots leave alone for now, so the golden duck crosses the booth before it is shot. */
  private readonly spared = new Set<number>();
  private golden: Target | null = null;
  private lastMs: number | null = null;

  constructor(private readonly plan: ShowcasePlan) {
    // Long enough that the buzzer never goes on camera.
    this.live = new Round({ seats: CREW.map((c) => c.seat), seconds: 90, seed: plan.seed });
    this.bots = CREW.map((c, i) => new Bot(c.seat, c.side, plan.seed * 7 + i * 101, plan.openFire));
  }

  /** `nowMs` is round time here: the director runs the clock. */
  tick(nowMs: number): void {
    const dt = this.lastMs === null ? 0 : Math.max(0, (nowMs - this.lastMs) / 1000);
    this.lastMs = nowMs;
    if (dt === 0) return;
    this.live.tick(dt);
    this.plantGolden();
    const claimed = new Set<number>();
    for (const bot of this.bots) {
      const shot = bot.step(this.live, dt, claimed, this.spared);
      if (shot) this.emit({ type: "shot", shot, colour: playerColor(shot.seat) });
      if (bot.chosen !== null) claimed.add(bot.chosen);
    }
  }

  round(): Round {
    return this.live;
  }

  phase(): GalleryPhase {
    return "playing";
  }

  shooters(): Shooter[] {
    return CREW.map(({ seat, finish }, i) => ({
      seat,
      finish,
      colour: playerColor(seat),
      aim: this.live.probe(rayThrough(this.bots[i]!.aim)).point,
    }));
  }

  listen(listener: (event: StageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * The star of the show. At its cue the duck nearest the planned spot
   * turns golden, so it keeps its place in the chain and never overlaps
   * a neighbour. It is spared until the plan says to shoot it.
   */
  private plantGolden(): void {
    // Only the planted one, so the moment lands on cue. Any the round rolls itself stays a plain duck.
    for (const target of this.live.targets) if (target.kind === "golden" && target !== this.golden) target.kind = "duck";
    const plan = this.plan.golden;
    if (!plan) return;
    const time = this.live.time;
    if (!this.golden && time >= plan.at) {
      // Waits for a duck to come within a stride of the spot, so it never turns golden anywhere else.
      const ducks = this.live.targets.filter((t) => t.lane === plan.lane && t.kind === "duck" && !t.hit && Math.abs(t.x - plan.x) < 0.8);
      const nearest = ducks.sort((a, b) => Math.abs(a.x - plan.x) - Math.abs(b.x - plan.x))[0];
      if (nearest) {
        // A new id, so the renderer builds the golden model instead of reusing the plain one.
        Object.assign(nearest, { id: GOLDEN_ID, kind: "golden" });
        this.golden = nearest;
        this.spared.add(GOLDEN_ID);
      }
    }
    if (time >= plan.shootAt) this.spared.delete(GOLDEN_ID);
  }

  private emit(event: StageEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
