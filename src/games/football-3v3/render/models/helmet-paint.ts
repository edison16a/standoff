import * as THREE from "three";
import { TEAMS, type TeamId } from "../../teams";
import { uvDirection } from "./helmet-shell";
import { drawLogo } from "./logos";

/**
 * The helmet's paint, laid out the way the shell's texture coordinates
 * are: a map projected from the face opening. Each texel is painted from
 * the spot on the shell it lands on, so the stripe keeps its width right
 * over the crown and the logo sits square on each side, facing forward.
 */

export interface HelmetLook {
  shell: string;
  stripe: string;
  /** The thin lines either side of the stripe. */
  pin: string;
  mask: string;
}

export const HELMETS: Record<TeamId, HelmetLook> = {
  0: { shell: TEAMS[0].dark, stripe: TEAMS[0].trim, pin: "#ffffff", mask: "#d9ad2b" },
  1: { shell: TEAMS[1].color, stripe: "#ffffff", pin: TEAMS[1].dark, mask: "#f2f2f0" },
};

const LOGO = 256;
/** The logo's middle on each side and its size, in degrees of longitude and latitude. */
const DECAL = { az: 90, el: 11, span: 50 } as const;
const EAR = { az: 99, el: -20, r: 6.5 } as const;

type RGB = readonly [number, number, number];
/** The canvas takes sRGB bytes straight from the hex. */
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** What a texel at (u, v) shows: the shell, the stripe, an ear hole, or a hit on the logo to look up. */
export function helmetTexel(u: number, v: number): { kind: "shell" | "stripe" | "pin" | "ear" | "earRim" } | { kind: "logo"; x: number; y: number } {
  const d = uvDirection(u, v);
  const az = (Math.atan2(d.x, d.z) * 180) / Math.PI;
  const el = (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI;
  // The stripe runs from the brim over the crown to the back edge.
  const x = Math.abs(d.x);
  if (x < 0.085) return { kind: "stripe" };
  if (x < 0.115) return { kind: "pin" };
  const side = Math.abs(az);
  const ear = Math.hypot(side - EAR.az, el - EAR.el);
  if (ear < EAR.r) return { kind: "ear" };
  if (ear < EAR.r + 2.2) return { kind: "earRim" };
  // The same mapping on both sides puts the logo's front toward the helmet's front.
  const lx = (DECAL.az - side) / DECAL.span + 0.5;
  const ly = 0.5 - (el - DECAL.el) / DECAL.span;
  if (lx > 0 && lx < 1 && ly > 0 && ly < 1) return { kind: "logo", x: lx, y: ly };
  return { kind: "shell" };
}

export function paintHelmet(team: TeamId, width: number): THREE.CanvasTexture {
  const look = HELMETS[team];
  const logo = document.createElement("canvas");
  logo.width = logo.height = LOGO;
  const lctx = logo.getContext("2d")!;
  drawLogo(lctx, team, LOGO);
  const mark = lctx.getImageData(0, 0, LOGO, LOGO).data;
  const height = width;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(width, height);
  const colours = { shell: rgb(look.shell), stripe: rgb(look.stripe), pin: rgb(look.pin), ear: rgb("#0c0c0c"), earRim: rgb("#5c5c5c") };
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const hit = helmetTexel((px + 0.5) / width, 1 - (py + 0.5) / height);
      let c: RGB = colours.shell;
      if (hit.kind === "logo") {
        const k = (Math.min(LOGO - 1, Math.floor(hit.y * LOGO)) * LOGO + Math.min(LOGO - 1, Math.floor(hit.x * LOGO))) * 4;
        const a = mark[k + 3]! / 255;
        c = [mark[k]! * a + c[0] * (1 - a), mark[k + 1]! * a + c[1] * (1 - a), mark[k + 2]! * a + c[2] * (1 - a)];
      } else c = colours[hit.kind];
      const o = (py * width + px) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
