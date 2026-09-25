// Captures a game's home screen media from its Showcase scene: a square
// icon, a poster frame and a seamless looping clip. The game must be
// running in a dev server (npm run dev), since the showcase page is
// development only.
//
//   node tools/media/capture.mjs <game-id> [--url http://localhost:3000]
//     [--seconds 8] [--fps 30] [--fade 1] [--warmup 3] [--size 1600x900]
//     [--ffmpeg ffmpeg] [--only icon,poster,loop] [--gpu] [--crf 30]
//
// --gpu renders on the computer's graphics card in a visible window, for
// full quality and fast capture. Without it the tool uses software
// rendering, which works anywhere but is slow. --crf sets the WebM
// quality (lower is better and bigger; the MP4 uses it less 8).
//
// Writes src/games/<id>/media/icon.jpg, src/games/<id>/media/poster.jpg and
// public/games/<id>/backdrop.webm and backdrop.mp4.
//
// Time is faked with Playwright's clock, so every frame is exactly 1/fps
// apart however slowly the machine renders. The clip is made loopable by
// capturing one extra second and cross fading it over the first second.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const game = args[0];
if (!game || game.startsWith("--")) {
  console.error("usage: node tools/media/capture.mjs <game-id> [options]");
  process.exit(1);
}
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at > 0 && args[at + 1] ? args[at + 1] : fallback;
};
const url = option("url", "http://localhost:3000");
const seconds = Number(option("seconds", "8"));
const fps = Number(option("fps", "30"));
const fade = Number(option("fade", "1"));
const warmup = Number(option("warmup", "3"));
const [width, height] = option("size", "1600x900").split("x").map(Number);
const ffmpeg = option("ffmpeg", process.env.FFMPEG ?? "ffmpeg");
const only = new Set(option("only", "icon,poster,loop").split(","));
const gpu = args.includes("--gpu");
const crf = Number(option("crf", "34"));

const mediaDir = join("src/games", game, "media");
const publicDir = join("public/games", game);
mkdirSync(mediaDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const browser = gpu
  ? await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] })
  : await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

/** Opens the showcase with a frozen clock and lets the scene settle. */
async function open(view, size) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  // A slow frame on a busy machine can take minutes, so nothing may time out.
  page.setDefaultTimeout(900000);
  page.on("pageerror", (error) => console.error(`[${view}] page error:`, error.message));
  await page.clock.install({ time: 0 });
  // Installed, the fake clock still flows with real time, so a slow machine would skip frames.
  // Paused, only runFor moves it.
  await page.clock.pauseAt(1000);
  await page.goto(`${url}/showcase/${game}?view=${view}`, { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 600; i++) {
    await page.clock.runFor(50);
    // With the clock paused, the page's own scripts still load in real time.
    await page.waitForTimeout(100);
    if (await page.evaluate(() => window.__showcaseReady === true)) break;
    if (i === 599) throw new Error(`the ${view} showcase never became ready`);
  }
  for (let t = 0; t < warmup * 1000; t += 50) await page.clock.runFor(50);
  return page;
}

async function still(view, size, file, type) {
  const page = await open(view, size);
  await page.screenshot({ path: file, type, quality: type === "jpeg" ? 90 : undefined });
  await page.close();
  console.log(`wrote ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
}

if (only.has("icon")) await still("icon", { width: 1024, height: 1024 }, join(mediaDir, "icon.jpg"), "jpeg");
if (only.has("poster")) await still("poster", { width, height }, join(mediaDir, "poster.jpg"), "jpeg");

if (only.has("loop")) {
  const frames = mkdtempSync(join(tmpdir(), `showcase-${game}-`));
  const page = await open("loop", { width, height });
  const main = Math.round(seconds * fps);
  const blend = Math.round(fade * fps);
  // The clock moves in whole milliseconds, so each step goes to the exact
  // time of the next frame. Stepping by a rounded 1000 / fps would drift.
  let elapsed = 0;
  for (let i = 0; i < main + blend; i++) {
    const next = Math.round(((i + 1) * 1000) / fps);
    await page.clock.runFor(next - elapsed);
    elapsed = next;
    await page.screenshot({ path: join(frames, `${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (i % fps === 0) process.stdout.write(`frame ${i} of ${main + blend}\n`);
  }
  await page.close();

  // The extra tail is blended over the head, so the clip's last frame runs straight into its first.
  const filter = [
    "[0:v]split=3[a][b][c]",
    `[a]trim=start_frame=${main}:end_frame=${main + blend},setpts=PTS-STARTPTS[tail]`,
    `[b]trim=start_frame=0:end_frame=${blend},setpts=PTS-STARTPTS[head]`,
    `[c]trim=start_frame=${blend}:end_frame=${main},setpts=PTS-STARTPTS[rest]`,
    `[tail][head]blend=all_expr='A*(1-N/${blend})+B*(N/${blend})'[mix]`,
    // Blend resets the frame rate, so the timestamps are rebuilt from the frame count.
    `[mix][rest]concat=n=2:v=1:a=0,settb=1/${fps},setpts=N,format=yuv420p[out]`,
  ].join(";");
  // WebM (VP9) for Chromium and Firefox, which may lack H.264, and MP4 (H.264) for Safari.
  const encodings = {
    webm: ["-c:v", "libvpx-vp9", "-crf", String(crf), "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2"],
    mp4: ["-c:v", "libx264", "-preset", "slow", "-crf", String(Math.max(0, crf - 8)), "-movflags", "+faststart"],
  };
  for (const [ext, codec] of Object.entries(encodings)) {
    const out = join(publicDir, `backdrop.${ext}`);
    const input = ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(frames, "%05d.jpg")];
    const run = spawnSync(ffmpeg, [...input, "-filter_complex", filter, "-map", "[out]", "-r", String(fps), ...codec, "-an", out], { stdio: "inherit" });
    if (run.status !== 0) throw new Error(`ffmpeg failed on ${ext}`);
    console.log(`wrote ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
  }
  rmSync(frames, { recursive: true, force: true });
}

await browser.close();
