"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { CLIP } from "@/games/fencing/render/quality";
import { StageRenderer } from "@/games/fencing/render/stage-renderer";
import { galleryFrame, readGallery } from "./gallery";
import { ShowcaseBout } from "./showcase-bout";

/** One pass of the bout, then it starts again. The capture tool records exactly one. */
const CYCLE_MS = 8000;
/** The capture tool warms up this long before recording, so the cycle is lined up to start there. */
const WARMUP_MS = 3000;
/** After the burst the bout holds still, so the loop ends on the moment, not on a reset. */
const FREEZE_AFTER_IMPACT_MS = 1300;
const STEP_MS = 1000 / 60;
const DRAW_EVERY_MS = 30;

/** Who fences in each view. */
const CAST = {
  loop: { 1: "vale", 2: "marrow" },
  poster: { 1: "duchess", 2: "iron" },
  icon: { 1: "vale", 2: "iron" },
} as const;

/** The moment each still is taken, in bout time, and where its camera stands relative to the blades. */
const STILLS = {
  poster: { at: 4830, camera: (mid: THREE.Vector3) => ({ position: new THREE.Vector3(mid.x + 1.1, 1.62, 4.4), target: new THREE.Vector3(mid.x, 1.2, 0), fov: 30 }) },
  icon: { at: 4800, camera: (mid: THREE.Vector3) => ({ position: new THREE.Vector3(mid.x + 0.25, 1.0, 3.3), target: new THREE.Vector3(mid.x, 1.42, 0), fov: 40 }) },
};

/**
 * Fencing playing itself for the home screen: the evening final in the 3D
 * hall. The loop is one exchange, parries, a clash and the touch in slow
 * motion. The poster and icon are frozen at the clash, sparks in the air.
 * Everything runs off requestAnimationFrame and performance.now, with
 * seeded randomness, so the capture tool can step it frame by frame.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The clip gets its lighter preset unless a test asks for another with `?fq`.
    const clip = view === "loop" && !readGallery() && !new URLSearchParams(window.location.search).has("fq");
    const renderer = new StageRenderer(canvas, { seed: 11, quality: clip ? CLIP : undefined });
    renderer.setTheme(true);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const gallery = readGallery();
    let shown = 0;
    // The gallery draws a few frames to settle, then holds, so screenshots are quick.
    const play = gallery
      ? (now: number) => {
          if (shown++ < 3) renderer.render(galleryFrame(renderer, gallery, now), now);
        }
      : view === "loop"
        ? loop(renderer)
        : still(renderer, view);
    let frame = requestAnimationFrame(function tick(now) {
      play(now);
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [view]);

  return (
    <div className={`fencing-showcase fencing-showcase--${view}`}>
      <canvas ref={canvasRef} className="fencing-showcase__canvas" />
      {view === "icon" && <FencingLogo />}
    </div>
  );
}

/** The looping clip: a fresh bout every cycle, frozen after its burst. */
function loop(renderer: StageRenderer): (now: number) => void {
  let start: number | null = null;
  let cycle = -1;
  let bout: ShowcaseBout | null = null;
  let impactAt: number | null = null;
  let last = 0;
  let drawnAt = -Infinity;
  return (now) => {
    start ??= now;
    const elapsed = now - start + CYCLE_MS - WARMUP_MS;
    const index = Math.floor(elapsed / CYCLE_MS);
    if (index !== cycle) {
      cycle = index;
      impactAt = null;
      renderer.reset();
      bout = new ShowcaseBout(CAST.loop, (event) => {
        if (event.type === "impact") impactAt = performance.now();
        renderer.react(event);
      });
      last = now;
    }
    const frozen = impactAt !== null && now - impactAt > FREEZE_AFTER_IMPACT_MS;
    // The capture tool steps the clock in whole frames; catch up in fixed steps so every run is identical.
    while (last + STEP_MS <= now) {
      last += STEP_MS;
      if (!frozen) bout!.step(STEP_MS);
    }
    renderer.update(bout!.scene(), now, { scores: bout!.scores });
    // The clip is recorded at 30 frames a second, so drawing more often only slows the capture.
    if (now - drawnAt < DRAW_EVERY_MS) return;
    drawnAt = now;
    renderer.draw();
  };
}

/** A still: play the bout up to its moment without drawing, then pin the camera there. */
function still(renderer: StageRenderer, view: "icon" | "poster"): (now: number) => void {
  const shot = STILLS[view];
  let wall = 0;
  const bout = new ShowcaseBout(CAST[view], (event) => renderer.react(event, wall));
  while (bout.time < shot.at) {
    wall += STEP_MS;
    bout.step(STEP_MS);
    renderer.update(bout.scene(), wall, { scores: bout.scores });
  }
  const [left, right] = bout.scene().fencers;
  const mid = new THREE.Vector3((left!.x + right!.x) / 2, 1.45, 0);
  renderer.pin(shot.camera(mid));
  // Nothing moves in a still, so it is drawn again only when the window changes size.
  let drawn = "";
  return () => {
    const size = `${window.innerWidth}x${window.innerHeight}`;
    if (size === drawn) return;
    drawn = size;
    renderer.update(bout.scene(), wall, { scores: bout.scores });
    renderer.freeze();
    renderer.update(bout.scene(), wall, { scores: bout.scores });
    renderer.draw();
  };
}

/** Fencing's name as key art: heavy italic capitals, with two crossed blades under them in the players' colours. */
function FencingLogo() {
  return (
    <div className="fencing-logo" aria-label="Fencing">
      <svg className="fencing-logo__blades" viewBox="0 0 400 60" aria-hidden="true">
        <path d="M10 44 L390 20" className="fencing-logo__blade fencing-logo__blade--red" />
        <path d="M10 20 L390 44" className="fencing-logo__blade fencing-logo__blade--green" />
      </svg>
      <span className="fencing-logo__word">FENCING</span>
    </div>
  );
}
