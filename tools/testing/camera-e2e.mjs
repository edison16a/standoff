#!/usr/bin/env node
// An end to end check of the camera kit with the real pose model. Chromium
// plays a clip from camera-clip.mjs as its webcam, the kit downloads and
// runs the model, and this script checks that players are tracked in the
// right slots and that every scripted move is read. Needs the dev server.
//
//   node tools/testing/camera-e2e.mjs --clip clip.mjpeg --timeline clip.json \
//     [--url http://localhost:3100] [--out shots/] [--mirror model-files/]
//
// --mirror serves the model files from a local folder, downloading them
// once with curl, for machines whose browser cannot reach the CDN
// directly. Without it the browser downloads them itself.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values } = parseArgs({
  options: {
    clip: { type: "string" },
    timeline: { type: "string" },
    url: { type: "string", default: "http://localhost:3100" },
    out: { type: "string", default: "." },
    mirror: { type: "string" },
  },
});
if (!values.clip || !values.timeline) {
  console.error("Usage: camera-e2e.mjs --clip clip.mjpeg --timeline clip.json [--url] [--out] [--mirror]");
  process.exit(1);
}
const plan = JSON.parse(readFileSync(values.timeline, "utf8"));
const players = plan.spots.length;
mkdirSync(values.out, { recursive: true });
// Software rendering can stall a frame for a while as the model starts, so a slow screenshot is only noted.
const shot = (page, name) => page.screenshot({ path: join(values.out, `${name}.png`), timeout: 60000 }).catch((error) => log(`no ${name} screenshot:`, error.message.split("\n")[0]));
const log = (...parts) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s]`, ...parts);
const started = Date.now();

const args = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-video-capture=${values.clip}`,
];
const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
if (proxy && !values.mirror) args.push(`--proxy-server=${proxy.replace(/^https?:\/\//, "")}`, "--proxy-bypass-list=localhost;127.0.0.1");
const browser = await chromium.launch({ args });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
if (values.mirror) await serveMirror(context, values.mirror);
const page = await context.newPage();
page.on("pageerror", (error) => log("page error:", error.message));

// 1. The model downloads with progress, and the camera comes on.
await page.goto(`${values.url}/dev/camera?players=${players}`, { waitUntil: "domcontentloaded" });
let status = null;
for (let i = 0; i < 600 && !status?.ready; i++) {
  await page.waitForTimeout(500);
  status = await page.evaluate(() => window.__cameraKit?.status() ?? null);
  if (!status) continue;
  if (i % 10 === 0) log(`camera ${status.camera.state}, model ${status.model.state} ${(status.model.loaded / 1e6).toFixed(1)} of ${(status.model.total / 1e6).toFixed(1)} MB`);
  if (i === 2) await shot(page, "1-loading");
  if (status.camera.state === "problem" || status.model.state === "problem") throw new Error(`Kit problem: ${JSON.stringify(status)}`);
}
if (!status?.ready) throw new Error("The camera and model never got ready.");
// The kit logs every change of the model's status, so even a fast download shows its steps.
const firstVisit = await page.evaluate(() => window.__cameraKit.modelHistory);
const progress = firstVisit.filter((m) => m.state === "downloading" && m.total > 0).map((m) => m.loaded / m.total);
log(`ready: model ${status.model.variant} on ${status.model.delegate}, camera ${status.camera.width}x${status.camera.height}, ${progress.length} progress steps`);

// 2. Calibration finishes in one of the clip's still stretches.
await page.waitForSelector("[data-stage=calibrate]");
await page.waitForTimeout(1500);
await shot(page, "2-calibrate");
await page.waitForSelector("[data-stage=play]", { timeout: (plan.seconds * 3 + 30) * 1000 });
status = await page.evaluate(() => window.__cameraKit.status());
log(`calibrated, tracking at ${status.fps.toFixed(1)} fps, ${status.inferenceMs.toFixed(0)} ms a frame, model ${status.model.variant}`);

// 3. One full loop of the clip: every move, and who stood where.
await page.evaluate(() => window.__cameraKit.takeEvents());
const sides = [];
const until = Date.now() + (plan.seconds + 6) * 1000;
let shots = 0;
while (Date.now() < until) {
  await page.waitForTimeout(250);
  sides.push(await page.evaluate(() => [1, 2].map((slot) => window.__cameraKit.body(slot)?.head.x ?? null)));
  if (shots < 3 && sides.length % 24 === 12) await shot(page, `3-play-${++shots}`);
}
const events = await page.evaluate(() => window.__cameraKit.takeEvents());
status = await page.evaluate(() => window.__cameraKit.status());
log("moves:", events.filter((e) => e.type !== "guard" && e.type !== "lean").map((e) => `P${e.slot} ${e.type}${e.type === "lane" ? ` ${e.lane}` : ""}`).join(", "));

// 4. A second visit starts from this computer's cache, with no download.
await page.reload({ waitUntil: "domcontentloaded" });
let secondVisit = [];
for (let i = 0; i < 240 && !secondVisit.some((m) => m.state === "ready"); i++) {
  await page.waitForTimeout(500);
  secondVisit = await page.evaluate(() => window.__cameraKit?.modelHistory ?? []);
}
const cached = secondVisit.some((m) => m.state === "ready") && secondVisit.filter((m) => m.total > 0).every((m) => m.fromCache);

const checks = [
  ["the model downloaded with progress", progress.length >= 3 && progress[progress.length - 1] > progress[0] && !firstVisit.some((m) => m.fromCache)],
  ["the second visit loaded from the cache", cached],
  ...Array.from({ length: players }, (_, i) => [`player ${i + 1} was tracked`, sides.some((s) => s[i] !== null)]),
  ["player 1 stayed left of player 2", sides.every(([a, b]) => a === null || b === null || a < b)],
  ...plan.timeline.flatMap((move) => expectations(move, events)),
];
for (const [name, ok] of checks) console.log(ok ? "PASS" : "FAIL", name);
await browser.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

/** What each scripted move should produce. */
function expectations(move, all) {
  const mine = all.filter((e) => e.slot === move.player);
  const has = (type, test = () => true) => mine.some((e) => e.type === type && test(e));
  const who = `player ${move.player}`;
  if (move.move === "jump") return [[`${who} jumped`, has("jump")]];
  if (move.move === "duck") return [[`${who} ducked`, has("duck")]];
  if (move.move === "away") return [[`${who} stepped out and came back`, has("away") && has("back")]];
  const side = move.dx > 0 ? 1 : -1;
  return [
    [`${who} stepped into lane ${side}`, has("lane", (e) => e.lane === side)],
    [`${who} stepped back to lane 0`, has("lane", (e) => e.lane === 0 && e.from === side)],
  ];
}

/** Answers the CDN's requests from a local folder, filling it with curl first. */
async function serveMirror(browserContext, folder) {
  mkdirSync(folder, { recursive: true });
  await browserContext.route(/^https:\/\/(cdn\.jsdelivr\.net|storage\.googleapis\.com)\//, async (route) => {
    const url = route.request().url();
    const file = join(folder, url.split("/").pop());
    if (!existsSync(file) && spawnSync("curl", ["-sSfL", "-o", file, url], { stdio: "inherit" }).status !== 0) return route.abort();
    const type = file.endsWith(".wasm") ? "application/wasm" : file.endsWith(".js") ? "text/javascript" : "application/octet-stream";
    await route.fulfill({ path: file, headers: { "access-control-allow-origin": "*", "content-type": type } });
  });
}
