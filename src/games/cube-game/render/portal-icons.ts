import * as THREE from "three";
import type { Mode } from "../engine/types";

const INK = "#10091f";
const SIZE = 256;
const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;
/** A lighter tint of the portal's colour, for the parts that catch the light. */
const tint = (hex: number, by: number) => `#${new THREE.Color(hex).lerp(new THREE.Color(0xffffff), by).getHexString()}`;

type Draw = (g: CanvasRenderingContext2D, colour: number) => void;

/** The cube, with the face every player's cube wears. */
const cube: Draw = (g, colour) => {
  g.fillStyle = INK;
  g.fillRect(38, 38, 180, 180);
  g.fillStyle = css(colour);
  g.fillRect(52, 52, 152, 152);
  g.fillStyle = INK;
  g.fillRect(92, 92, 72, 72);
  g.fillStyle = tint(colour, 0.55);
  g.fillRect(100, 100, 56, 56);
  g.fillStyle = INK;
  g.fillRect(110, 110, 11, 18);
  g.fillRect(135, 110, 11, 18);
  g.fillRect(108, 138, 40, 8);
};

/** A saucer with the cube riding under its glass dome. */
const ufo: Draw = (g, colour) => {
  g.lineWidth = 12;
  g.strokeStyle = INK;
  g.fillStyle = tint(colour, 0.7);
  g.beginPath();
  g.arc(128, 128, 54, Math.PI, 0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = css(colour);
  g.fillRect(104, 88, 48, 40);
  g.strokeRect(104, 88, 48, 40);
  g.fillStyle = INK;
  g.fillRect(114, 98, 8, 12);
  g.fillRect(134, 98, 8, 12);
  g.fillStyle = css(colour);
  g.beginPath();
  g.ellipse(128, 142, 104, 36, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = tint(colour, 0.6);
  for (const x of [72, 128, 184]) {
    g.beginPath();
    g.arc(x, 146, 9, 0, Math.PI * 2);
    g.fill();
  }
};

/** The ball, in bold wedges so it reads as rolling. */
const ball: Draw = (g, colour) => {
  g.save();
  g.beginPath();
  g.arc(128, 128, 88, 0, Math.PI * 2);
  g.clip();
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? tint(colour, 0.6) : css(colour);
    g.beginPath();
    g.moveTo(128, 128);
    g.arc(128, 128, 90, (i * Math.PI) / 2 - Math.PI / 4, ((i + 1) * Math.PI) / 2 - Math.PI / 4);
    g.fill();
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 14;
  g.beginPath();
  g.arc(128, 128, 88, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 8;
  g.beginPath();
  g.arc(128, 128, 30, 0, Math.PI * 2);
  g.stroke();
};

const DRAW: Record<Mode, Draw> = { cube, ufo, ball };

/**
 * A picture of the form a portal turns the player into, drawn once per
 * mode, so each ring says plainly what comes through it. A soft dark disc
 * behind keeps it readable against any sky.
 */
export function portalIcon(mode: Mode, colour: number): THREE.CanvasTexture {
  const element = document.createElement("canvas");
  element.width = element.height = SIZE;
  const g = element.getContext("2d")!;
  const shade = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  shade.addColorStop(0, "rgba(10,4,24,0.55)");
  shade.addColorStop(1, "rgba(10,4,24,0)");
  g.fillStyle = shade;
  g.fillRect(0, 0, SIZE, SIZE);
  g.lineJoin = "round";
  // The saucer is wide and flat, so it is drawn a little bigger to weigh the same as the others.
  const zoom = mode === "ufo" ? 1.2 : 1;
  g.translate(128, 128);
  g.scale(zoom, zoom);
  g.translate(-128, -128);
  DRAW[mode](g, colour);
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}
