"use client";
import { useEffect, useRef, useState } from "react";
import { GalleryRenderer } from "../../render/gallery-renderer";
import { useGallery } from "./session-context";

/**
 * The booth in 3D, filling the window. One animation frame loop advances
 * the game and draws it. Everything else on the screen is ordinary React
 * laid over it.
 */
export function GalleryCanvas() {
  const session = useGallery();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: GalleryRenderer;
    try {
      renderer = new GalleryRenderer(canvas, session);
    } catch {
      // No WebGL: say so, and keep the game ticking so the phones still work.
      setFailed(true);
      let frame = requestAnimationFrame(function loop(now) {
        session.tick(now);
        frame = requestAnimationFrame(loop);
      });
      return () => cancelAnimationFrame(frame);
    }
    // Browser tests look at the models close up through this. Never in a production build.
    if (process.env.NODE_ENV === "development") (window as unknown as { __galleryRenderer?: GalleryRenderer }).__galleryRenderer = renderer;
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = requestAnimationFrame(function loop(now) {
      renderer.render(now);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [session]);

  return (
    <>
      <canvas ref={canvasRef} className="sg-canvas" />
      {failed && <p className="sg-nogl">This browser cannot draw 3D, so the booth cannot be shown.</p>}
    </>
  );
}
