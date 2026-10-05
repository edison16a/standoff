import type { CharacterId } from "../../../characters";
import { REGIONS, sidewallRegion } from "./atlas-layout";
import { inRegion, type Ctx } from "./atlas-draw";

const RUBBER = "#26262b";
const GROOVE = "#0b0b0d";

/** One tile of each tread, running round the tyre (across) and over its width (down). */
export function drawTyres(ctx: Ctx): void {
  inRegion(ctx, REGIONS.treadRace, (w, h) => {
    shadeCrown(ctx, w, h);
    // Three channels round the tyre and swept sipes between them, like a road racing tyre.
    ctx.fillStyle = GROOVE;
    for (const v of [0.3, 0.5, 0.7]) ctx.fillRect(0, h * v - 4, w, 8);
    ctx.strokeStyle = GROOVE;
    ctx.lineWidth = 5;
    for (let x = -w; x < w * 2; x += 32) {
      for (const [from, to] of [[0.08, 0.28], [0.72, 0.92]] as const) {
        ctx.beginPath();
        ctx.moveTo(x, h * from);
        ctx.lineTo(x + (to - from) * h * 0.6, h * to);
        ctx.stroke();
      }
    }
  });
  inRegion(ctx, REGIONS.treadKnobby, (w, h) => {
    ctx.fillStyle = GROOVE;
    ctx.fillRect(0, 0, w, h);
    // Staggered blocks with lit tops, so they read as raised lugs.
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const y = (r / rows) * h + 6;
      const offset = r % 2 ? w / 4 : 0;
      for (let x = -w / 2 + offset; x < w; x += w / 2) {
        const g = ctx.createLinearGradient(0, y, 0, y + h / rows - 12);
        g.addColorStop(0, "#4a4a52");
        g.addColorStop(1, "#2a2a30");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x + 6, y, w / 2 - 14, h / rows - 12, 6);
        ctx.fill();
      }
    }
  });
  inRegion(ctx, REGIONS.treadRib, (w, h) => {
    shadeCrown(ctx, w, h);
    ctx.strokeStyle = GROOVE;
    ctx.lineWidth = 4;
    for (const v of [0.22, 0.4, 0.6, 0.78]) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * v + ((x / 16) % 2 ? 6 : -6));
      ctx.stroke();
    }
  });
  for (const id of ["blaze", "pip", "nova", "mochi"] as const) drawSidewall(ctx, id);
}

/** The crown is a touch lighter in the middle where it wears, darker at the shoulders. */
function shadeCrown(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a1a1e");
  g.addColorStop(0.5, "#34343a");
  g.addColorStop(1, "#1a1a1e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

interface SidewallStyle {
  top: string;
  bottom: string;
  ink: string;
  /** A coloured or white band round the sidewall. */
  band?: { color: string; from: number; to: number };
}

const SIDEWALLS: Record<CharacterId, SidewallStyle> = {
  blaze: { top: "MAGIC GRIP", bottom: "RACE SOFT", ink: "#d8d8de", band: { color: "#ffc21a", from: 0.705, to: 0.725 } },
  pip: { top: "TERRA CLAW", bottom: "ALL TERRAIN", ink: "#ffd23f" },
  nova: { top: "ORBIT", bottom: "ZERO DRAG", ink: "#c9f6ff", band: { color: "#5ff2ff", from: 0.66, to: 0.68 } },
  mochi: { top: "PUFF ROLL", bottom: "CLASSIC", ink: "#6a6a72", band: { color: "#f6f2ea", from: 0.68, to: 0.9 } },
};

/**
 * A sidewall seen face on: rubber shaded like a bulge, the rim bead, and
 * raised lettering set round the circle. The tyre maps it flat across its
 * side, so radius 1 here is the tyre's outer edge.
 */
function drawSidewall(ctx: Ctx, id: CharacterId): void {
  const style = SIDEWALLS[id];
  inRegion(ctx, sidewallRegion(id), (w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, c * 0.55, c, c, c);
    g.addColorStop(0, "#1b1b1f");
    g.addColorStop(0.6, RUBBER);
    g.addColorStop(0.85, "#303036");
    g.addColorStop(1, "#18181b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    if (style.band) {
      ctx.strokeStyle = style.band.color;
      ctx.lineWidth = (style.band.to - style.band.from) * c;
      ctx.beginPath();
      ctx.arc(c, c, ((style.band.from + style.band.to) / 2) * c, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#3c3c44";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.63, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = style.ink;
    ctx.font = `900 ${Math.round(c * 0.13)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    arcText(ctx, style.top, c, c * 0.8, -Math.PI / 2, false);
    arcText(ctx, style.bottom, c, c * 0.8, Math.PI / 2, true);
  });
}

/** Writes text round a circle, centred on an angle, reading clockwise on top and anticlockwise underneath. */
function arcText(ctx: Ctx, text: string, centre: number, radius: number, at: number, under: boolean): void {
  const step = (ctx.measureText("M").width * 0.95) / radius;
  const start = at - (under ? -1 : 1) * (step * (text.length - 1)) / 2;
  [...text].forEach((ch, i) => {
    const a = start + (under ? -1 : 1) * i * step;
    ctx.save();
    ctx.translate(centre + Math.cos(a) * radius, centre + Math.sin(a) * radius);
    ctx.rotate(a + (under ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}
