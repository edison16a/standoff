"use client";
import { useEffect, useRef } from "react";
import { FULL_VIEW, Renderer } from "../../render/renderer";
import { RunScene } from "../../render/run-scene";
import { useSession } from "./session-context";

/**
 * The 3D view, filling the window. One animation frame loop advances the
 * session and draws it: the demo run behind the menus, then the player's
 * run. The scene is kept and handed each new round's run, so nothing is
 * rebuilt between rounds.
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
    let scene: RunScene | null = null;
    const unlisten = session.listen((event) => scene?.onEvent(event));
    if (process.env.NODE_ENV === "development") Object.assign(window, { __subwayRenderer: { renderer, get scenes() { return scene ? [scene] : []; } } });

    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      session.tick(now);
      const lane = session.view();
      // The runner is Zip, in their first palette.
      scene ??= new RunScene(lane.run.seed, 0);
      if (scene.run !== lane.run) scene.setRun(lane.run);
      scene.update(dt, now / 1000, lane.mood);
      renderer.render([{ scene, rect: FULL_VIEW }]);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unlisten();
      scene?.dispose();
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="ss-canvas" />;
}
