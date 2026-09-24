"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { MatchRenderer } from "../render/match-renderer";
import { ShowcaseScene } from "./scene";

/**
 * FIFA 3v3 playing itself for the home screen: a seeded match of
 * computer players, filmed like a highlight. It runs only from
 * requestAnimationFrame and performance.now, so the capture tool can
 * step the clock frame by frame and get the same film every time.
 */
export default function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const params = new URLSearchParams(window.location.search);
    const renderer = new MatchRenderer(canvas, { quality: params.get("quality") === "low" ? "low" : "high" });
    // Development peeks can jump ahead in the match without drawing every frame on the way.
    const scene = new ShowcaseScene(view, Number(params.get("seek") ?? 0));
    if (scene.pose) renderer.director.setFixed(scene.pose.pos, scene.pose.look, scene.pose.fov);
    // And pin the camera anywhere, to look closely at the models: cam=x,y,z,lookX,lookY,lookZ,fov.
    const cam = params.get("cam")?.split(",").map(Number);
    if (cam && cam.length === 7) {
      renderer.director.setFixed(new THREE.Vector3(cam[0], cam[1], cam[2]), new THREE.Vector3(cam[3], cam[4], cam[5]), cam[6]!);
      scene.pin();
    }
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    const loop = (now: number) => {
      const events = scene.tick(now);
      for (const event of events) renderer.onEvent(event, scene.view);
      renderer.draw(scene.view, scene.shot, now, scene.focus(renderer), scene.tags);
      const bug = bugRef.current;
      if (bug) {
        const v = scene.view;
        const clock = `${Math.floor(v.clock / 60)}:${String(Math.floor(v.clock % 60)).padStart(2, "0")}`;
        const score = `${v.score[0]}  ${v.score[1]}`;
        // Only touch the page when the text changes, not every frame.
        if (bug.dataset.text !== score + clock) {
          bug.dataset.text = score + clock;
          bug.querySelector("strong")!.textContent = score;
          bug.querySelector("em")!.textContent = clock;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [view]);

  return (
    <div className="fifa-showcase">
      <canvas ref={canvasRef} className="fifa-showcase__canvas" />
      {view === "loop" && (
        // The broadcast score bug in the corner, as on a television highlight.
        <div ref={bugRef} className="fifa-bug">
          <span className="fifa-bug__team fifa-bug__team--red">RED</span>
          <strong>0  0</strong>
          <span className="fifa-bug__team fifa-bug__team--blue">BLU</span>
          <em>4:00</em>
        </div>
      )}
      {view === "icon" && (
        <div className="fifa-logo" aria-label="FIFA 3v3">
          <span className="fifa-logo__word">FIFA</span>
          <span className="fifa-logo__vs">3v3</span>
        </div>
      )}
    </div>
  );
}
