"use client";
import { useEffect, useRef } from "react";
import { softwareWebGl } from "@/games/kit/camera/model/gpu-check";
import { BrawlRenderer, LOW_QUALITY } from "../../render/brawl-renderer";
import { HudInset } from "../hud-inset";
import { NameTags } from "../name-tags";
import { useSession } from "./session-context";

/**
 * The 3D stage, filling the window. One animation frame loop advances
 * the session (the match, or the demo behind the lobby) with the
 * renderer's hooks round every engine step, then draws and moves the
 * name tags.
 */
export default function ArenaCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = tagsRef.current;
    if (!canvas || !layer) return;
    // Without a graphics card the full picture runs at a frame or two a second, so it draws lighter.
    const renderer = new BrawlRenderer(canvas, softwareWebGl() ? LOW_QUALITY : {});
    const tags = new NameTags(layer);
    const inset = new HudInset(canvas);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    // Browser tests read the match from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __brawl: session });

    const hooks = { before: () => renderer.beforeStep(), after: () => renderer.afterStep() };
    let frame = 0;
    const loop = (now: number) => {
      renderer.setMatch(session.match);
      const dt = session.tick(now, hooks);
      // The demo may have rolled over to a new match during the tick.
      renderer.setMatch(session.match);
      renderer.setHudInset(inset.read(now));
      renderer.render(dt, session.alpha);
      if (session.driver) tags.update(session.match, renderer, (id) => session.nameOf(id), canvas.clientWidth, canvas.clientHeight);
      else tags.hide();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      tags.dispose();
      renderer.dispose();
    };
  }, [session]);

  return (
    <>
      <canvas ref={canvasRef} className="bb-canvas" />
      <div ref={tagsRef} className="bb-tags" aria-hidden="true" />
    </>
  );
}
