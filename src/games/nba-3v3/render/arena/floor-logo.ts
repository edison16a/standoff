/** Draws one shape in a colour, with how much of the wood's grain shows through it (see `floor-texture.ts`). */
export type Paint = (colour: string, grain: number, draw: (ctx: CanvasRenderingContext2D) => void) => void;

const STAIN = "#3a1c70";
const GOLD = "#f2b33d";
const ORANGE = "#ef6c1f";
const SEAM = "#2a1408";
const WHITE = "#f6f4ee";
const NAVY = "#141a3c";

/**
 * The centre court logo, the game's own: a stained disc with a gold
 * ring, a ball with its seams, "3V3" across it in big italic capitals
 * and the arena's name arched over the top. The half court line runs
 * through it, as on a real floor. Upright to the broadcast camera.
 */
export function centreLogo(paint: Paint, x: number, y: number, r: number): void {
  const circle = (radius: number) => (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  paint(STAIN, 0.5, circle(r * 0.97));
  paint(GOLD, 0.15, (ctx) => {
    ctx.lineWidth = r * 0.035;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
    ctx.stroke();
  });
  // The ball, a little low so the name fits over it.
  const by = y + r * 0.08;
  const br = r * 0.44;
  paint(ORANGE, 0.25, (ctx) => {
    ctx.beginPath();
    ctx.arc(x, by, br, 0, Math.PI * 2);
    ctx.fill();
  });
  paint(SEAM, 0.2, (ctx) => {
    ctx.lineWidth = r * 0.022;
    ctx.beginPath();
    ctx.arc(x, by, br, 0, Math.PI * 2);
    ctx.moveTo(x - br, by);
    ctx.lineTo(x + br, by);
    ctx.moveTo(x, by - br);
    ctx.lineTo(x, by + br);
    ctx.stroke();
    // The two curved seams, each bowing in from its side.
    ctx.beginPath();
    ctx.ellipse(x - br * 1.05, by, br * 0.62, br * 0.92, 0, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + br * 1.05, by, br * 0.62, br * 0.92, 0, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
  });
  paint(WHITE, 0.1, (ctx) => {
    ctx.font = `italic 900 ${r * 0.56}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = NAVY;
    ctx.strokeText("3V3", x, by + r * 0.02);
    ctx.fillText("3V3", x, by + r * 0.02);
  });
  // The arena's name round the top inside the ring, one letter at a time.
  paint(WHITE, 0.15, (ctx) => {
    const text = "STANDOFF";
    const spread = Math.PI * 0.62;
    ctx.font = `900 ${r * 0.15}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    [...text].forEach((ch, i) => {
      const a = -Math.PI / 2 - spread / 2 + (spread * (i + 0.5)) / text.length;
      ctx.save();
      ctx.translate(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  });
}
