import * as THREE from "three";
import { canvasTexture } from "../../kit/textures";

/**
 * Pixel art for the Block Hero, painted one square at a time from a tiny
 * grid and shown with nearest filtering, so the pixels stay crisp squares
 * however close the camera gets.
 */
function pixelArt(key: string, rows: string[], palette: Record<string, string>): THREE.CanvasTexture {
  const size = rows.length;
  const texture = canvasTexture(key, (ctx, w) => {
    const cell = w / size;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const colour = palette[row[x]!];
        if (!colour) continue;
        ctx.fillStyle = colour;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    });
  }, { width: 64, repeat: false });
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** The face: bold brows, big eyes with a glint, a stripe of war paint in the player's colour, a set jaw. */
export function blockFace(trim: string): THREE.CanvasTexture {
  return pixelArt(
    `block-face:${trim}`,
    [
      "ssssssss",
      "bbbssbbb",
      "swksskws",
      "skkssKKs",
      "tsssssst",
      "ssssssss",
      "ssmmmmss",
      "SSSSSSSS",
    ],
    { s: "#f0b489", S: "#d99a6c", b: "#4a2c1a", w: "#ffffff", k: "#1e2a4a", K: "#1e2a4a", m: "#8a4a36", t: trim },
  );
}

/** The emblem on the tunic: a gold shield with a pixel star. */
export function blockEmblem(): THREE.CanvasTexture {
  return pixelArt(
    "block-emblem",
    [
      "..........",
      ".oooooooo.",
      ".ogggggggo",
      ".oggwwgggo",
      ".ogwwwwggo",
      ".oggwwgggo",
      ".ogwggwggo",
      "..oggggoo.",
      "...oggoo..",
      "....oo....",
    ].map((row) => row.padEnd(10, ".")),
    { o: "#7a4a10", g: "#ffc83d", w: "#fff6d0" },
  );
}
