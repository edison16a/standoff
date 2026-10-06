import { ButtonKeys, MouseAim, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import type { Payload } from "@/platform/protocol";
import { WEAPONS, type WeaponId } from "./engine/weapons";
import { TriggerHold } from "./phone/trigger";

/** The phases the phone's trigger works in, as its play pad has them. */
const ARMED = new Set(["travel", "fight", "clear"]);

function weaponOf(gun: Payload | null): WeaponId {
  const id = gun?.weapon;
  return typeof id === "string" && id in WEAPONS ? (id as WeaponId) : "rifle";
}

/**
 * The keyboard seat in Zombie Survival: the mouse aims, a left click or
 * Space pulls the trigger (held, an automatic keeps firing at the gun's
 * rate, just as the phone does) and R reloads. Setup, the weapon pick,
 * Ready, Retry and Play again stay on the phone panel.
 */
export function survivalPlayer(ctx: KeyboardContext, now: () => number = () => performance.now()): KeyboardPlayer {
  const phase = () => ctx.last("state")?.phase;
  const seats = () => ctx.last("state")?.seats;
  // The phone shows its play pad, and streams its aim, once this seat is in the run.
  const inRun = () => {
    const list = seats();
    const mine = Array.isArray(list) ? (list[ctx.seat - 1] as { playing?: unknown } | undefined) : undefined;
    return phase() !== undefined && phase() !== "lobby" && mine?.playing === true;
  };
  const armed = () => ARMED.has(String(phase()));
  const mouse = new MouseAim(
    {
      aim: (point) => inRun() && ctx.sendLossy({ kind: "aim", x: point.x, y: point.y }),
      button: (button, down) => button === 0 && trigger(down),
    },
    now,
  );
  const hold = new TriggerHold(() => ctx.send({ kind: "aim-fire", x: mouse.point.x, y: mouse.point.y }));
  // Mouse and Space share one trigger, so letting go of one while the other is down keeps firing.
  const fingers = new Set<"mouse" | "space">();

  function trigger(down: boolean, finger: "mouse" | "space" = "mouse"): void {
    if (!down) {
      fingers.delete(finger);
      if (fingers.size === 0) hold.release();
      return;
    }
    if (!armed() || !inRun()) return;
    const first = fingers.size === 0;
    fingers.add(finger);
    if (!first) return;
    const spec = WEAPONS[weaponOf(ctx.last("gun"))];
    hold.press(spec.auto, spec.rate);
  }

  const keys = new ButtonKeys(
    { shoot: ["Space"], reload: ["KeyR"] },
    {
      press: (button) => (button === "shoot" ? trigger(true, "space") : armed() && ctx.send({ kind: "reload" })),
      release: (button) => button === "shoot" && trigger(false, "space"),
    },
    now,
  );

  return {
    key: (code, down) => keys.key(code, down),
    pointer: (event) => mouse.pointer(event),
    tick() {
      // A held trigger lets go in a cutscene or a loss, as the phone's disabled button does.
      if (hold.held && !armed()) {
        fingers.clear();
        hold.release();
      }
      if (inRun()) mouse.tick();
    },
    release() {
      keys.release();
      fingers.clear();
      hold.release();
    },
    dispose: () => hold.release(),
  };
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Survive",
      rows: [
        { action: "Aim", keys: ["Mouse"] },
        { action: "Shoot (hold for automatics)", keys: ["Left click", "Space"] },
        { action: "Reload", keys: ["R"] },
      ],
    },
  ],
  replaces: ["aim"],
  create: (ctx) => survivalPlayer(ctx),
};
