import type { Look } from "../../roster";
import { armInfluence, legInfluence, limbTube } from "./limbs";
import { smooth, tint, type PartList } from "./parts";
import type { Rig } from "./rig";
import { buildShoe } from "./shoes";

/**
 * What a player wears besides the kit: shoes on both feet, crew socks
 * with a ribbed top, and per build a compression sleeve down one arm
 * or terry wristbands. Socks and sleeves are cut from the limb's own
 * shape a few millimetres out and bend with it.
 */
export function addGear(parts: PartList, rig: Rig, look: Look, fine: boolean): void {
  const { s } = rig.m;
  const { thigh, shin, upper, fore, sole } = rig.dims;
  const n = fine ? 20 : 10;
  for (const side of [1, -1] as const) {
    const k = side > 0 ? "L" : "R";
    const shoe = buildShoe(look, { ankle: -sole.y, heel: sole.heel + 0.012 * s, toe: sole.toe - 0.016 * s, s }, fine);
    parts.rigid(shoe, `ankle${k}`);

    // Crew socks from inside the collar to under the calf, ribbed at the top.
    const ankle = thigh + shin;
    const sockTop = ankle - 0.2 * s;
    const sock = limbTube(rig, "leg", side, { n, from: sockTop, to: ankle - 0.02 * s, inflate: 0.0032 * s });
    const top = rig.rest(`hip${k}`).y;
    tint(sock, (p, c) => {
      const t = top - p.y;
      c.set(look.sock);
      if (t < sockTop + 0.028 * s) c.multiplyScalar(0.9 + 0.1 * Math.sign(Math.sin((t / (0.004 * s)) * Math.PI)));
    });
    parts.weighted(sock, legInfluence(rig, side), 0.95);

    if (look.sleeve?.side === side) {
      const sleeve = limbTube(rig, "arm", side, { n, from: 0.07 * s, to: upper + fore - 0.03 * s, inflate: 0.0022 * s });
      parts.weighted(tint(sleeve, look.sleeve.color), armInfluence(rig, side), 0.45);
    }
    if (look.wristband) {
      const from = upper + fore - 0.095 * s;
      const to = upper + fore - 0.025 * s;
      // A thick band whose edges come back down to the skin, so it never shows a hollow end.
      const bump = (t: number) => 0.008 * s * smooth(from, from + 0.012 * s, t) * (1 - smooth(to - 0.012 * s, to, t));
      const band = limbTube(rig, "arm", side, { n, from, to, inflate: 0.0008 * s, bump });
      parts.weighted(tint(band, look.wristband), armInfluence(rig, side), 1);
    }
  }
}

