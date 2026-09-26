import { isChargeKey, isHeavyKey, moveOf, type Move, type MoveKey } from "./moves";
import { selectMove } from "./select";
import { FLOW, MOVEMENT } from "./tuning";
import type { Command, Fighter } from "./types";

/**
 * The rules that keep a fighter always attacking. A move that lands can
 * be cancelled into the next one: light into light for a short string,
 * light into heavy, and anything but a charged move into the ult. Every
 * move's recovery can also be cut short by the next input once a share
 * of it has played, so a whiff is punished a little but never stalls.
 */

type Weight = "light" | "heavy" | "committed";

/** How heavy a move is for cancels and recovery. Throws and spells cast in place count as committed, so a caster cannot fill the screen. */
export function weightOf(key: MoveKey, move: Move): Weight {
  if (isChargeKey(key) || key === "ult" || move.root || move.hover || move.projectiles?.length) return "committed";
  return isHeavyKey(key) ? "heavy" : "light";
}

/** The last frame the move can hurt anyone, from its hitboxes or its last throw. */
function lastLive(move: Move): number {
  const ends = [...move.hitboxes.map((b) => b.to), ...(move.projectiles ?? []).map((p) => p.frame)];
  return ends.length ? Math.max(...ends) : Math.round(move.frames / 2);
}

const freeFrames = new Map<Move, number>();

/** The frame from which any input may cut the move short. The ult always plays out. */
export function freeFrame(key: MoveKey, move: Move): number {
  if (key === "ult") return move.frames;
  let frame = freeFrames.get(move);
  if (frame === undefined) {
    const live = lastLive(move);
    frame = live + Math.ceil((move.frames - live) * FLOW.recovery[weightOf(key, move)]);
    freeFrames.set(move, frame);
  }
  return frame;
}

/** Whether the current swing has touched anyone, a shield included. */
export function connected(f: Fighter): boolean {
  return f.action === "attack" && f.struck.length > 0;
}

/** Whether the move playing may be cancelled into `next` now. */
export function canCancel(f: Fighter, next: MoveKey): boolean {
  if (!connected(f) || !f.move || f.chain >= FLOW.chain || isChargeKey(next)) return false;
  const now = weightOf(f.move, moveOf(f.character, f.move));
  if (next === "ult") return !isChargeKey(f.move) && f.move !== "ult";
  if (now !== "light") return false;
  const light = !isHeavyKey(next);
  return !light || f.chain < FLOW.lightString;
}

/** The move the buffered press would start, if it may cancel the current one. */
export function cancelKey(f: Fighter): MoveKey | null {
  if (!f.buffer) return null;
  const key = selectMove(f.buffer.button, f.buffer.x, f.buffer.y, f.ground !== null);
  return canCancel(f, key) ? key : null;
}

/** Whether a hit from this fighter now should stun long enough for the string's next light move to land. */
export function linking(f: Fighter): boolean {
  if (f.action !== "attack" || !f.move) return false;
  return weightOf(f.move, moveOf(f.character, f.move)) === "light" && f.chain < FLOW.lightString;
}

/** Whether the player is asking to do something else: a press, a jump, a lean of the stick. */
export function wantsOut(f: Fighter, cmd: Command): boolean {
  return f.buffer !== null || f.jumpBuffer > 0 || f.hold !== null || Math.abs(cmd.x) >= MOVEMENT.deadZone || cmd.y <= -MOVEMENT.flick;
}

/** Whether the move is far enough into its recovery for input to end it. */
export function recoveryDone(f: Fighter): boolean {
  if (f.action !== "attack" || !f.move) return false;
  return f.frame >= freeFrame(f.move, moveOf(f.character, f.move));
}
