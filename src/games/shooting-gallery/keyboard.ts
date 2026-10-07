import { ButtonKeys, MouseAim, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import { PUMP_S } from "./engine/rules";

/** The phone greys its Shoot button for the pump after every shot, so the keys wait as long. */
const PUMP_MS = PUMP_S * 1000;

/**
 * The keyboard seat in Shooting Gallery: the mouse is the phone pointed at
 * the screen, and a left click or Space pulls the trigger. Setup, the gun
 * finish and Ready stay on the phone panel.
 */
export function galleryPlayer(ctx: KeyboardContext, now: () => number = () => performance.now()): KeyboardPlayer {
  let firedAt = -Infinity;
  const mouse = new MouseAim(
    {
      aim: (point) => ctx.sendLossy({ kind: "aim", x: point.x, y: point.y }),
      button: (button, down) => button === 0 && down && shoot(),
    },
    now,
  );
  const keys = new ButtonKeys({ shoot: ["Space"] }, { press: () => shoot() }, now);

  function shoot(): void {
    const state = ctx.last("state");
    if (state?.phase !== "playing" || now() - firedAt < PUMP_MS) return;
    firedAt = now();
    ctx.send({ kind: "aim-fire", x: mouse.point.x, y: mouse.point.y });
  }

  return {
    key: (code, down) => keys.key(code, down),
    pointer: (event) => mouse.pointer(event),
    // Past calibration the phone streams its aim all the time, so the gun follows in the lobby too.
    tick: () => mouse.tick(),
    release: () => keys.release(),
  };
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Shoot",
      rows: [
        { action: "Aim", keys: ["Mouse"] },
        { action: "Shoot", keys: ["Left click", "Space"] },
      ],
    },
  ],
  replaces: ["aim"],
  create: (ctx) => galleryPlayer(ctx),
};
