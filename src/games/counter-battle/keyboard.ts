import { ButtonKeys, MouseAim, type AimPoint, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import type { Payload } from "@/platform/protocol";

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isZone(value: unknown): value is Zone {
  const z = value as Partial<Zone> | null;
  return !!z && [z.x, z.y, z.w, z.h].every((n) => typeof n === "number") && z.w! > 0 && z.h! > 0;
}

/**
 * A point on the whole screen, in the seat's own view. The aim kit takes
 * a phone's aim as spanning that seat's view, so the mouse over the split
 * screen is mapped into it, held at its edges.
 */
export function inZone(point: AimPoint, zone: unknown): AimPoint {
  if (!isZone(zone)) return point;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const fx = (point.x + 1) / 2;
  const fy = (1 - point.y) / 2;
  return { x: clamp(((fx - zone.x) / zone.w) * 2 - 1), y: clamp(1 - ((fy - zone.y) / zone.h) * 2) };
}

/**
 * The keyboard seat in Paintball Battle. The fighter moves by itself, as
 * on the phone: the mouse aims in this player's view, a left click or
 * Space is the trigger (held, an automatic keeps firing), C switches
 * crouch on and off and R reloads. Setup, the gun pick and Ready stay on
 * the phone panel.
 */
export function paintballPlayer(ctx: KeyboardContext, now: () => number = () => performance.now()): KeyboardPlayer {
  const state = (): Payload | null => ctx.last("state");
  const fighting = () => state()?.playing === true && state()?.phase === "match";
  const local = (point: AimPoint) => inZone(point, state()?.zone);
  let held = false;
  let crouched = false;
  let phase: unknown = null;

  const mouse = new MouseAim(
    {
      aim: (point) => fighting() && ctx.sendLossy({ kind: "aim", ...local(point) }),
      button: (button, down) => button === 0 && trigger(down),
    },
    now,
  );
  // Mouse and Space share one trigger, which lets go when the last of them does.
  const fingers = new Set<string>();

  function trigger(down: boolean, finger = "mouse"): void {
    if (down && fingers.size === 0 && fighting() && state()?.armed === true) {
      held = true;
      ctx.send({ kind: "aim-fire", ...local(mouse.point) });
      ctx.send({ kind: "trigger", down: true });
    }
    if (down && held) fingers.add(finger);
    if (down) return;
    fingers.delete(finger);
    if (fingers.size === 0 && held) {
      held = false;
      ctx.send({ kind: "trigger", down: false });
    }
  }

  function setCrouch(on: boolean): void {
    if (on === crouched) return;
    crouched = on;
    ctx.send({ kind: "crouch", down: on });
  }

  const keys = new ButtonKeys(
    { shoot: ["Space"], crouch: ["KeyC"], reload: ["KeyR"] },
    {
      press(button) {
        const s = state();
        if (button === "shoot") return trigger(true, "space");
        if (button === "reload" && s?.alive === true) ctx.send({ kind: "reload" });
        if (button === "crouch" && s?.alive === true && s.armed === true) setCrouch(!crouched);
      },
      release: (button) => button === "shoot" && trigger(false, "space"),
    },
    now,
  );

  return {
    key: (code, down) => keys.key(code, down),
    pointer: (event) => mouse.pointer(event),
    tick() {
      const next = state()?.phase;
      // Back in the lobby after a match the phone lets go of the trigger and stands up.
      if (next === "lobby" && phase !== null && phase !== "lobby") {
        fingers.clear();
        trigger(false);
        setCrouch(false);
      }
      phase = next ?? phase;
      if (fighting()) mouse.tick();
    },
    release() {
      keys.release();
      fingers.clear();
      trigger(false);
    },
  };
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Fight",
      rows: [
        { action: "Aim in your view", keys: ["Mouse"] },
        { action: "Shoot (hold for auto)", keys: ["Left click", "Space"] },
        { action: "Crouch on or off", keys: ["C"] },
        { action: "Reload", keys: ["R"] },
      ],
    },
  ],
  // The keys own the crouch switch, so the panel's own switch never undoes it.
  replaces: ["aim", "crouch"],
  create: (ctx) => paintballPlayer(ctx),
};
