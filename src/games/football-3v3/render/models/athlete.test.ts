import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { arm, sleeve } from "./arms";
import { cleat } from "./cleats";
import { faceMask } from "./face-mask";
import { glove } from "./gloves";
import { face, neck } from "./head";
import { helmetTexel } from "./helmet-paint";
import { dirOf, SHELL_CENTRE, shellGeometry, shellUV } from "./helmet-shell";
import { buildKit, linemanKit } from "./kit";
import { leg, pelvis } from "./legs";
import { groups } from "./parts";
import { BONE_NAMES, buildBones, dimsFor } from "./rig";
import { torso, torsoV, TORSO_V0 } from "./torso";

const kit = buildKit(0, "routerunner", "Sam");
const d = dimsFor(kit.height, kit.build);

function parts(k = kit, detail = 1) {
  const dd = dimsFor(k.height, k.build);
  return {
    skin: [arm(dd, k, 1, detail), arm(dd, k, -1, detail), neck(dd, k, detail), face(dd, k, detail)],
    gear: [pelvis(dd, k, detail), leg(dd, k, 1, detail), leg(dd, k, -1, detail), cleat(dd, k, 1, detail), cleat(dd, k, -1, detail), glove(dd, k, 1, detail), glove(dd, k, -1, detail)],
    jersey: [torso(dd, detail), sleeve(dd, k, 1, detail), sleeve(dd, k, -1, detail)],
  };
}

const box = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!;
};

describe("the skinned athlete", () => {
  it("weights every vertex to real bones, summing to one", () => {
    const all = Object.values(parts()).flat();
    for (const g of all) {
      const idx = g.getAttribute("skinIndex");
      const w = g.getAttribute("skinWeight");
      for (let i = 0; i < w.count; i++) {
        const sum = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i);
        expect(sum).toBeCloseTo(1, 4);
        for (const k of [idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)]) expect(k).toBeLessThan(BONE_NAMES.length);
      }
    }
  });

  it("merges into one mesh with a group per material", () => {
    const p = parts();
    const g = groups([p.skin, p.gear, p.jersey]);
    expect(g.groups).toHaveLength(3);
    // Smooth and detailed, but well inside a frame budget for twelve players.
    const tris = g.index!.count / 3;
    expect(tris).toBeGreaterThan(9000);
    expect(tris).toBeLessThan(24000);
  });

  it("keeps the low detail body far lighter", () => {
    const p = parts(kit, 0.55);
    expect(groups([p.skin, p.gear, p.jersey]).index!.count / 3).toBeLessThan(10000);
  });

  it("stands the body to its real proportions", () => {
    const p = parts();
    const legs = box(p.gear[1]!);
    const pads = box(p.jersey[0]!);
    // The cleat's studs touch the ground under the ankle.
    const foot = box(p.gear[3]!);
    expect(foot.min.y).toBeCloseTo(0, 2);
    expect(foot.min.x).toBeGreaterThan(0);
    // The glove hangs at the end of the arm, round the middle of the thigh.
    const hand = box(p.gear[5]!);
    expect(hand.min.y).toBeGreaterThan(0.33 * d.height);
    expect(hand.max.y).toBeLessThan(0.55 * d.height);
    expect(legs.min.y).toBeGreaterThan(d.ankleY * 0.5);
    // Shoulder pads make the widest part of the body, about 0.55 to 0.65 m across.
    const width = pads.max.x - pads.min.x;
    expect(width).toBeGreaterThan(0.53);
    expect(width).toBeLessThan(0.68);
    // The left arm hangs on the left (+x).
    expect(box(p.skin[0]!).min.x).toBeGreaterThan(0.08);
    expect(box(p.skin[1]!).max.x).toBeLessThan(-0.08);
  });

  it("points the torso's faces outward", () => {
    const g = torso(d, 1);
    const pos = g.getAttribute("position");
    const n = g.getAttribute("normal");
    let out = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getX(i) * n.getX(i) + pos.getZ(i) * n.getZ(i) > 0) out++;
    expect(out / pos.count).toBeGreaterThan(0.95);
  });

  it("places the jersey's chest a quarter of the way round and maps heights up the torso", () => {
    expect(torsoV(d, 0.6 * d.height)).toBeGreaterThan(TORSO_V0);
    expect(torsoV(d, 0.78 * d.height)).toBeGreaterThan(torsoV(d, 0.7 * d.height));
    expect(torsoV(d, 0.8 * d.height)).toBeLessThan(1);
  });

  it("builds bones in the order the skin weights name them", () => {
    const { list, bones } = buildBones(d, new THREE.Group());
    expect(list.map((b) => b.name)).toEqual(BONE_NAMES);
    bones.hips.updateMatrixWorld(true);
    expect(bones.ankleL.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(d.ankleY, 5);
    expect(bones.shoulderL.getWorldPosition(new THREE.Vector3()).x).toBeGreaterThan(0);
  });

  it("makes linemen bigger in every direction", () => {
    const big = linemanKit(0, 70, 1);
    const lineman = box(torso(dimsFor(big.height, big.build), 1));
    const skill = box(torso(d, 1));
    expect(lineman.max.z - lineman.min.z).toBeGreaterThan(skill.max.z - skill.min.z);
    expect(lineman.max.x - lineman.min.x).toBeGreaterThan(skill.max.x - skill.min.x);
  });

  it("builds every build without a hitch", () => {
    for (const id of BUILD_IDS) expect(() => parts(buildKit(1, id))).not.toThrow();
  });
});

