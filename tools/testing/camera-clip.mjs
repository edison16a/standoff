#!/usr/bin/env node
// Makes a fake webcam clip of one or two people from a still photo, for
// testing the camera kit with the real pose model. Chromium plays it as
// its camera with --use-file-for-fake-video-capture (see camera-e2e.mjs).
//
// The photo is cut around one standing person and placed once per
// player. Each copy then moves over time: a jump, a duck, a step to the
// side and back, and stepping out of view and back in. Positions below
// are in the mirrored picture the kit uses, so player 1 is on the left.
//
//   node tools/testing/camera-clip.mjs --photo person.jpg --crop 217,150,340,874 \
//     --out clip.mjpeg --ffmpeg /path/to/ffmpeg [--players 2] [--width 1280 --height 720] [--slow 1]
//
// --crop is x,y,width,height in the photo: a tall box around the person,
// head to feet. A CC0 or public domain photo of someone standing facing
// the camera works best. The script prints the timeline as JSON, so a
// test knows when each move happens. The clip loops in Chromium. On a
// machine that tracks only a frame every few seconds, --slow 8 holds every
// pose eight times longer, and a smaller --width and --height keep the file small.
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    photo: { type: "string" },
    crop: { type: "string" },
    out: { type: "string", default: "clip.mjpeg" },
    ffmpeg: { type: "string", default: "ffmpeg" },
    players: { type: "string", default: "2" },
    width: { type: "string", default: "1280" },
    height: { type: "string", default: "720" },
    slow: { type: "string", default: "1" },
  },
});
if (!values.photo || !values.crop) {
  console.error("Usage: camera-clip.mjs --photo person.jpg --crop x,y,w,h --out clip.mjpeg [--ffmpeg path] [--players 1|2]");
  process.exit(1);
}

const W = Number(values.width);
const H = Number(values.height);
const players = values.players === "1" ? 1 : 2;
const [cx, cy, cw, ch] = values.crop.split(",").map(Number);
// Each person is about 80 percent of the picture's height, feet near the bottom.
const personHeight = Math.round(H * 0.89);
const personWidth = Math.round((cw * personHeight) / ch / 2) * 2;
const top = H - personHeight - Math.round(H * 0.03);

// Moves in seconds. Heights are in pixels of the clip, positive x is to the player's right.
const slow = Math.max(1, Number(values.slow));
const SECONDS = 26 * slow;
const spots = players === 1 ? [0.5] : [0.28, 0.72];
const moves = players === 1
  ? [
      { player: 1, move: "jump", from: 6, to: 7.45, lift: 0.085 },
      { player: 1, move: "duck", from: 9, to: 10.8, drop: 0.13 },
      { player: 1, move: "step", from: 12, to: 14.4, dx: 0.1 },
      { player: 1, move: "step", from: 16, to: 18.4, dx: -0.1 },
    ]
  : [
      { player: 1, move: "jump", from: 6, to: 7.45, lift: 0.085 },
      { player: 2, move: "duck", from: 9, to: 10.8, drop: 0.13 },
      { player: 1, move: "step", from: 12, to: 14.4, dx: 0.09 },
      { player: 2, move: "step", from: 16, to: 18.4, dx: -0.09 },
      { player: 2, move: "away", from: 20, to: 22.5, dx: 0.5 },
    ];
// A slow machine may track only a frame every few seconds, so --slow holds every move longer. Moves stay quick.
const timeline = moves.map((m) => ({ ...m, from: m.from * slow, to: m.to * slow }));

/** A 0 to 1 ramp in ffmpeg's expression language, over `ramp` seconds from `at`. */
const rise = (at, ramp) => `clip((t-${at})/${ramp},0,1)`;
/** Up to 1 at `from`, back to 0 by `to`, with quarter second ramps. */
const pulse = (from, to, ramp = 0.25) => `(${rise(from, ramp)}-${rise(to - ramp, ramp)})`;

function position(player) {
  const mine = timeline.filter((m) => m.player === player);
  // The camera's own picture is the mirror image of what the kit shows, so x is flipped here.
  const x = [`${Math.round((1 - spots[player - 1]) * W - personWidth / 2)}`];
  const y = [`${top}`];
  for (const m of mine) {
    if (m.move === "jump") y.push(`-${Math.round(m.lift * H)}*${pulse(m.from, m.to)}`);
    if (m.move === "duck") y.push(`+${Math.round(m.drop * H)}*${pulse(m.from, m.to, 0.3)}`);
    if (m.move === "step" || m.move === "away") x.push(`-${Math.round(m.dx * W)}*${pulse(m.from, m.to, 0.4)}`);
  }
  return { x: x.join(""), y: y.join("") };
}

const people = Array.from({ length: players }, (_, i) => position(i + 1));
const split = players === 2 ? "split[p1][p2raw];[p2raw]hflip[p2]" : "null[p1]";
let graph = `[0:v]crop=${cw}:${ch}:${cx}:${cy},scale=${personWidth}:${personHeight},${split};color=c=0x34363d:s=${W}x${H}:r=30[bg]`;
let last = "bg";
people.forEach((p, i) => {
  graph += `;[${last}][p${i + 1}]overlay=x='${p.x}':y='${p.y}':eval=frame:shortest=0[s${i}]`;
  last = `s${i}`;
});
graph += `;[${last}]format=yuvj420p[v]`;

const format = values.out.endsWith(".y4m") ? ["-pix_fmt", "yuv420p", "-f", "yuv4mpegpipe"] : ["-q:v", "4", "-f", "mjpeg"];
const args = ["-loglevel", "error", "-y", "-loop", "1", "-framerate", "30", "-i", values.photo, "-filter_complex", graph, "-map", "[v]", "-t", String(SECONDS), "-r", "30", ...format, values.out];
const run = spawnSync(values.ffmpeg, args, { stdio: "inherit" });
if (run.status !== 0) process.exit(run.status ?? 1);
console.log(JSON.stringify({ out: values.out, seconds: SECONDS, width: W, height: H, spots, timeline }, null, 2));
