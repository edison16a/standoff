"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { MatchRenderer } from "../render/match-renderer";
import { Scoreboard } from "../render/hud/Scoreboard";
import { scoreboard, type Board } from "../render/hud/board";
import { isLabMove, labView } from "./lab";
import { ShowcaseScene } from "./scene";
import { STILLS } from "./stills";

/**
 * Football 3v3 playing itself: a seeded match of computer players under
 * the lights, with the broadcast score bug. It runs only from
 * requestAnimationFrame and its clock, so a capture steps it frame by
 * frame and gets the same film every time.
 *
 * Development options in the address: seed and seek (seconds to jump
 * ahead), quality (high, low or film), cam=x,y,z,lookX,lookY,lookZ,fov
 * to pin the camera, lab=<move> for the animation lab, and trophy to
 * end the game at once and watch the trophy presentation.
 */
export default function Showcase({ view }: { view: ShowcaseView }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // A fresh canvas for every mount: reusing one after its renderer was disposed can leave it black.
    const canvas = document.createElement("canvas");
    canvas.className = "fb-showcase__canvas";
    stage.prepend(canvas);
    const params = new URLSearchParams(window.location.search);
    const quality = params.get("quality");
    const renderer = new MatchRenderer(canvas, { quality: quality === "low" || quality === "high" ? quality : "film", scale: view === "loop" ? 0.8 : 1 });
    // The icon and poster are frozen moments of the same game; the loop plays it.
    const still = STILLS[view] ?? null;
    const scene = new ShowcaseScene(Number(params.get("seed") ?? 11), Number(params.get("seek") ?? still?.seek ?? 0), params.has("trophy"));
    const lab = params.get("lab");
    const cam = params.get("cam")?.split(",").map(Number);
    const shot = still?.camera?.(scene.view);
    if (cam && cam.length === 7) renderer.director.setFixed(new THREE.Vector3(cam[0], cam[1], cam[2]), new THREE.Vector3(cam[3], cam[4], cam[5]), cam[6]!);
    else if (isLabMove(lab)) renderer.director.setFixed(new THREE.Vector3(-9, 1.6, 0), new THREE.Vector3(0, 0.9, 0), 55);
    else if (shot) renderer.director.setFixed(shot.pos, shot.look, shot.fov);
    // A frozen still is drawn once per size, not on every tick of the capture tool's clock.
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
    let shown = "";
    const loop = (now: number) => {
      if (first < 0) first = now;
      if (isLabMove(lab)) {
        renderer.draw(labView(scene.view, lab, (now - first) / 1000), now);
      } else if (still) {
        if (draws > 0) {
          // Ease every body into its pose for the moment before the one picture is taken.
          renderer.settle(scene.view, now, 1.5);
          renderer.draw(scene.view, now);
          draws--;
        }
      } else {
        for (const event of scene.tick(now)) renderer.onEvent(event);
        renderer.draw(scene.view, now);
        const next = scoreboard(scene.view);
        // Only touch React when the text changes, not every frame.
        const key = JSON.stringify(next);
        if (key !== shown) {
          shown = key;
          setBoard(next);
        }
      }
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
    <div ref={stageRef} className={`fb-showcase fb-showcase--${view}`}>
      {view === "loop" && board && <Scoreboard board={board} />}
      {view === "icon" && (
        <div className="fb-logo" aria-label="Football 3v3">
          <span className="fb-logo__word">FOOTBALL</span>
          <span className="fb-logo__vs">3v3</span>
        </div>
      )}
    </div>
  );
}
