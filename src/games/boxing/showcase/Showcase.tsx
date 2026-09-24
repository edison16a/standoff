"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { FightRenderer, FULL } from "../render/fight-renderer";
import { FightScene } from "../render/fight-scene";
import { TvCamera } from "../render/cameras/tv-camera";
import { LOOKS } from "../render/models/looks";
import { DemoFight } from "./demo-fight";

const NO_MIRRORS = [null, null] as const;
const TELEGRAPH = [false, false] as const;

/**
 * Boxing playing itself for the home screen's media. Everything runs
 * from requestAnimationFrame and performance.now with seeded fights, so
 * the capture tool can step the clock frame by frame.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new FightRenderer(canvas, { preserve: true });
    const scene = new FightScene(renderer.renderer, [LOOKS[0]!, LOOKS[1]!]);
    const tv = new TvCamera(34);
    const demo = new DemoFight(11);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __boxingShow: { renderer, scene, tv } });
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, 1);
    fit();
    let frame = 0;
    let last = performance.now();
    const start = last;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      for (const event of demo.step(dt * 1000)) scene.onEvent(event, demo.match);
      scene.update(demo.match, { mirrors: NO_MIRRORS, telegraph: TELEGRAPH }, (now - start) / 1000, dt);
      const [a, b] = demo.match.footwork.spots;
      tv.sideOn(a, b, 0.35 + (now - start) / 9000, 3.4, 1.7, 1.25);
      const t0 = performance.now();
      renderer.render(scene, [{ rect: FULL, camera: tv.camera }]);
      (window as unknown as { __frameMs: number }).__frameMs = performance.now() - t0;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      scene.dispose();
      renderer.dispose();
    };
  }, [view]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
