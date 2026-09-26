"use client";
import { useEffect, useRef } from "react";
import { softwareWebGl } from "@/games/kit/camera/model/gpu-check";
import { BattleRenderer, type Quality } from "../../render/battle-renderer";
import { useSession } from "./session-context";

/** Without a graphics card the full picture crawls, so it draws lighter. */
const LITE: Quality = { antialias: false, shadows: false, maxPixelRatio: 0.75 };

/**
 * The 3D field, filling the window. One animation frame loop advances
 * the session (the match, or the demo behind the lobby), then draws each
 * player's view. The renderer lends the session its cameras, so a
 * phone's point in a view becomes a point in the world.
 */
export default function BattleCanvas() {
  const session = useSession();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    // A fresh canvas per mount: the renderer gives its WebGL context back on unmount, and a canvas never gets it back.
    const canvas = document.createElement("canvas");
    canvas.className = "cb-canvas";
    box.appendChild(canvas);
    const renderer = new BattleRenderer(canvas, softwareWebGl() ? LITE : {});
    session.attachCamera(renderer);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    // Browser tests read the match from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __cb: session, __cbRenderer: renderer });

    let frame = 0;
    const loop = (now: number) => {
      const before = session.scene.battle;
      const { events, dt } = session.tick(now);
      const scene = session.scene;
      renderer.setBattle(scene.battle, (id) => scene.labels[id] ?? { name: "", color: "#ffffff" });
      // Events from a battle that just ended belong to it, not to the one now on screen.
      if (scene.battle === before) renderer.onEvents(events);
      renderer.render(scene.panes, dt, now / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      session.attachCamera(null);
      renderer.dispose();
      canvas.remove();
    };
  }, [session]);

  return <div ref={boxRef} className="cb-canvas-box" />;
}
