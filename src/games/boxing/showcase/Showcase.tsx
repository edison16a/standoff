"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchEvent } from "../engine/events";
import { ShoulderCamera } from "../render/cameras/shoulder-camera";
import { TvCamera } from "../render/cameras/tv-camera";
import { FightRenderer, FULL } from "../render/fight-renderer";
import { FightScene } from "../render/fight-scene";
import { LOOKS } from "../render/models/looks";
import { iconShot, posterShot, trailerShot } from "./shots";
import { CYCLE_S, Trailer } from "./trailer";
import "../styles/showcase.css";

const INPUT = { mirrors: [null, null], telegraph: [false, false] } as const;
/** The stills freeze this long after the knockout hook lands, in slow motion seconds, with the sparks in the air. */
const STILL_AFTER = 0.45;
const STEP = 1 / 60;

/**
 * Boxing playing itself for the home screen's media: a scripted
 * exchange that ends in a slow motion knockout, cut like a trailer.
 * Everything runs from requestAnimationFrame and performance.now, with a
 * scripted fight and seeded effects, so the capture tool can step the
 * clock frame by frame and the loop repeats exactly every eight seconds.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new FightRenderer(canvas, { preserve: true });
    const scene = new FightScene(renderer.renderer, [LOOKS[0]!, LOOKS[2]!]);
    const tv = new TvCamera();
    const shoulder = new ShoulderCamera(52);
    let trailer = new Trailer();
    renderer.resize(canvas.clientWidth, canvas.clientHeight, 1);
    let clock = 0;
    const hear = (events: MatchEvent[]) => {
      for (const event of events) {
        scene.onEvent(event);
        if (event.type === "hit") tv.shake.kick(Math.min(1.2, event.damage / 7));
        if (event.type === "knockdown") scene.arena.burst(45);
      }
    };

    let frame = 0;
    if (view !== "loop") {
      // Plays the trailer forward without drawing to just after the knockout blow lands, then holds it.
      let landed = Infinity;
      for (let c = 0; c <= Math.min(CYCLE_S, landed + STILL_AFTER); c += STEP) {
        const events = trailer.advanceTo(c);
        if (events.some((e) => e.type === "knockdown")) landed = c;
        hear(events);
        clock += STEP * Trailer.speed(c);
        scene.update(trailer.match, INPUT, clock, STEP * Trailer.speed(c));
      }
      const camera = view === "icon" ? iconShot(trailer.match, tv) : posterShot(trailer.match, tv);
      settle(renderer, scene, camera);
      // A still only needs drawing again if the window changes size.
      let drawn = "";
      const draw = () => {
        const size = `${canvas.clientWidth}x${canvas.clientHeight}`;
        if (size !== drawn) {
          drawn = size;
          renderer.resize(canvas.clientWidth, canvas.clientHeight, 1);
          renderer.render(scene, [{ rect: FULL, camera }]);
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    } else {
      settle(renderer, scene, trailerShot(0, trailer.match, tv, shoulder, 0, true));
      const start = performance.now();
      let last = start;
      let lastCycle = -1;
      const loop = () => {
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const cycle = ((now - start) / 1000) % CYCLE_S;
        if (cycle < lastCycle) {
          trailer = new Trailer();
          scene.resetAnimation();
        }
        const cut = shotIndex(cycle) !== shotIndex(lastCycle);
        lastCycle = cycle;
        hear(trailer.advanceTo(cycle));
        const speed = Trailer.speed(cycle);
        clock += dt * speed;
        scene.update(trailer.match, INPUT, clock, dt * speed);
        const camera = trailerShot(cycle, trailer.match, tv, shoulder, dt, cut);
        renderer.render(scene, [{ rect: FULL, camera }]);
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

function shotIndex(cycle: number): number {
  return cycle < 0 ? -1 : cycle < 2.35 ? 0 : cycle < 4.55 ? 1 : cycle < 6.55 ? 2 : 3;
}
