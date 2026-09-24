import { CanvasTexture, Color, DoubleSide, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, Vector3 } from "three";
import { dragonFlesh, strawberryFlesh } from "../textures/flesh-along";
import { melonFlesh } from "../textures/flesh-across";
import { bananaFlesh, pineappleFlesh, pomegranateFlesh, starFlesh } from "../textures/flesh-exotic";
import { canvas } from "../textures/paint";
import { dragonSkin, melonSkin, pineappleSkin, pomegranateSkin, strawberrySkin } from "../textures/skins-rough";
import { bananaSkin, plainSkin } from "../textures/skins-smooth";
import { fleshMaterial, skinMaterial } from "./materials";
import { collar, leaf, leafGeometry, place, stem, toothedCrown } from "./parts";
import { alongOutline, outlineUv, type RevolveShape } from "./revolve";
import { BANANA, bendBanana, DRAGONFRUIT, GIANT_MELON, PINEAPPLE, POMEGRANATE, STAR_FRUIT, starOutline, STRAWBERRY } from "./shapes";
import type { Attachment, FruitSpec } from "./spec";

/** The fruit with a twist: odd shapes, big multi hit fruit and the rare glowing ones. */

function uvOutline(shape: RevolveShape) {
  const { points, size, mid } = alongOutline(shape);
  return points.map((p) => outlineUv(p, size, mid));
}

export const banana: FruitSpec = {
  shape: BANANA,
  cut: "across",
  fit: 1,
  skin: () => skinMaterial(bananaSkin(13), { roughness: 0.45, clearcoat: 0.3 }),
  flesh: () => fleshMaterial(bananaFlesh()),
  deform: bendBanana,
  attachments: () => {
    // The ends of the bent banana, worked out from the same arc as bendBanana.
    const a = 1.35 / 2.2;
    const x = (2.2 * (1 - Math.cos(a))) / 2;
    const top = stem(new Vector3(0, 0, 0), 0.32, 0.075, 0.03, "#5d5a24");
    const tip = stem(new Vector3(0, 0, 0), 0.07, 0.05, 0, "#2c1d0c");
    return [
      { object: place(top, new Vector3(x, 2.2 * Math.sin(a) - 0.04, 0), new Vector3(Math.sin(a), Math.cos(a), 0)), half: "a" },
      { object: place(tip, new Vector3(x, -2.2 * Math.sin(a) + 0.03, 0), new Vector3(Math.sin(a), -Math.cos(a), 0)), half: "b" },
    ];
  },
  juice: "#fff1b0",
};

export const pineapple: FruitSpec = {
  shape: PINEAPPLE,
  cut: "across",
  fit: 0.95,
  skin: () => skinMaterial(pineappleSkin(14), { roughness: 0.6, clearcoat: 0.15, bumpScale: 3 }),
  flesh: () => fleshMaterial(pineappleFlesh()),
  attachments: () => {
    const crown: Attachment[] = [];
    const tiers = [
      { count: 9, length: 0.75, lean: 1.1 },
      { count: 8, length: 1.05, lean: 0.55 },
      { count: 6, length: 1.2, lean: 0.25 },
    ];
    tiers.forEach((tier, k) => {
      for (let i = 0; i < tier.count; i++) {
        const a = (i / tier.count) * Math.PI * 2 + k * 0.4;
        const dir = new Vector3(Math.sin(a) * tier.lean, 1, Math.cos(a) * tier.lean);
        const part = place(leaf(tier.length, 0.17, 0.25, "#8fb08a", 0.5), new Vector3(0, 0.9, 0), dir, 0);
        part.rotateY(Math.PI / 2);
        crown.push({ object: part, half: "a" });
      }
    });
    return crown;
  },
  juice: "#ffe04a",
};

export const strawberry: FruitSpec = {
  shape: STRAWBERRY,
  cut: "along",
  fit: 0.95,
  skin: () => skinMaterial(strawberrySkin(15), { roughness: 0.3, clearcoat: 0.7, bumpScale: 2 }),
  flesh: () => fleshMaterial(strawberryFlesh(uvOutline(STRAWBERRY))),
  attachments: () => [
    { object: collar(new Vector3(0, 0.52, 0), 9, 0.5, 0.22, -0.25, "#7fcf6a"), half: "a" },
    { object: stem(new Vector3(0, 0.5, 0), 0.2, 0.035, 0.05, "#5f8a2a"), half: "a" },
  ],
  juice: "#e8122a",
};

