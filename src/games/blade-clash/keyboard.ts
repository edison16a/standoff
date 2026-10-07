import { ButtonKeys, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer, type StagePointer } from "@/platform/keyboard";
import { cut, moveAt, parryPoint, slashFrom, thrust, viewPoint, type CutName, type SwordMove } from "./keyboard-moves";
import { controlFromAim, type AimPoint } from "./motion/sword-aim";
import type { Slot } from "./players";
import { controllerStateSchema, type MotionMessage } from "./protocol";

/** The phone samples the sword at 60 Hz, and so does the keyboard, so a cut is as smooth. */
const SEND_MS = 1000 / 60;
/** An unchanged hold still goes out this often, as the phone's stream does. */
const KEEPALIVE_MS = 250;
/** Before the mouse first moves, the blade rests where the engine's own guard holds it: tip up, a little right. */
const REST: AimPoint = { x: 0.13, y: 0.5 };

type MoveKey = "forward" | "back" | CutName | "thrust" | "parry";

const KEYS: Record<MoveKey, readonly string[]> = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyQ"],
  right: ["KeyE"],
  overhead: ["KeyF"],
  thrust: ["Space"],
  parry: ["ShiftLeft", "ShiftRight"],
};

export interface Timers {
  every(ms: number, run: () => void): () => void;
}

const realTimers: Timers = {
  every(ms, run) {
    const id = setInterval(run, ms);
    return () => clearInterval(id);
  },
};

/**
 * Blade Clash on the keyboard and mouse. The mouse points the sword over
 * the player's own half of the screen, as a finger on the drag pad does,
 * so a quick flick is a real cut. Left click slashes through the middle
 * from where the mouse holds the blade, Q, E and F cut on their own,
 * Space thrusts and Shift holds a parry. W and S are the footwork.
 */
export class BladeKeys implements KeyboardPlayer {
  private readonly buttons = new ButtonKeys(KEYS, { press: (key) => this.press(key) });
  /** Where the mouse holds the blade, or null until it first moves: the sword rests in guard. */
  private pointed: AimPoint | null = null;
  private move: SwordMove | null = null;
  private lastSent: MotionMessage | null = null;
  private lastAt = -Infinity;
  private readonly stop: () => void;

  constructor(
    private readonly ctx: KeyboardContext,
    private readonly now: () => number = () => performance.now(),
    timers: Timers = realTimers,
  ) {
    this.stop = timers.every(SEND_MS, () => this.pump());
  }

  key(code: string, down: boolean): boolean {
    return this.buttons.key(code, down);
  }

  pointer(event: StagePointer): void {
    const slot: Slot = this.ctx.seat === 2 ? 2 : 1;
    // A click slashes from where the blade was before it, so read that first.
    if (event.type === "down" && event.button === 0) this.start(slashFrom(this.aim(), this.now()));
    this.pointed = viewPoint(event, slot);
  }

  release(): void {
    this.buttons.release();
  }

  dispose(): void {
    this.stop();
  }

  /** How the sword is held right now, as the phone would send it. */
  frame(): MotionMessage {
    const aim = this.aim();
    const forward = this.buttons.isHeld("forward");
    const back = this.buttons.isHeld("back");
    const move = forward === back ? 0 : forward ? 1 : -1;
    return { kind: "motion", ...controlFromAim(aim, 0), move };
  }

  /** Sends the hold when it changed, with a slow keepalive, while the host draws this fighter. */
  pump(): void {
    const state = controllerStateSchema.safeParse(this.ctx.last("state"));
    if (!state.success || state.data.phase === "matchOver") return;
    const frame = this.frame();
    const now = this.now();
    if (this.lastSent && !changed(this.lastSent, frame) && now - this.lastAt < KEEPALIVE_MS) return;
    this.lastSent = frame;
    this.lastAt = now;
    this.ctx.sendLossy(frame);
  }

  private press(key: MoveKey): void {
    if (key === "thrust") this.start(thrust(this.aim(), this.now()));
    else if (key === "left" || key === "right" || key === "overhead") this.start(cut(key, this.aim(), this.now()));
  }

  /** A new move starts from wherever the blade is, mid move included, so it never jumps. */
  private start(move: SwordMove): void {
    this.move = move;
    this.pump();
  }

  /** Where the blade points now: a move under way, else a held parry, else the mouse. */
  private aim(): AimPoint {
    const scripted = this.move ? moveAt(this.move, this.now()) : null;
    if (!scripted) this.move = null;
    const parry = this.buttons.isHeld("parry") ? parryPoint(this.pointed ?? { x: 0, y: 0 }) : null;
    return scripted ?? parry ?? this.pointed ?? REST;
  }
}

function changed(a: MotionMessage, b: MotionMessage): boolean {
  return Math.abs(a.yaw - b.yaw) > 0.004 || Math.abs(a.pitch - b.pitch) > 0.004 || Math.abs(a.reach - b.reach) > 0.01 || a.move !== b.move;
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Sword",
      rows: [
        { action: "Point the sword", keys: ["Mouse"] },
        { action: "Slash through the middle", keys: ["Left click"] },
        { action: "Cut from high left or right", keys: ["Q", "E"] },
        { action: "Overhead cut", keys: ["F"] },
        { action: "Thrust", keys: ["Space"] },
        { action: "Parry (hold)", keys: ["Shift"] },
      ],
    },
    {
      title: "Footwork",
      rows: [
        { action: "Step in", keys: ["W", "Up"] },
        { action: "Step back", keys: ["S", "Down"] },
      ],
    },
  ],
  replaces: ["motion"],
  create: (ctx) => new BladeKeys(ctx),
};
