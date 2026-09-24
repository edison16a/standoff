"use client";
import { useEffect, useRef } from "react";
import { FruitRenderer } from "../../render/fruit-renderer";
import { Overlay } from "../overlay";
import { useSession } from "./session-context";

/** Longest step the game takes in one frame, so a stalled tab never teleports fruit. */
const MAX_DT = 1 / 10;

/**
 * The board, filling the window. One animation frame loop moves the game
 * forward and draws it; the points and name tags ride in a plain layer
 * on top.
 */
export function StageCanvas() {
  const session = useSession();
  const boxRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const layer = layerRef.current;
    if (!box || !layer) return;
    // A fresh canvas per mount: the renderer gives its WebGL context back on unmount, and a canvas never gets it back.
    const canvas = document.createElement("canvas");
    canvas.className = "fn-stage__canvas";
    box.appendChild(canvas);
    const renderer = new FruitRenderer(canvas);
    const overlay = new Overlay(layer, () => renderer.halfWidth);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const detach = session.attach({
      react: (event) => renderer.react(event),
      score: (event) => overlay.score(event),
      celebrate: (colors) => renderer.celebrate(colors),
      calm: () => renderer.calm(),
      reset: () => renderer.reset(),
    });

    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
      last = now;
      const picture = session.tick(dt, now, renderer.halfWidth);
      renderer.render(picture, dt);
      overlay.tags(picture.blades, session.nameOf);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      detach();
      overlay.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [session]);

  return (
    <>
      <div ref={boxRef} className="fn-stage__box" />
      <div ref={layerRef} className="fn-stage__layer" aria-hidden="true" />
    </>
  );
}
