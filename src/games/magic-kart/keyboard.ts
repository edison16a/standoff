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
 * buttons: full lock left or right, Drive and Brake as held pedals. The
 * pedals are separate keys, not a stick, so holding both works as two
 * thumbs on the phone do: Drive and Brake into a turn power slides into
 * a drift. Shift is a second Brake under the other hand. A pedal change
 * goes at once and reliably, the steady stream may drop, as the phone
 * does it.
 */
export class KartKeys implements KeyboardPlayer {
  private readonly stick = new StickKeys();
  private readonly pedals = new ButtonKeys(
    { drive: ["KeyW", "ArrowUp"], brake: ["KeyS", "ArrowDown", "ShiftLeft", "ShiftRight"], use: ["Space", "KeyE", "KeyF"] },
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
    // The pedals first, so W and S never reach the stick, which only steers.
    const used = this.pedals.key(code, down) || this.stick.key(code, down);
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
    return { kind: "input", steer: Math.sign(this.stick.vector().x), drive: this.pedals.isHeld("drive"), brake: this.pedals.isHeld("brake") };
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
        { action: "Brake, or reverse when stopped", keys: ["S", "Down", "Shift"] },
        { action: "Drift: hold Drive and Brake into a turn", keys: [["W", "S"], ["W", "Shift"]] },
        { action: "Use power up", keys: ["Space", "E", "F"] },
      ],
    },
  ],
  replaces: ["input"],
  create: (ctx) => new KartKeys(ctx),
};
