import type { Zone } from "../engine/route";
import { makeZombie, type Zombie } from "../engine/zombie";
import { isBoss, ZOMBIE_KINDS, type ZombieKind } from "../engine/zombie-kinds";
import type { Setting } from "./models/zombies/commoners";
import { gallery } from "./quality";

/** Near the hospital the dead are patients and staff; on the roads and docks, workers. */
export function settingFor(zone: Zone): Setting {
  if (zone === "hospital" || zone === "ramp" || zone === "roof") return "hospital";
  if (zone === "highway" || zone === "docks") return "industrial";
  return "town";
}

/** The setting for the lobby: the street, unless the model gallery asks for another. */
export function lobbySetting(): Setting {
  const wanted = gallery()?.setting;
  return wanted === "hospital" || wanted === "industrial" ? wanted : "town";
}

/**
 * Zombies shambling in the fog behind the lobby, for mood. They are not
 * part of any fight: they only age, so they walk in place. The hidden
 * model gallery swaps in whatever kinds it was asked to show, up close.
 */
export function lobbyZombies(): Zombie[] {
  const opts = (seed: number) => ({ hpScale: 1, speedScale: 1, harm: 1, weakHp: 1, seed });
  const show = gallery();
  if (show) {
    return show.kinds.map((kind, i) => {
      const known = (ZOMBIE_KINDS as readonly string[]).includes(kind) ? (kind as ZombieKind) : "walker";
      const wide = isBoss(known) ? 4.5 : 1.7;
      const side = (i - (show.kinds.length - 1) / 2) * wide;
      const z = makeZombie(-1 - i, known, isBoss(known) ? 12 : 6.8, side, side, opts(0.3 + i * 0.17));
      if (show.pose === "attack" || show.pose === "dead" || show.pose === "stagger") z.state = show.pose;
      return z;
    });
  }
  return [makeZombie(-1, "walker", 21, -2.5, -2.5, opts(0.2)), makeZombie(-2, "walker", 27, 2, 2, opts(0.7)), makeZombie(-3, "brute", 33, -0.5, -0.5, opts(0.45))];
}

/** Moves the lobby's zombies on. The gallery's attack and stagger poses loop. */
export function ageIdle(idle: readonly Zombie[], dt: number): void {
  for (const z of idle) {
    z.age += dt;
    z.stateTime += dt;
    if (z.state === "attack") z.swingIn = z.swingIn - dt <= 0 ? 2.5 : z.swingIn - dt;
    if (z.state === "stagger" && z.stateTime > 0.4) z.stateTime = 0;
  }
}
