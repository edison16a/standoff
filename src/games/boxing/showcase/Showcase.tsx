"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchEvent } from "../engine/events";
import { ShoulderCamera } from "../render/cameras/shoulder-camera";
import { TvCamera } from "../render/cameras/tv-camera";
import { FightRenderer, FULL } from "../render/fight-renderer";
import { FightScene } from "../render/fight-scene";
import { lookFor } from "../render/models/looks";
import { Kicker } from "./kicker";
import { playStep, STEP } from "./playback";
import { shotIndex, trailerShot, type ShotRig } from "./shots";
import { stageStill } from "./still";
import { CEREMONY_AT, CYCLE_S, Trailer } from "./trailer";
import "../styles/showcase.css";

/** The ceremony starts this far in, so the belt is already at the champion's chest on the cut. */
const CEREMONY_LEAD_S = 0.4;
const STEPS_PER_S = Math.round(1 / STEP);

/**
 * Boxing playing itself for the home screen's media, cut like a trailer:
 * a scripted exchange, a first knockdown, a slow motion knockout, the
 * fall, and the champion lifting the belt. Everything runs from requestAnimationFrame and
 * performance.now, with a scripted fight and seeded effects, so the
 * capture tool can step the clock frame by frame and the loop repeats
 * exactly every eleven seconds.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new FightRenderer(canvas, { preserve: true });
    const scene = new FightScene(renderer.renderer, [lookFor(0, "Slugger"), lookFor(1, "Out Boxer")]);
    const kicker = new Kicker(scene.scene);
    let tv = new TvCamera();
    let trailer = new Trailer();
    const rig: ShotRig = { match: trailer.match, tv, shoulder: new ShoulderCamera(52), ceremony: scene.ceremony };
    renderer.resize(canvas.clientWidth, canvas.clientHeight, 1);
    let clock = 0;
    const hear = (events: MatchEvent[]) => {
      for (const event of events) {
        scene.onEvent(event);
        if (event.type === "hit") tv.shake.kick(Math.min(1.2, event.damage / 7));
        if (event.type === "knockdown") scene.arena.burst(45);
      }
    };
    const draw = (camera: THREE.PerspectiveCamera) => {
      kicker.aim(camera, subject(scene));
      // The referee steps out of the ceremony, as in the real results, and out of the stills.
      scene.referee.model.root.visible = view === "loop" && !scene.ceremony.active;
      settle(renderer, scene, camera);
    };

    let frame = 0;
    if (view !== "loop") {
      const camera = stageStill(view, scene, tv, hear);
      draw(camera);
      // A still only needs drawing again if the window changes size.
      let drawn = "";
      const redraw = () => {
        const size = `${canvas.clientWidth}x${canvas.clientHeight}`;
        if (size !== drawn) {
          drawn = size;
          renderer.resize(canvas.clientWidth, canvas.clientHeight, 1);
          draw(camera);
        }
        frame = requestAnimationFrame(redraw);
      };
      frame = requestAnimationFrame(redraw);
    } else {
      // The clip plays behind the home screen and is compressed anyway, so it is drawn a little
      // under full resolution, which a slow machine capturing it needs.
      renderer.resize(canvas.clientWidth, canvas.clientHeight, 0.8);
      draw(trailerShot(0, rig, 0, true));
      const start = performance.now();
      let last = -Infinity;
      // The film runs on a fixed grid of 1/60 s steps from the start of each pass, whatever the frame
      // times, so every pass through the loop is the same to the pixel and the clip's ends meet.
      let sim = 0;
      let camera = trailerShot(0, rig, 0, true);
      const loop = () => {
        const now = performance.now();
        // The clip is 30 frames a second, so a frame much closer than that to the last one is not drawn.
        // A slow machine capturing the clip then draws each frame once instead of twice.
        if (now - last < (1000 / 30) * 0.9) {
          frame = requestAnimationFrame(loop);
          return;
        }
        last = now;
        // Whole steps, counted as integers, so a pass lands its cuts on exactly the same frames as the last.
        const step = Math.floor(((now - start) / 1000) * STEPS_PER_S + 1e-6) % (CYCLE_S * STEPS_PER_S);
        if (step < sim) {
          trailer = new Trailer();
          // Fresh cameras and clock too: the shake's wobble and the shoulder view's easing would otherwise carry over.
          tv = new TvCamera();
          Object.assign(rig, { match: trailer.match, tv, shoulder: new ShoulderCamera(52) });
          scene.resetAnimation();
          sim = 0;
          clock = 0;
        }
        while (sim < step) {
          sim++;
          const at = sim / STEPS_PER_S;
          const cut = shotIndex(at) !== shotIndex(at - STEP);
          if (at >= CEREMONY_AT && !scene.ceremony.active) scene.startCeremony(0, clock - CEREMONY_LEAD_S);
          clock = playStep(trailer, scene, at, clock, hear);
          camera = trailerShot(at, rig, STEP, cut);
        }
        draw(camera);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(frame);
      scene.dispose();
      renderer.dispose();
    };
  }, [view]);

  return (
    <div className={`bx-show bx-show--${view}`}>
      <canvas ref={canvasRef} className="bx-show__canvas" />
      {view === "icon" && (
        <div className="bx-show__logo" aria-hidden="true">
          <span className="bx-show__word">BOXING</span>
        </div>
      )}
    </div>
  );
}

/** Where the back light points: between the two faces in the fight, the champion in the ceremony. */
function subject(scene: FightScene): THREE.Vector3 {
  const champion = scene.ceremony.winner;
  if (champion !== null) return scene.animators[champion].face(new THREE.Vector3());
  const a = scene.animators[0].face(new THREE.Vector3());
  return a.add(scene.animators[1].face(new THREE.Vector3())).multiplyScalar(0.5);
}

/**
 * Draws one frame and waits for the GPU to finish it before the page
 * carries on. The first frame compiles every shader, which on a slow
 * machine can take longer than the capture tool waits for a screenshot.
 */
function settle(renderer: FightRenderer, scene: FightScene, camera: THREE.PerspectiveCamera): void {
  renderer.render(scene, [{ rect: FULL, camera }]);
  const gl = renderer.renderer.getContext();
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
}
