import type { Encounter } from "./encounter";
import { Gun } from "./gun";
import { Rng } from "./rng";
import { resolveShot, type CastFn } from "./shooting";
import type { Hand } from "./sim";
import { aimPoint, traceShot } from "./sim-aim";
import type { Member } from "./squad";
import { emptyStats } from "./stats";
import type { WeaponId } from "./weapons";
import { makeZombie, type Zombie } from "./zombie";
import { weakPointHp, type ZombieKind } from "./zombie-kinds";

const STEP = 1 / 120;
/** A duel that runs this long is called off, so a hopeless match up still ends. */
const GIVE_UP = 60;

export interface DuelResult {
  /** Seconds to drop them all, from the first zombie in sight. */
  seconds: number;
  shots: number;
}

/**
 * One player against a line of zombies standing still at one range, one
 * after another, with the real gun: its cone, its falloff, its kick and
 * its reloads. The player takes a moment to swing onto each new one, and
 * waits for the gun to settle as far as their hand allows. The tests use
 * it to show what each gun is best at.
 */
export function duel(weapon: WeaponId, kind: ZombieKind, metres: number, hand: Hand, count = 6, seed = 1): DuelResult {
  const rng = new Rng(seed);
  const random = () => rng.next();
  const gauss = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  const member: Member = { seat: 1, gun: new Gun(weapon), stats: emptyStats(), present: true };
  let current: Zombie | null = null;
  const encounter = { find: (id: number) => (current?.id === id ? current : undefined) } as unknown as Encounter;
  let t = 0;
  let shots = 0;
  for (let i = 0; i < count && t < GIVE_UP; i++) {
    const z = makeZombie(i + 1, kind, metres, 0, 0, { hpScale: 1, speedScale: 0, harm: 0, weakHp: weakPointHp(kind, 1), seed: 0.5 });
    current = z;
    let ready = t + hand.acquire;
    while (z.state !== "dead" && t < GIVE_UP) {
      t += STEP;
      member.gun.update(STEP);
      if (t < ready || member.gun.recoil.size * metres > hand.patience) continue;
      if (member.gun.trigger(t) !== "fired") continue;
      shots += 1;
      const point = aimPoint(z, hand.head);
      const shake = { x: gauss() * hand.shake, y: gauss() * hand.shake };
      const cast: CastFn = (offsets) => offsets.map((o) => traceShot([z], { x: point.x + shake.x + o.x, y: point.y + shake.y + o.y }));
      resolveShot(member, encounter, cast, random);
      // A staggered zombie is knocked back. Here it steps straight back to its mark.
      z.ahead = metres;
      ready = Math.max(ready, t);
    }
  }
  return { seconds: t, shots };
}
