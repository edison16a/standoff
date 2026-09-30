"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { Renderer } from "../render/renderer";
import { RunScene } from "../render/run-scene";
import { Director, SHOTS } from "./director";
import { Logo } from "./Logo";
import type { Cut } from "./timeline";
import { TRAILER } from "./trailer";
import { TrailerDirector } from "./trailer-director";

/** The capture tool lets a scene settle this long before its first frame. */
const SETTLE_S = 3;

/** Films one view: the trailer's cuts for the loop, a staged moment for a still. */
interface Filming {
  frame(dt: number, elapsed: number): void;
  camera(aspect: number): THREE.PerspectiveCamera;
}

/** The loop's cuts. Tuning scripts can film any one moment with ?cut={...}, in development only. */
function trailerCuts(): readonly Cut[] {
  const custom = process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("cut") : null;
  return custom ? [{ ...TRAILER[0]!, seconds: 60, ...(JSON.parse(custom) as Partial<Cut>) }] : TRAILER;
}

/**
 * Subway Runner playing itself for the home screen: computer runners on
 * seeded runs, cut together like a trailer for the loop and staged for
 * the stills. It runs from requestAnimationFrame and performance.now
 * only, so the capture tool can step it frame by frame.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shot = SHOTS[view];
    const renderer = new Renderer(canvas, { preserve: true });
    const scene = new RunScene(shot.seed, shot.look);
    let filming: Filming;
    if (view === "loop") {
      const trailer = new TrailerDirector(trailerCuts(), scene);
      filming = { frame: (_dt, elapsed) => trailer.frame(elapsed), camera: (aspect) => trailer.camera(aspect) };
    } else filming = new Director(shot, scene);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let start = -1;
    let last = 0;
    let drawn = -Infinity;
    let frame = 0;
    // The capture tool steps the clock frame by frame. A clip needs one picture per captured
    // frame and a still barely moves, so pictures in between are skipped to save the drawing.
    const every = view === "loop" ? 0.03 : 0.5;
    // Nothing is captured in the first seconds while the scene settles, so the clip draws nothing until just before.
    const from = view === "loop" ? SETTLE_S - 0.2 : 0;
    const loop = (now: number) => {
      if (start < 0) start = now;
      const elapsed = (now - start) / 1000;
      filming.frame(elapsed - last, elapsed);
      last = elapsed;
      if (elapsed >= from && elapsed - drawn >= every) {
        drawn = elapsed;
        renderer.render([{ scene, rect: { x: 0, y: 0, w: 1, h: 1 }, camera: filming.camera(canvas.clientWidth / canvas.clientHeight) }]);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.dispose();
      renderer.dispose();
    };
  }, [view]);

  return (
    <div className={`ss-showcase ss-showcase--${view}`}>
      <canvas ref={canvasRef} className="ss-showcase__canvas" />
      {view === "icon" && <Logo />}
    </div>
  );
}