describe("the helmet", () => {
  it("faces its shell outward and its padding inward", () => {
    const g = shellGeometry({ around: 48, rings: 14 });
    const pos = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const cols = 49;
    const sheet = 15 * cols;
    const p = new THREE.Vector3();
    const v = new THREE.Vector3();
    let outer = 0;
    let inner = 0;
    for (let i = cols; i < sheet; i++) if (v.fromBufferAttribute(n, i).dot(p.fromBufferAttribute(pos, i).sub(SHELL_CENTRE)) > 0) outer++;
    for (let i = sheet + cols; i < 2 * sheet; i++) if (v.fromBufferAttribute(n, i).dot(p.fromBufferAttribute(pos, i).sub(SHELL_CENTRE)) < 0) inner++;
    expect(outer / (sheet - cols)).toBeGreaterThan(0.97);
    expect(inner / (sheet - cols)).toBeGreaterThan(0.97);
  });

  it("leaves the face open and covers the crown and the back", () => {
    const g = shellGeometry({ around: 48, rings: 14 });
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.y).toBeGreaterThan(0.14);
    expect(b.min.y).toBeLessThan(-0.08);
    expect(b.min.z).toBeLessThan(-0.15);
  });

  it("paints the stripe over the crown and the logo on both sides", () => {
    const at = (az: number, el: number) => helmetTexel(...shellUV(dirOf((az * Math.PI) / 180, (el * Math.PI) / 180)));
    expect(at(0, 89).kind).toBe("stripe");
    expect(at(180, 10).kind).toBe("stripe");
    expect(at(90, 11).kind).toBe("logo");
    expect(at(-90, 11).kind).toBe("logo");
    expect(at(99, -20).kind).toBe("ear");
    expect(at(60, 40).kind).toBe("shell");
  });

  it("maps the whole shell inside its texture with no seam", () => {
    const g = shellGeometry({ around: 48, rings: 14 });
    const uv = g.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThan(0);
      expect(uv.getX(i)).toBeLessThan(1);
      expect(uv.getY(i)).toBeGreaterThan(0);
      expect(uv.getY(i)).toBeLessThan(1);
    }
  });

  it("gives cages more bars than open masks", () => {
    const open = faceMask(buildKit(0, "gunslinger").look, { colour: "#ffffff", detail: 1 });
    const cage = faceMask(buildKit(0, "powerback").look, { colour: "#ffffff", detail: 1 });
    expect(cage.index!.count).toBeGreaterThan(open.index!.count);
  });
});
