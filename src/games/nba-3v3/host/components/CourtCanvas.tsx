"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { playerColor } from "@/games/kit/players";
import { CourtRenderer } from "../../render/court-renderer";
import { Tags } from "../../render/tags";
import { useSession } from "./session-context";

/**
 * The 3D court, filling the window. One animation frame loop advances
 * the session (the game, or the demo behind the lobby), draws it, and
 * moves the name tags. The camera's heading goes back to the session so
 * the stick always means screen directions.
 */
export default function CourtCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = tagsRef.current;
    if (!canvas || !layer) return;
    const renderer = new CourtRenderer(canvas);
    const tags = new Tags(layer);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const unlisten = session.listen((event) => {
      renderer.onEvent(event);
      tags.onEvent(event, performance.now());
    });
    // Browser tests drive the fake phones by reading the game from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __nba: session, __nbaRenderer: renderer });

    const forward = new THREE.Vector3();
    let frame = 0;
    const loop = (now: number) => {
      const dt = session.tick(now);
      const match = session.match;
      renderer.setMatch(match, session.driver !== null);
      renderer.render(dt);
      renderer.tv.camera.getWorldDirection(forward);
      session.setView({ x: forward.x, z: forward.z });
      if (session.driver) {
        tags.update(match, renderer, (id) => {
          const a = match.athletes[id]!;
          return { name: session.nameOf(id), colour: a.seat !== null ? playerColor(a.seat) : null };
        }, canvas.clientWidth, canvas.clientHeight, now);
      } else tags.hide();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unlisten();
      tags.dispose();
      renderer.dispose();
    };
  }, [session]);

  return (
    <>
      <canvas ref={canvasRef} className="nba-canvas" />
      <div ref={tagsRef} className="nba-tags" aria-hidden="true" />
    </>
  );
}
