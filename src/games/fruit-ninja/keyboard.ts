import { MouseAim, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";

/**
 * The keyboard seat in Fruit Slicer. The phone has no button in play: its
 * aim is the blade, and the host cuts whatever the blade crosses fast
 * enough. So the mouse is the blade and a quick swipe slices. Setup, the
 * blade pick and Ready stay on the phone panel.
 */
export function slicerPlayer(ctx: KeyboardContext, now: () => number = () => performance.now()): KeyboardPlayer {
  const mouse = new MouseAim({ aim: (point) => ctx.sendLossy({ kind: "aim", x: point.x, y: point.y }) }, now);
  return {
    pointer: (event) => mouse.pointer(event),
    // Past calibration the phone streams its blade all the time, lobby included.
    tick: () => mouse.tick(),
  };
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Slice",
      rows: [
        { action: "Move the blade", keys: ["Mouse"] },
        { action: "Slice", keys: ["Swipe the mouse fast"] },
      ],
    },
  ],
  replaces: ["aim"],
  create: (ctx) => slicerPlayer(ctx),
};
