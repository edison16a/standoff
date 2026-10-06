import { FIELD, YARD } from "../../engine/field";
import { DIGIT, WORD } from "./paint-glyphs";

const f = (n: number) => n.toFixed(5);

/**
 * The painted marks as maths, evaluated per pixel on the turf: every line
 * box filtered against the pixel's own footprint, so lines stay crisp up
 * close and fade evenly into the distance instead of flickering. The
 * numerals and the end zone words are read from distance field atlases
 * (paint-glyphs.ts), sharp at any size.
 */
export const PAINT_GLSL = /* glsl */ `
#define YD ${f(YARD)}
#define HW ${f(FIELD.halfWidth)}
#define GOAL_X ${f(FIELD.goalX)}
#define END_X ${f(FIELD.endX)}
#define HASH_Z ${f(FIELD.hashZ)}
#define BORDER 1.83
#define LINE_H 0.0508

uniform sampler2D tDigits;
uniform sampler2D tWords;
uniform vec3 uTeamA;
uniform vec3 uTeamB;
uniform vec3 uTrimA;
uniform vec3 uTrimB;

/** Box filtered coverage of a band of half width h, d from its middle, under a footprint fw wide. */
float band(float d, float h, float fw) {
  float a = clamp(d + 0.5 * fw, -h, h);
  float b = clamp(d - 0.5 * fw, -h, h);
  return (a - b) / fw;
}
float span(float c, float lo, float hi, float fw) { return band(c - 0.5 * (lo + hi), 0.5 * (hi - lo), fw); }
/** Coverage from a signed distance in metres, softened over the footprint. */
float inside(float sd, float fw) { return clamp(0.5 - sd / fw, 0.0, 1.0); }

float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

/** Signed distance in metres to a digit drawn in a w by h box, (g) from 0 to 1 across it, or a large number off its cell. */
float digitDistance(float d, vec2 g, float w) {
  vec2 inner = vec2(${f(DIGIT.cellW - 2 * DIGIT.pad)}, ${f(DIGIT.cellH - 2 * DIGIT.pad)});
  vec2 px = vec2(${f(DIGIT.pad)}, ${f(DIGIT.pad)}) + vec2(g.x, 1.0 - g.y) * inner;
  if (px.x < 1.0 || px.y < 1.0 || px.x > ${f(DIGIT.cellW - 1)} || px.y > ${f(DIGIT.cellH - 1)}) return 1.0;
  vec2 uv = vec2((d * ${f(DIGIT.cellW)} + px.x) / ${f(DIGIT.cellW * DIGIT.count)}, px.y / ${f(DIGIT.cellH)});
  float v = texture2D(tDigits, uv).r * 255.0;
  return (128.0 - v) / 127.0 * ${f(DIGIT.spread)} * (w / inner.x);
}

float wordDistance(float row, vec2 g, float w) {
  vec2 inner = vec2(${f(WORD.w - 2 * WORD.pad)}, ${f(WORD.h - 3 * WORD.pad)});
  vec2 px = vec2(${f(WORD.pad)}, ${f(WORD.pad * 1.5)}) + vec2(g.x, 1.0 - g.y) * inner;
  if (px.x < 1.0 || px.y < 1.0 || px.x > ${f(WORD.w - 1)} || px.y > ${f(WORD.h - 1)}) return 1.0;
  vec2 uv = vec2(px.x / ${f(WORD.w)}, (row * ${f(WORD.h)} + px.y) / ${f(WORD.h * 2)});
  float v = texture2D(tWords, uv).r * 255.0;
  return (128.0 - v) / 127.0 * ${f(WORD.spread)} * (w / inner.x);
}

/** Lays a paint colour over what is there by its coverage. */
void lay(inout vec4 paint, vec3 colour, float cover) {
  paint.rgb = mix(paint.rgb, colour, cover);
  paint.a = max(paint.a, cover);
}

/** Everything painted at field point p (x along, y across), with fw its footprint: colour, and how much paint. */
vec4 fieldPaint(vec2 p, vec2 fw) {
  vec4 paint = vec4(0.0);
  float ax = abs(p.x);
  float az = abs(p.y);
  float aa = max(fw.x, fw.y);
  vec3 white = vec3(0.78);
  // The end zones in team colour, each team's name across it, white with a trim edge.
  float zone = span(ax, GOAL_X + LINE_H * 2.0, END_X, fw.x) * span(p.y, -HW, HW, fw.y);
  float team = step(0.0, p.x);
  lay(paint, mix(uTeamA, uTeamB, team), zone * 0.94);
  if (ax > GOAL_X) {
    float s = sign(p.x);
    vec2 g = vec2((s * p.y + 18.0) / 36.0, (s * (p.x - s * (GOAL_X + END_X) * 0.5) + 3.4) / 6.8);
    float sd = wordDistance(team, g, 36.0);
    lay(paint, mix(uTrimA, uTrimB, team), inside(sd - 0.3, aa) * zone);
    lay(paint, white, inside(sd, aa) * zone);
  }
  // The star in a ring at midfield.
  vec2 m = vec2(p.x, -p.y);
  float r = length(m);
  lay(paint, vec3(0.012, 0.03, 0.09), inside(r - 3.4, aa) * 0.95);
  lay(paint, white, band(r - 3.25, 0.12, aa));
  lay(paint, vec3(0.9, 0.55, 0.02), inside(sdStar5(m, 2.2, 0.45), aa));
  // Yard lines every five yards, the goal lines twice as wide.
  float k5 = floor(p.x / (5.0 * YD) + 0.5);
  float goal = step(9.5, abs(k5));
  float lines = band(p.x - k5 * 5.0 * YD, LINE_H * (1.0 + goal), fw.x) * step(abs(k5), 10.0) * span(p.y, -HW, HW, fw.y);
  // Hash marks at every other yard: along both sidelines and both inbound rows; the try line at the 2.
  float k1 = floor(p.x / YD + 0.5);
  float tick = band(p.x - k1 * YD, LINE_H, fw.x) * step(0.5, abs(mod(k1, 5.0))) * step(abs(k1), 49.5);
  float rows = span(az, HW - 0.71, HW - 0.1, fw.y) + span(az, HASH_Z, HASH_Z + 0.61, fw.y);
  rows += step(47.5, abs(k1)) * step(abs(k1), 48.5) * span(p.y, -0.46, 0.46, fw.y);
  lines = max(lines, tick * rows);
  // The six foot white border round the whole field.
  float outer = span(p.x, -END_X - BORDER, END_X + BORDER, fw.x) * span(p.y, -HW - BORDER, HW + BORDER, fw.y);
  float inner = span(p.x, -END_X, END_X, fw.x) * span(p.y, -HW, HW, fw.y);
  lines = max(lines, outer - inner);
  lay(paint, white, lines);
  // The numbers 10 to 50, read from their own sideline, with arrows toward the nearer goal.
  float k10 = floor(p.x / (10.0 * YD) + 0.5);
  float side = sign(p.y);
  float numZ = HW - 11.0 * YD;
  if (abs(k10) <= 4.0 && abs(az - numZ) < 1.4) {
    float u = side * (p.x - k10 * 10.0 * YD);
    float v = -side * (p.y - side * numZ);
    float w = 1.15;
    float h = 2.0 * YD;
    float gap = 0.34;
    float tens = 5.0 - abs(k10);
    float sd = u < 0.0 ? digitDistance(tens, vec2((u + gap + w) / w, (v + h * 0.5) / h), w) : digitDistance(0.0, vec2((u - gap) / w, (v + h * 0.5) / h), w);
    float num = inside(sd, aa);
    if (k10 != 0.0) {
      float dir = sign(k10) * side;
      float au = dir * u - (gap + w + 0.2);
      float av = v - (h * 0.5 - 0.42);
      float tri = max(-au, abs(av) - 0.42 * (1.0 - au / 0.48));
      num = max(num, inside(tri * 0.8, aa));
    }
    lay(paint, white, num);
  }
  // The coaches' box on each sideline, a yellow line between the 25s.
  lay(paint, vec3(0.85, 0.62, 0.02), band(az - (HW + BORDER * 2.0), LINE_H, fw.y) * span(ax, 0.0, 25.0 * YD, fw.x));
  return paint;
}
`;
