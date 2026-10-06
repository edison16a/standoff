import { ButtonKeys, StickKeys, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import { phoneStateSchema, type InputMessage, type PhoneState } from "./protocol";

function readState(payload: unknown): PhoneState | null {
  const parsed = phoneStateSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** The phone streams its wheel and pedals only for a kart in the race, from the countdown on. */
export function driving(state: PhoneState | null): boolean {
  return !!state?.racing && (state.phase === "countdown" || state.phase === "racing");
}

/** The power up button works once an item has stopped rolling, in the race itself. */
export function canUse(state: PhoneState | null): boolean {
  return !!state && state.item !== null && !state.rolling && state.phase === "racing";
}

/**
 * Magic Kart on the keyboard, as a phone steering with its arrow
 * buttons: full lock left or right, Drive and Brake as held pedals. A
 * pedal change goes at once and reliably, the steady stream may drop, as
 * the phone does it. Shift is a second Brake under the other hand, so
 * Drive, a turn and Shift together power slide into a drift.
 */
export class KartKeys implements KeyboardPlayer {
  private readonly stick = new StickKeys();
  private readonly pedals = new ButtonKeys(
    { drift: ["ShiftLeft", "ShiftRight"], use: ["Space", "KeyE", "KeyF"] },
    {
      press: (button) => {
        if (button === "use") this.use();
      },
    },
  );
  /** The last input sent. A kart starts at rest, so the first key only sends if it moves a pedal. */
  private last: InputMessage = { kind: "input", steer: 0, drive: false, brake: false };

  constructor(private readonly ctx: KeyboardContext) {}

  key(code: string, down: boolean): boolean {
    const used = this.stick.key(code, down) || this.pedals.key(code, down);
    if (used) this.stream(true);
    return used;
  }

  tick(): void {
    this.stream(false);
  }

  release(): void {
    this.stick.release();
    this.pedals.release();
    this.stream(true);
  }

  /** The wheel and pedals as the phone sends them. */
  input(): InputMessage {
    const { x, y } = this.stick.vector();
    return { kind: "input", steer: Math.sign(x), drive: y > 0, brake: y < 0 || this.pedals.isHeld("drift") };
  }

  /** Streams while driving. A pedal change goes reliably; a turn rides the next tick, as the phone's arrows do. */
  private stream(onChange: boolean): void {
    if (!driving(readState(this.ctx.last("state")))) return;
    const next = this.input();
    const pedalsMoved = next.drive !== this.last.drive || next.brake !== this.last.brake;
    if (onChange && !pedalsMoved) return;
    this.last = next;
    if (onChange) this.ctx.send(next);
    else this.ctx.sendLossy(next);
  }

  private use(): void {
    if (canUse(readState(this.ctx.last("state")))) this.ctx.send({ kind: "use" });
  }
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Race",
      rows: [
        { action: "Steer", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Drive", keys: ["W", "Up"] },
        { action: "Brake, or reverse when stopped", keys: ["S", "Down"] },
        { action: "Drift (hold with Drive into a turn)", keys: ["Shift"] },
        { action: "Use power up", keys: ["Space", "E", "F"] },
      ],
    },
  ],
  replaces: ["input"],
  create: (ctx) => new KartKeys(ctx),
};
