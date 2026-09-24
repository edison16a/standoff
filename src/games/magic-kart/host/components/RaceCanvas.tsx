"use client";
import { useEffect, useRef } from "react";
import { GameRenderer, type ViewSpec } from "../../render/game-renderer";
import { splitScreen } from "../../render/layout";
import { useSession } from "./session-context";

/**
 * The 3D view, filling the window. One animation frame loop advances the
 * session (the race, or the demo behind the lobby) and draws it: a single
 * view in the lobby, and one chase view per player while racing.
 */
export default function RaceCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new GameRenderer(canvas);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const unlisten = session.listen((event) => renderer.onEvent(event));
    // Browser tests steer the test phones by reading the race from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __magicKart: session });

    let frame = 0;
    const loop = (now: number) => {
      session.tick(now);
      const world = session.world;
      renderer.setWorld(world, (id) => session.label(id));
      let views: ViewSpec[];
      if (session.driver) {
        const players = world.karts.filter((k) => k.seat !== null);
        const rects = splitScreen(players.length);
        views = players.map((kart, i) => ({ kartId: kart.id, rect: rects[i]! }));
      } else {
        views = [{ kartId: null, rect: splitScreen(1)[0]! }];
      }
      renderer.render(views, now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unlisten();
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="mk-canvas" />;
}
