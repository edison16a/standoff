import * as THREE from "three";
import { TEAMS } from "../../teams";

const FONT = '"Arial Black", "Helvetica Neue", Impact, Arial, sans-serif';

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * One tile of the LED rail: each team's name on its colour, then a
 * stripe of both, 26 metres long. It repeats round the bowl, so the
 * names chase each other all the way round like a real ribbon board.
 */
export function ribbonTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 64, (ctx) => {
    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, 1024, 64);
    for (const team of [0, 1] as const) {
      const x = team * 512;
      const grad = ctx.createLinearGradient(x, 0, x + 440, 0);
      grad.addColorStop(0, TEAMS[team].dark);
      grad.addColorStop(0.5, TEAMS[team].color);
      grad.addColorStop(1, TEAMS[team].dark);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 4, 6, 440, 52);
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 40px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(TEAMS[team].name.toUpperCase(), x + 224, 34);
      // A chevron of the trim colour after each name.
      ctx.fillStyle = TEAMS[team].trim;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 456 + i * 16, 10);
        ctx.lineTo(x + 470 + i * 16, 32);
        ctx.lineTo(x + 456 + i * 16, 54);
        ctx.lineTo(x + 462 + i * 16, 54);
        ctx.lineTo(x + 476 + i * 16, 32);
        ctx.lineTo(x + 462 + i * 16, 10);
        ctx.fill();
      }
    }
  });
}

/**
 * A run of suites, 48 metres: tall panes of warm glass between dark
 * mullions, each box lit a little differently and a few dim, with a
 * darker band where the counter and seats sit inside.
 */
export function suitesTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 128, (ctx) => {
    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, 1024, 128);
    let seed = 41;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const box = 1024 / 12;
    for (let b = 0; b < 12; b++) {
      const lit = rand() < 0.15 ? 0.25 : 0.65 + rand() * 0.35;
      const warm = 0.85 + rand() * 0.15;
      const grad = ctx.createLinearGradient(0, 0, 0, 128);
      const tone = (k: number) => `rgb(${Math.round(255 * lit * k)},${Math.round(196 * lit * k * warm)},${Math.round(130 * lit * k * warm)})`;
      grad.addColorStop(0, tone(0.55));
      grad.addColorStop(0.55, tone(1));
      grad.addColorStop(1, tone(0.35));
      ctx.fillStyle = grad;
      ctx.fillRect(b * box + 3, 8, box - 6, 112);
      // Mullions between the panes, and the counter inside.
      ctx.fillStyle = "#0b0d12";
      for (let m = 1; m < 4; m++) ctx.fillRect(b * box + (m * box) / 4 - 1, 8, 2, 112);
      ctx.fillStyle = "rgba(10,10,14,0.55)";
      ctx.fillRect(b * box + 3, 84, box - 6, 36);
    }
  });
}
