import { Vector3 } from "three";
import { appleFlesh, stoneFlesh } from "../textures/flesh-along";
import { citrusFlesh, coconutFlesh, kiwiFlesh, melonFlesh } from "../textures/flesh-across";
import { coconutSkin, kiwiSkin, melonSkin } from "../textures/skins-rough";
import { appleSkin, citrusSkin, stoneFruitSkin } from "../textures/skins-smooth";
import { fleshMaterial, skinMaterial } from "./materials";
import { leaf, place, stem } from "./parts";
import { alongOutline, outlineUv, type RevolveShape } from "./revolve";
import { APPLE, COCONUT, creased, KIWI, LEMON, LIME, ORANGE, WATERMELON } from "./shapes";
import type { Attachment, FruitSpec } from "./spec";

/** The everyday fruit: cut once, worth the base points. */

function uvOutline(shape: RevolveShape) {
  const { points, size, mid } = alongOutline(shape);
  return points.map((p) => outlineUv(p, size, mid));
}

/** A stem and one leaf at the top of the fruit, kept by the top half. */
function stemAndLeaf(top: number, height: number, leafSize: number, tilt = 0.5): () => Attachment[] {
  return () => {
    const base = new Vector3(0, top - 0.05, 0);
    const parts: Attachment[] = [{ object: stem(base, height, 0.045, 0.08), half: "a" }];
    if (leafSize > 0) {
      const leafPart = place(leaf(leafSize, leafSize * 0.48, 0.35), base.clone().add(new Vector3(0.04, height * 0.55, 0)), new Vector3(1, tilt, 0.2));
      parts.push({ object: leafPart, half: "a" });
    }
    return parts;
  };
}

/** A tiny green star where a citrus hung from its tree. */
function citrusNub(top: number): () => Attachment[] {
  return () => [{ object: stem(new Vector3(0, top - 0.04, 0), 0.08, 0.06, 0.01, "#6f8a2a"), half: "a" }];
}

function citrus(shape: RevolveShape, top: number, peel: string, shadow: string, flesh: string, deep: string, juice: string, seed: number): FruitSpec {
  return {
    shape,
    cut: "across",
    fit: 1,
    skin: () => skinMaterial(citrusSkin(peel, shadow, seed), { roughness: 0.45, clearcoat: 0.25, bumpScale: 1.6 }),
    flesh: () => fleshMaterial(citrusFlesh({ peel, flesh, deep, segments: 10 + (seed % 3), seedValue: seed })),
    attachments: citrusNub(top),
    juice,
  };
}

export const orange = citrus(ORANGE, 0.94, "#f58a13", "#d95f06", "#ffa92e", "#f57c00", "#ff9a1f", 3);
export const lemon = citrus(LEMON, 1.26, "#f7d92a", "#d9b40f", "#fff08a", "#f5d63c", "#fff06a", 5);
export const lime = citrus(LIME, 1.0, "#6fc12b", "#3f8f19", "#c9ec7a", "#9fd645", "#c8f060", 7);

export const watermelon: FruitSpec = {
  shape: WATERMELON,
  cut: "across",
  fit: 1.07,
  skin: () => skinMaterial(melonSkin("#3f8a2c", "#153f12", 14, 0.2, 2), { roughness: 0.35, clearcoat: 0.6 }),
  flesh: () => fleshMaterial(melonFlesh({ rindDark: "#1d4d19", rindLight: "#9fcf6a", flesh: "#f0243b", core: "#ff5a6a", seeds: 14, seedValue: 4 })),
  attachments: () => [{ object: stem(new Vector3(0, 1.1, 0), 0.12, 0.05, 0.06, "#6b6a2a"), half: "a" }],
  juice: "#ff2a45",
};

export const kiwi: FruitSpec = {
  shape: KIWI,
  cut: "across",
  fit: 0.92,
  skin: () => skinMaterial(kiwiSkin(6), { roughness: 0.85, clearcoat: 0, sheen: "#c8a878" }),
  flesh: () => fleshMaterial(kiwiFlesh()),
  juice: "#9fdc4a",
};

export const coconut: FruitSpec = {
  shape: COCONUT,
  cut: "across",
  fit: 1.02,
  skin: () => skinMaterial(coconutSkin(8), { roughness: 0.9, clearcoat: 0 }),
  flesh: () => fleshMaterial(coconutFlesh()),
  juice: "#f5f2ea",
};

function apple(skinBase: string, blush: string, streak: string, rim: string, juice: string, seed: number): FruitSpec {
  return {
    shape: APPLE,
    cut: "along",
    fit: 0.98,
    skin: () => skinMaterial(appleSkin(skinBase, blush, streak, seed), { roughness: 0.28, clearcoat: 0.8 }),
    flesh: () => fleshMaterial(appleFlesh(uvOutline(APPLE), rim)),
    attachments: stemAndLeaf(0.62, 0.34, 0.55),
    juice,
  };
}

export const redApple = apple("#b3101c", "#d8262a", "#7a0610", "#a8121c", "#fff2c4", 9);
export const greenApple = apple("#8ccc3c", "#c7dc4a", "#6aa82a", "#78b030", "#f4f8c8", 10);

const PLUM = creased(1.02, 0.08);
const PEACH = creased(0.98, 0.1);

export const plum: FruitSpec = {
  shape: PLUM,
  cut: "along",
  fit: 1,
  skin: () => skinMaterial(stoneFruitSkin("#4a1a60", "#2c0c3a", "#8f88c0", 11, 0.55), { roughness: 0.35, clearcoat: 0.4 }),
  flesh: () => fleshMaterial(stoneFlesh(uvOutline(PLUM), { skin: "#3a0c4a", flesh: "#f2c23a", edge: "#e06a2a", blush: "#d85a2a" })),
  attachments: stemAndLeaf(0.98, 0.2, 0),
  juice: "#b0204a",
};

export const peach: FruitSpec = {
  shape: PEACH,
  cut: "along",
  fit: 1,
  skin: () => skinMaterial(stoneFruitSkin("#f7b04a", "#e2442e", "#ffd9a8", 12, 0.25), { roughness: 0.75, clearcoat: 0, sheen: "#ffd9b8" }),
  flesh: () => fleshMaterial(stoneFlesh(uvOutline(PEACH), { skin: "#e8563a", flesh: "#ffb347", edge: "#ffc466", blush: "#e8502a" })),
  attachments: stemAndLeaf(0.96, 0.12, 0.6, 0.9),
  juice: "#ffb04a",
};
