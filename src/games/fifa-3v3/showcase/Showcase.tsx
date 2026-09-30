"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { buildView } from "../engine/view";
import { MatchRenderer } from "../render/match-renderer";
import { iconLights, stillLights } from "./still-lights";
import { stillScene } from "./stills";
import { Trailer } from "./trailer";

/** One frame of the page: the trailer steps and draws, a still draws once after each resize. */
type Frame = (now: number) => void;

/** The loop: the wordless trailer, stepped by the page's clock. */
function trailerFrames(renderer: MatchRenderer, params: URLSearchParams): { frame: Frame; resized(): void } {
  renderer.cinematic();
  const t = params.get("t");
  const trailer = new Trailer(renderer, t === null ? null : Number(t));
  return { frame: (now) => trailer.frame(now, window.__showcaseReady === true), resized: () => trailer.redraw() };
}

/** The icon and the poster: the match frozen at its moment, lit hard and posed. */
function stillFrames(renderer: MatchRenderer, view: Exclude<ShowcaseView, "loop">, params: URLSearchParams): { frame: Frame; resized(): void } {
  const still = stillScene(view);
  const lights = still.facing ? iconLights(still.subject, still.facing) : stillLights(still.subject);
  renderer.cinematic({ lights, ambient: 0.25, key: 0.5, haze: still.haze });
  const { pos, look, fov } = still.pose;
  // Development: pin the camera anywhere, to try framings: cam=x,y,z,lookX,lookY,lookZ,fov.
  const cam = params.get("cam")?.split(",").map(Number);
  if (cam && cam.length === 7) renderer.director.setFixed(new THREE.Vector3(cam[0], cam[1], cam[2]), new THREE.Vector3(cam[3], cam[4], cam[5]), cam[6]!);
  else renderer.director.setFixed(pos, look, fov);
  const view0 = buildView(still.state);
  let draws = 1;
  return {
    frame: (now) => {
      if (draws <= 0) return;
      draws--;
      // The players' poses ease toward their targets, so they are played forward before the one drawing.
      renderer.settle(view0, now, 1.5);
      renderer.draw(view0, "fixed", now, undefined, false);
    },
    resized: () => (draws = 1),
  };
}

/**
 * Soccer 3v3 playing itself for the home screen: the loop is a wordless
 * trailer of one seeded match's best moments and the cup lift, the icon
 * and the poster single frames of it, lit like key art. It runs only from
 * requestAnimationFrame and performance.now, so the capture tool can step
 * the clock frame by frame and get the same film every time.
 */
export default function Showcase({ view }: { view: ShowcaseView }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // A fresh canvas for every mount. Reusing one after its renderer was
    // disposed (as development mode's double mount does) can leave it black.
    const canvas = document.createElement("canvas");
    canvas.className = "fifa-showcase__canvas";
    stage.prepend(canvas);
    const params = new URLSearchParams(window.location.search);
    // The clip is filmed a frame at a time in software; a lighter frame keeps each one in time.
    const renderer = new MatchRenderer(canvas, { quality: "film", scale: view === "loop" && !params.has("t") ? 0.75 : 1 });
    const film = view === "loop" ? trailerFrames(renderer, params) : stillFrames(renderer, view, params);
    const fit = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      film.resized();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    // The clock is read from performance.now: the capture tool fakes it, frame by frame.
    const loop = () => {
      film.frame(performance.now());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      canvas.remove();
    };
  }, [view]);

  return (
    <div ref={stageRef} className={`fifa-showcase fifa-showcase--${view}`}>
      {view === "icon" && (
        <div className="fifa-logo" aria-label="Soccer 3v3">
          <span className="fifa-logo__word">SOCCER</span>
          <span className="fifa-logo__vs">3v3</span>
        </div>
      )}
    </div>
  );
}
