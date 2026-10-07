"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { playerColor } from "@/games/kit/players";
import { softwareWebGl } from "@/games/kit/camera/model/gpu-check";
import { CourtRenderer, LOW_QUALITY } from "../../render/court-renderer";
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
    // Without a graphics card the full picture runs at a frame or two a second, so it draws lighter.
    const renderer = new CourtRenderer(canvas, softwareWebGl() ? LOW_QUALITY : {});
    const tags = new Tags(layer);
    // People wear their own name on their backs; computer players wear their build's.
    renderer.jerseyName = (a) => (a.seat !== null ? session.nameOf(a.id) || null : null);
    // A ring in the phone's colour under whoever each phone moves now, which slides over on a switch.
    renderer.pilots = () => [...(session.driver?.athleteBySeat ?? [])].map(([seat, id]) => ({ seat, id, colour: playerColor(seat) }));
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
      // The opening sweep is for a new game; the replay's stand in and the return from it cut straight in.
      renderer.setMatch(match, session.phase === "countdown");
      const replayCam = session.replayCamera();
      renderer.setReplayCamera(replayCam);
      renderer.setCeremony(session.driver?.ceremony ?? null);
      renderer.render(dt);
      renderer.tv.camera.getWorldDirection(forward);
      if (!replayCam) session.setView({ x: forward.x, z: forward.z });
      // The ceremony has the winners' names over it instead of tags.
      if (session.driver && !replayCam && !session.driver.ceremony) {
        tags.update(match, renderer, (id) => {
          const pilot = session.driver?.pilotOf(id) ?? null;
          return { name: session.nameOf(id), colour: pilot !== null ? playerColor(pilot) : null };
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
