import type * as THREE from "three";
import { EN_GARDE_X, STRIP_HALF_LENGTH } from "@/games/fencing/engine/rules";
import { canvasTexture } from "../kit/textures";

/** Pixels per metre along the strip's texture. */
const STRIP_PX = 140;
/** The strip is 1.6 m wide, painted across this many pixels. */
export const STRIP_WIDTH = 1.6;
/** The last two metres at each end warn a fencer the back of the strip is near. */
const WARNING_ZONE = 2;

/**
 * The strip's surface: fine conductive mesh with the regulation markings,
 * the centre line, both en garde lines, the warning zones and the end
 * lines, plus the event's logo faintly in the middle. It covers the strip
 * from end to end, texture x running along the strip.
 */
export function pisteTexture(base: string): THREE.CanvasTexture {
  const length = STRIP_HALF_LENGTH * 2;
  return canvasTexture(`piste:${base}`, (ctx, w, h, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // The weave of the metal mesh, as fine light and dark speckle.
    for (let i = 0; i < 26000; i++) {
      const light = rand() < 0.5;
      ctx.fillStyle = light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
    const x = (metres: number) => (metres + STRIP_HALF_LENGTH) * STRIP_PX;
    // Warning zones, tinted, then the lines over everything.
    ctx.fillStyle = "rgba(255,120,60,0.28)";
    ctx.fillRect(x(-STRIP_HALF_LENGTH), 0, WARNING_ZONE * STRIP_PX, h);
    ctx.fillRect(x(STRIP_HALF_LENGTH - WARNING_ZONE), 0, WARNING_ZONE * STRIP_PX, h);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const line = (metres: number, width = 7) => ctx.fillRect(x(metres) - width / 2, 0, width, h);
    line(0, 8);
    line(-EN_GARDE_X);
    line(EN_GARDE_X);
    line(-STRIP_HALF_LENGTH + WARNING_ZONE, 5);
    line(STRIP_HALF_LENGTH - WARNING_ZONE, 5);
    line(-STRIP_HALF_LENGTH + 4, 3);
    line(STRIP_HALF_LENGTH - 4, 3);
    ctx.fillRect(0, 0, w, 5);
    ctx.fillRect(0, h - 5, w, 5);
    ctx.fillRect(0, 0, 10, h);
    ctx.fillRect(w - 10, 0, 10, h);
    // The logo at the centre, faint, either side of the line.
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#ffffff";
    ctx.font = `italic 900 ${Math.round(h * 0.36)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("STANDOFF", x(-1), h / 2);
    ctx.fillText("FENCING", x(1), h / 2);
    ctx.restore();
  }, { width: length * STRIP_PX, height: Math.round(STRIP_WIDTH * STRIP_PX), repeat: false });
}

/** A sports hall floor of long maple boards. */
export function woodTexture(): THREE.CanvasTexture {
  return canvasTexture("wood", (ctx, w, h, rand) => {
    const rows = 8;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * w * 0.5;
      while (x < w) {
        const len = w * (0.35 + rand() * 0.4);
        const tone = 190 + (rand() - 0.5) * 38;
        ctx.fillStyle = `rgb(${tone},${tone * 0.78},${tone * 0.55})`;
        ctx.fillRect(x, r * rowH, len, rowH);
        // Grain running along the board.
        for (let g = 0; g < 10; g++) {
          ctx.strokeStyle = `rgba(90,50,20,${0.05 + rand() * 0.07})`;
          ctx.lineWidth = 0.6 + rand();
          const y = r * rowH + rand() * rowH;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + len * 0.3, y + (rand() - 0.5) * 4, x + len * 0.7, y + (rand() - 0.5) * 4, x + len, y);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(60,30,10,0.35)";
        ctx.fillRect(x, r * rowH, 1.5, rowH);
        x += len;
      }
      ctx.fillStyle = "rgba(60,30,10,0.4)";
      ctx.fillRect(0, r * rowH, w, 1.5);
    }
  }, { width: 1024, height: 1024 });
}

/**
 * The ribbon board along the front of the stands, like any arena's. It is
 * tiled along the board and scrolled, so the words slide slowly past.
 */
export function boardTexture(accent: string): THREE.CanvasTexture {
  return canvasTexture(`board:${accent}`, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0d0f22");
    bg.addColorStop(1, "#1a1240");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const words = ["STANDOFF", "EN GARDE", "FENCING", "ALLEZ"];
    ctx.font = `italic 900 ${Math.round(h * 0.56)}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = "middle";
    let x = 20;
    words.forEach((word, i) => {
      ctx.fillStyle = i % 2 === 0 ? "#ffffff" : accent;
      ctx.fillText(word, x, h / 2 + 2);
      x += ctx.measureText(word).width + 40;
      ctx.fillStyle = i % 2 === 0 ? "#ff4757" : "#2ed573";
      ctx.beginPath();
      ctx.moveTo(x - 24, h * 0.3);
      ctx.lineTo(x - 8, h * 0.5);
      ctx.lineTo(x - 24, h * 0.7);
      ctx.fill();
      x += 20;
    });
    // LED pixels: a fine dark grid over everything.
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    for (let gx = 0; gx < w; gx += 4) ctx.fillRect(gx, 0, 1, h);
    for (let gy = 0; gy < h; gy += 4) ctx.fillRect(0, gy, w, 1);
  }, { width: 1024, height: 64 });
}

/** A hanging banner with a big word on it, for the back wall. */
export function bannerTexture(word: string, background: string, ink: string): THREE.CanvasTexture {
  return canvasTexture(`banner:${word}:${background}`, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ink;
    ctx.fillRect(0, h * 0.06, w, h * 0.025);
    ctx.fillRect(0, h * 0.915, w, h * 0.025);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `italic 900 ${Math.round(w * 0.5)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }, { width: 128, height: 512, repeat: false });
}
