import * as THREE from "three";
import { CORNER_Z } from "../../engine/court";
import { COURT, RIM } from "../../engine/tuning";
import { TEAMS } from "../../roster";
import { centreLogo } from "./floor-logo";

/** The floor the texture covers, in court metres. It runs past the lines onto the apron. */
export const FLOOR = { minX: -10, maxX: 10, minZ: -3, maxZ: 14 } as const;

const PX = 110;
const MAPLE = "#e2b47a";
const KEY = "#4c2490";
const APRON = "#1a2148";
const LINE = "#f6f4ee";

/**
 * Two layers drawn together: the colour, and how much of the wood's
 * grain shows through it (white for bare maple, grey for a stain that
 * lets the boards read through, near black for the painted lines).
 */
interface Layers {
  colour: CanvasRenderingContext2D;
  grain: CanvasRenderingContext2D;
}

function fill(l: Layers, colour: string, grain: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  const g = Math.round(grain * 255);
  for (const [ctx, style] of [[l.colour, colour], [l.grain, `rgb(${g},${g},${g})`]] as const) {
    ctx.save();
    ctx.fillStyle = style;
    ctx.strokeStyle = style;
    draw(ctx);
    ctx.restore();
  }
}

/**
 * Paints the court over the maple: a stained navy apron, the purple key
 * stained so the boards read through it, crisp white lines, the centre
 * court logo, the arena's name behind the baseline and the two teams'
 * names along the sidelines. The colour is the texture's red, green and
 * blue; alpha says how much grain shows (see `floor.ts`).
 */
export function floorTexture(): THREE.DataTexture {
  const w = Math.round((FLOOR.maxX - FLOOR.minX) * PX);
  const h = Math.round((FLOOR.maxZ - FLOOR.minZ) * PX);
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c.getContext("2d")!;
  };
  const l: Layers = { colour: make(), grain: make() };
  const X = (x: number) => (x - FLOOR.minX) * PX;
  const Z = (z: number) => (z - FLOOR.minZ) * PX;
  const rect = (x0: number, z0: number, x1: number, z1: number) => (ctx: CanvasRenderingContext2D) => ctx.fillRect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX);

  fill(l, APRON, 0.6, rect(FLOOR.minX, FLOOR.minZ, FLOOR.maxX, FLOOR.maxZ));
  fill(l, MAPLE, 1, rect(-COURT.halfWidth, 0, COURT.halfWidth, COURT.depth + 0.6));
  fill(l, KEY, 0.5, rect(-COURT.keyHalfWidth, 0, COURT.keyHalfWidth, COURT.keyDepth));
  // The lines, five centimetres wide.
  fill(l, LINE, 0.08, (ctx) => {
    ctx.lineWidth = 0.05 * PX;
    ctx.strokeRect(X(-COURT.halfWidth), Z(0), COURT.halfWidth * 2 * PX, COURT.depth * PX);
    ctx.strokeRect(X(-COURT.keyHalfWidth), Z(0), COURT.keyHalfWidth * 2 * PX, COURT.keyDepth * PX);
    const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
      ctx.beginPath();
      ctx.arc(X(cx), Z(cz), r * PX, a0, a1);
      ctx.stroke();
    };
    arc(0, COURT.keyDepth, 1.8, 0, Math.PI * 2);
    arc(RIM.x, RIM.z, 1.25, 0, Math.PI);
    arc(0, COURT.depth, 1.8, Math.PI, Math.PI * 2);
    // The three point line: straight in the corners, then the arc.
    const start = Math.atan2(CORNER_Z - RIM.z, COURT.cornerX);
    ctx.beginPath();
    ctx.moveTo(X(COURT.cornerX), Z(0));
    ctx.lineTo(X(COURT.cornerX), Z(CORNER_Z));
    ctx.arc(X(RIM.x), Z(RIM.z), COURT.arcRadius * PX, start, Math.PI - start);
    ctx.lineTo(X(-COURT.cornerX), Z(0));
    ctx.stroke();
    // Hash marks on the lane and the short lines that mark the coaches' boxes on the sidelines.
    for (const side of [-1, 1]) {
      for (const z of [1.75, 2.6, 3.45, 4.3]) ctx.fillRect(X(side > 0 ? COURT.keyHalfWidth : -COURT.keyHalfWidth - 0.2), Z(z) - 0.025 * PX, 0.2 * PX, 0.05 * PX);
      ctx.fillRect(X(side * COURT.halfWidth) - (side > 0 ? 0 : 0.6 * PX), Z(8.325), 0.6 * PX, 0.05 * PX);
    }
  });
  centreLogo((colour, grain, draw) => fill(l, colour, grain, draw), X(0), Z(COURT.depth), 1.75 * PX);

  const words = (text: string, colour: string, grain: number, x: number, z: number, size: number, turn: number) =>
    fill(l, colour, grain, (ctx) => {
      ctx.translate(X(x), Z(z));
      ctx.rotate(turn);
      ctx.font = `italic 900 ${size * PX}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
    });
  words("STANDOFF  ARENA", "#f1f3f8", 0.22, 0, -1.55, 0.9, 0);
  words(TEAMS[0].name.toUpperCase(), TEAMS[0].color, 0.3, -8.75, 5.5, 1.15, -Math.PI / 2);
  words(TEAMS[1].name.toUpperCase(), TEAMS[1].color, 0.3, 8.75, 5.5, 1.15, Math.PI / 2);

  const colour = l.colour.getImageData(0, 0, w, h).data;
  const grain = l.grain.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(colour.length);
  data.set(colour);
  for (let i = 3; i < data.length; i += 4) data[i] = grain[i - 1]!;
  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  // Canvas rows run top down; the floor's UVs run bottom up.
  texture.flipY = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
