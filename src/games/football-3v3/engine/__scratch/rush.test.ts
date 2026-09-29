import { it } from "vitest";
import { bySeat, cmd, game, place, run, snapped } from "../test-kit";
import { v2 } from "../vec";

it("rush", () => {
  for (const rush of [false, true]) {
    const s = snapped(game());
    const d = bySeat(s, 3);
    place(d, s.drive.los + 2.5, s.drive.ballZ + 0.8);
    for (let i = 0; i < 12; i++) {
      run(s, 0.1, cmd(d.id, { move: v2(-1, 0), rush }));
      console.log(rush, i, d.pos.x.toFixed(2), d.pos.z.toFixed(2), d.vel.x.toFixed(2), JSON.stringify(d.block), s.phase, s.linemen.map((l) => l.pos.x.toFixed(1) + "," + l.pos.z.toFixed(1)).join(" "));
    }
  }
});
