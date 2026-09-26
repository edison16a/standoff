import { describe, expect, it } from "vitest";
import { newMatch } from "../../engine/match";
import { Rng } from "../../engine/rng";
import { fighterAt } from "../../engine/test-helpers";
import { readFighter } from "./anim-input";

const fight = () => {
  const m = newMatch();
  m.phase = "fight";
  return m;
};

describe("what the animator reads from a fighter", () => {
  it("turns the run into the body's own frame, so strafing and backing off read as such", () => {
    const f = fighterAt(0, 0, 0, 0);
    f.look = Math.PI / 2;
    // Facing +x, the right hand side is +z: running that way is running to the right.
    f.vel = { x: 0, z: 4 };
    const a = readFighter(f, 1, fight(), null);
    expect(a.speed).toBeCloseTo(4);
    expect(a.dir.x).toBeCloseTo(-1);
    expect(a.dir.z).toBeCloseTo(0);
    f.vel = { x: -3, z: 0 };
    expect(readFighter(f, 1, fight(), null).dir.z).toBeCloseTo(-1);
  });

  it("leans toward the side a peek steps out to, and raises the gun to look out", () => {
    const f = fighterAt(0, 0, 0, 0);
    f.look = 0;
    f.brain.stance = "peek";
    f.brain.peekAt = { x: 0.8, z: 0 };
    const a = readFighter(f, 1, fight(), null);
    expect(a.lean).toBe(1);
    expect(a.raise).toBe(1);
    f.brain.stance = "move";
    f.brain.peekAt = null;
    expect(readFighter(f, 1, fight(), null).raise).toBeLessThan(0.5);
  });

  it("follows a reload from start to end, and the shotgun shell by shell", () => {
    const f = fighterAt(0, 0, 0, 0, "rifle");
    f.gun.ammo = 3;
    f.gun.startReload();
    f.gun.update(f.gun.spec.reload / 2);
    expect(readFighter(f, 1, fight(), null).reloadP).toBeCloseTo(0.5, 1);
    const s = fighterAt(1, 0, 0, 0, "shotgun");
    s.gun.trigger(0, new Rng(1));
    s.gun.trigger(1, new Rng(1));
    s.gun.startReload();
    // After the lift and one whole shell, the next shell's cycle starts over.
    s.gun.update(0.4 + 0.45 + 0.2);
    const q = readFighter(s, 2, fight(), null).shellQ;
    expect(q).toBeGreaterThan(0.3);
    expect(q).toBeLessThan(0.6);
  });
});
