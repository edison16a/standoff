"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { MatchRenderer } from "../render/match-renderer";
import { isLabMove, labView } from "./lab";
import { SHOWCASE_SEED, ShowcaseScene } from "./scene";
import { STILLS } from "./stills";
import { TrailerPlayer } from "./trailer-player";

/**
 * Football 3v3's home screen media, drawn by the real renderer from a
 * seeded game of computer players: the loop is a wordless trailer cut
 * from its best moments, and the icon and poster hold its biggest ones.
 * It runs only from requestAnimationFrame and its clock, so a capture
 * steps it frame by frame and gets the same film every time.
 *
 * Development options in the address: t=<seconds> holds the trailer at
 * that moment, and lab=<move> shows the animation lab.
 */
export default function Showcase({ view }: { view: ShowcaseView }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // A fresh canvas for every mount: reusing one after its renderer was disposed can leave it black.
    const canvas = document.createElement("canvas");
    canvas.className = "fb-showcase__canvas";
    stage.prepend(canvas);
    const params = new URLSearchParams(window.location.search);
    const renderer = new MatchRenderer(canvas, { quality: "film", scale: view === "loop" ? 0.8 : 1 });
    const lab = params.get("lab");
    const labScene = isLabMove(lab) ? new ShowcaseScene(SHOWCASE_SEED) : null;
    if (labScene) {
      // The lab's camera can be moved for close looks: cam=x,y,z and look=x,y,z in metres, fov in degrees.
      const vec = (key: string, fallback: THREE.Vector3) => {
        const v = params.get(key)?.split(",").map(Number);
        return v && v.length === 3 && v.every(Number.isFinite) ? new THREE.Vector3(v[0], v[1], v[2]) : fallback;
      };
      renderer.director.setFixed(vec("cam", new THREE.Vector3(-9, 1.6, 0)), vec("look", new THREE.Vector3(0, 0.9, 0)), Number(params.get("fov")) || 55);
    }
    // Review scripts read what a frame draws from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __fbRenderer: renderer });
    const player = labScene ? null : new TrailerPlayer(renderer, renderer.scene);
    const held = params.get("t");
    const still = held !== null ? Number(held) : view === "loop" ? null : (STILLS[view] ?? null);
    // On a still, a review script can move the hold to any moment, through the still's own camera, and look at a sheet of them.
    if (still !== null && player) Object.assign(window, { __fbHold: (t: number) => player.hold(typeof still === "number" ? t : { ...still, t }) });
    // A still is drawn once per size, not on every tick of the capture tool's clock.
    let draws = 1;
    const fit = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      draws = 1;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    let first = -1;
    // performance.now rather than the frame's timestamp: the capture tool fakes the former.
    const loop = () => {
      const now = performance.now();
      if (first < 0) first = now;
      if (labScene && isLabMove(lab)) renderer.draw(labView(labScene.view, lab, (now - first) / 1000), now);
      else if (player && still !== null) {
        if (draws > 0) {
          player.hold(still);
          draws--;
        }
      } else player?.frame(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      player?.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [view]);

  return (
    <div ref={stageRef} className={`fb-showcase fb-showcase--${view}`}>
      {view === "icon" && (
        <div className="fb-logo" aria-label="Football 3v3">
          <span className="fb-logo__word">FOOTBALL</span>
          <span className="fb-logo__vs">3v3</span>
        </div>
      )}
    </div>
  );
}
