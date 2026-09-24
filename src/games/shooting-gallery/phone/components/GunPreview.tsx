"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createBBGun, type BBGun } from "../../render/models/bb-gun";
import type { FinishId } from "../../render/models/finishes";

interface GunPreviewProps {
  finish: FinishId;
  colour: string;
}

/**
 * The player's BB gun turning slowly on a little stand, lit like a shop
 * window, so they can see the finish they picked. Drag to turn it. It
 * only draws while it is on screen.
 */
export function GunPreview({ finish, colour }: GunPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gunRef = useRef<BBGun | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.add(new THREE.HemisphereLight("#fff4e4", "#3a2a24", 1.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.2);
    key.position.set(1, 2, 2);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
    camera.position.set(0.15, 0.3, 2.15);
    camera.lookAt(0, -0.02, 0);
    const gun = createBBGun(finish, colour);
    gunRef.current = gun;
    const turntable = new THREE.Group();
    // Centre the gun on the turntable: its receiver sits at the origin, the barrel runs forward.
    gun.root.position.z = 0.02;
    turntable.add(gun.root);
    turntable.rotation.y = -Math.PI / 2 - 0.35;
    scene.add(turntable);

    let spin = 0.35;
    let dragging: number | null = null;
    const down = (event: PointerEvent) => (dragging = event.clientX);
    const move = (event: PointerEvent) => {
      if (dragging === null) return;
      turntable.rotation.y += (event.clientX - dragging) * 0.012;
      dragging = event.clientX;
      spin = 0;
    };
    const up = () => {
      dragging = null;
      spin = 0.35;
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    const fit = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      // Far enough that the whole gun, 1.4 metres long, fits even side on.
      camera.position.z = camera.aspect < 1.55 ? 2.15 * (1.55 / camera.aspect) : 2.15;
      camera.updateProjectionMatrix();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let last = performance.now();
    let frame = requestAnimationFrame(function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      turntable.rotation.y += spin * dt;
      turntable.position.y = 0.012 * Math.sin(now / 900);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      gun.dispose();
      gunRef.current = null;
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
    // The finish and colour are applied below without rebuilding the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gunRef.current?.setFinish(finish);
  }, [finish]);

  useEffect(() => {
    gunRef.current?.setColour(colour);
  }, [colour]);

  return <canvas ref={canvasRef} className="sg-preview" aria-label="Your BB gun" role="img" />;
}
