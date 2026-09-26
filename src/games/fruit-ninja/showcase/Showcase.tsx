"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchEvent } from "../engine/events";
import { Overlay } from "../host/overlay";
import { FruitRenderer } from "../render/fruit-renderer";
import { PopupClock } from "./popup-clock";
import { ShowcaseScene } from "./scene";
import { seedRandom } from "./seeded-random";
import { SHOTS, type Shot } from "./shots";

/** The engine's fixed step. The film is the same however the frames fall. */
const STEP = 1 / 120;
const SEED = 20260924;

/**
 * Fruit Slicer playing itself for the home screen: four computer players
 * on the real board, with the real fruit, blades and effects, following
 * a script. Time comes only from requestAnimationFrame and
 * performance.now, and every random draw is seeded, so the capture tool
 * films the same thing every time.
 */
export default function Showcase({ view }: { view: ShowcaseView }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const layer = layerRef.current;
    if (!box || !layer) return;
    const restoreRandom = seedRandom(SEED);
    const shot = pick(view, new URLSearchParams(window.location.search).get("at"));
    const canvas = document.createElement("canvas");
    canvas.className = "fn-stage__canvas";
    box.appendChild(canvas);
    const renderer = new FruitRenderer(canvas, { adaptive: false });
    if (shot.camera) renderer.aim(shot.camera.x, shot.camera.y, shot.camera.zoom);
    let frozen = false;
    const fit = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      if (frozen) renderer.redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    const scene = new ShowcaseScene(shot.script, renderer.halfWidth);
    const overlay = new Overlay(layer, () => renderer.halfWidth);
    const popups = new PopupClock(layer);
    const play = (events: MatchEvent[]) => {
      for (const event of events) {
        if (event.type === "score") {
          // Points from long before the first frame would be gone by then.
          if (!shot.labels || scene.time < shot.start - 1.3) continue;
          overlay.score(event);
          popups.track(scene.time);
        } else if (event.type !== "stun" && event.type !== "phase") {
          renderer.react(event);
        }
      }
    };
    // Play through to the first frame unseen, so the board is already busy when the film starts.
    // The picture moves on in coarser steps, except just before the start where the blade trails form.
    let unseen = 0;
    while (scene.time < shot.start) {
      play(scene.step(STEP));
      unseen += STEP;
      if (unseen < 1 / 30 && scene.time < shot.start - 0.4) continue;
      renderer.render(scene.frame(), unseen, false);
      unseen = 0;
    }

    let origin = -1;
    let frame = 0;
    const loop = (now: number) => {
      if (origin < 0) origin = now;
      const target = Math.min(shot.start + (now - origin) / 1000, shot.freeze ?? Number.POSITIVE_INFINITY);
      let dt = 0;
      while (scene.time + STEP / 2 < target) {
        play(scene.step(STEP));
        dt += STEP;
      }
      const picture = scene.frame();
      renderer.render(picture, dt);
      overlay.tags(shot.labels ? picture.blades : [], (seat) => scene.nameOf(seat));
      popups.update(scene.time);
      // A still stops on its frame. The canvas keeps showing it.
      frozen = shot.freeze !== undefined && scene.time + STEP / 2 >= shot.freeze;
      if (!frozen) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      popups.clear();
      overlay.dispose();
      renderer.dispose();
      canvas.remove();
      restoreRandom();
    };
  }, [view]);

  return (
    <div className={`fn-stage fn-showcase fn-showcase--${view}`}>
      <div ref={boxRef} className="fn-stage__box" />
      <div className="fn-stage__vignette" aria-hidden="true" />
      <div ref={layerRef} className="fn-stage__layer" aria-hidden="true" />
      {view === "icon" && <Logo />}
    </div>
  );
}

/** The game's name as a sliced logo, for the store tile. */
function Logo() {
  return (
    <div className="fn-logo" role="img" aria-label="Fruit Slicer">
      <span className="fn-logo__word fn-logo__word--fruit" data-text="FRUIT">
        FRUIT
      </span>
      <span className="fn-logo__word fn-logo__word--slicer" data-text="SLICER">
        SLICER
      </span>
    </div>
  );
}

/** The shot for a view. `at` in the address jumps to another moment, for looking around while writing a script. */
function pick(view: ShowcaseView, at: string | null): Shot {
  const shot = SHOTS[view];
  const time = Number(at);
  if (!at || !Number.isFinite(time)) return shot;
  return shot.freeze === undefined ? { ...shot, start: time } : { ...shot, start: time, freeze: time };
}