export const giantMelon: FruitSpec = {
  shape: GIANT_MELON,
  cut: "across",
  fit: 1.2,
  skin: () => skinMaterial(melonSkin("#8cc25a", "#2a6420", 22, 0.1, 16), { roughness: 0.32, clearcoat: 0.6 }),
  flesh: () => fleshMaterial(melonFlesh({ rindDark: "#2a6420", rindLight: "#c6e59a", flesh: "#e8172f", core: "#ff4d63", seeds: 20, seedValue: 17 })),
  attachments: () => [{ object: stem(new Vector3(0, 1.26, 0), 0.14, 0.06, 0.08, "#6b6a2a"), half: "a" }],
  juice: "#ff2a45",
};

export const pomegranate: FruitSpec = {
  shape: POMEGRANATE,
  cut: "across",
  fit: 1.02,
  skin: () => skinMaterial(pomegranateSkin(18), { roughness: 0.45, clearcoat: 0.45 }),
  flesh: () => fleshMaterial(pomegranateFlesh()),
  attachments: () => {
    const material = new MeshStandardMaterial({ color: new Color("#8a1a24"), roughness: 0.6, side: DoubleSide });
    return [{ object: toothedCrown(new Vector3(0, 0.88, 0), 0.2, 0.22, 6, material), half: "a" }];
  },
  juice: "#c0102a",
};

export const starFruit: FruitSpec = {
  shape: STAR_FRUIT,
  cut: "across",
  fit: 0.85,
  skin: () => skinMaterial(plainSkin("#ffd83a", "#f2b200", 19), { roughness: 0.18, clearcoat: 1, emissive: "#ffae00", emissiveIntensity: 0.45 }),
  flesh: () => {
    const material = fleshMaterial(starFlesh(starOutline));
    material.emissive = new Color("#ffcc33");
    material.emissiveIntensity = 0.35;
    return material;
  },
  juice: "#ffe45a",
};

/** A scale that fades from the fruit's pink into a green tip. */
function scaleMaterial(): MeshPhysicalMaterial {
  const { c, ctx } = canvas(32, 128);
  const g = ctx.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, "#f0308a");
  g.addColorStop(0.55, "#e8409a");
  g.addColorStop(0.85, "#9ccf3a");
  g.addColorStop(1, "#5aa028");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 128);
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  return new MeshPhysicalMaterial({ map, roughness: 0.35, clearcoat: 0.6, iridescence: 0.8, side: DoubleSide });
}

export const dragonfruit: FruitSpec = {
  shape: DRAGONFRUIT,
  cut: "along",
  fit: 0.9,
  skin: () => {
    const material = skinMaterial(dragonSkin(20), { roughness: 0.25, clearcoat: 0.9, emissive: "#ff2d9a", emissiveIntensity: 0.25 });
    material.iridescence = 1;
    material.iridescenceIOR = 1.4;
    return material;
  },
  flesh: () => fleshMaterial(dragonFlesh(uvOutline(DRAGONFRUIT))),
  attachments: () => {
    const material = scaleMaterial();
    const scales: Attachment[] = [];
    for (let i = 0; i < 18; i++) {
      const t = 0.22 + ((i * 0.37) % 1) * 0.66;
      const phi = i * 2.399;
      const r = DRAGONFRUIT.r(t, phi) * 0.96;
      const y = DRAGONFRUIT.y(t);
      const out = new Vector3(Math.sin(phi), 0, Math.cos(phi));
      const mesh = new Mesh(leafGeometry(0.5, 0.34, -0.5, 0.1), material);
      mesh.castShadow = true;
      place(mesh, out.clone().multiplyScalar(r).setY(y), out.clone().multiplyScalar(0.8).setY(1), 0);
      mesh.rotateY(Math.PI / 2);
      scales.push({ object: mesh, half: Math.sin(phi) >= 0 ? "a" : "b" });
    }
    return scales;
  },
  juice: "#f4f0f0",
};
