"use client";
import { useEffect, useRef } from "react";
import { Renderer, splitScreen } from "../../render/renderer";
import { RunScene } from "../../render/run-scene";
import { useSession } from "./session-context";

/**
 * The 3D view, filling the window. One animation frame loop advances the
 * session and draws it: the demo run behind the menus, then one view per
 * player, side by side. Each player's scene is kept and handed each new
 * round's run, so nothing is rebuilt between rounds.
 */
export default function RunCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Renderer(canvas);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const scenes: RunScene[] = [];
    const sceneFor = (i: number, seed: number) => {
      // Player one runs as Kai and player two as Mia, in their own colours.
      scenes[i] ??= new RunScene(seed, i, renderer.environment);
      return scenes[i];
    };
    const unlisten = session.listen((slot, event) => scenes[slot - 1]?.onEvent(event));
    if (process.env.NODE_ENV === "development") Object.assign(window, { __subwayRenderer: { renderer, scenes } });

    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      session.tick(now);
      const lanes = session.views();
      const rects = splitScreen(lanes.length);
      const views = lanes.map((lane, i) => {
        const scene = sceneFor(i, lane.run.seed);
        if (scene.run !== lane.run) scene.setRun(lane.run);
        scene.update(dt, now / 1000, lane.mood);
        return { scene, rect: rects[i]! };
      });
      renderer.render(views);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unlisten();
      for (const scene of scenes) scene.dispose();
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="ss-canvas" />;
}
