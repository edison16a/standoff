"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { WeaponId } from "../../engine/weapons";
import { buildGun } from "../../render/models/guns";
import { setGunEnvironment } from "../../render/models/guns/gun-kit";

/**
 * The chosen gun, turning slowly under studio lights, so players can see
 * what they are picking. It owns a small WebGL view of its own and frees
 * it when the page moves on.
 */
export function GunViewer({ weapon }: { weapon: WeaponId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; holder: THREE.Group } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    setGunEnvironment(env, 0.9);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    camera.position.set(0, 0.25, 2.1);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a1a10, 1.2));
    // Studio lighting: a warm key, a cool fill from the other side and a green rim behind,
    // so black steel shows its edges and the wood its grain instead of reading as flat shapes.
    const key = new THREE.DirectionalLight(0xfff4e6, 3.2);
    key.position.set(1.5, 2, 2);
    const fill = new THREE.DirectionalLight(0xbfd8ff, 1.2);
    fill.position.set(-2, 0.5, 1.5);
    const rim = new THREE.DirectionalLight(0x7fffb0, 2.2);
    rim.position.set(-2, 1.5, -2);
    const under = new THREE.DirectionalLight(0xffffff, 0.6);
    under.position.set(0, -2, 0.5);
    scene.add(key, fill, rim, under);
    const holder = new THREE.Group();
    scene.add(holder);
    sceneRef.current = { scene, holder };

    const fit = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let frame = 0;
    const loop = (now: number) => {
      // Starts side on, the view that shows a gun best, and turns slowly from there.
      holder.rotation.y = Math.PI / 2 + now / 2600;
      holder.rotation.x = Math.sin(now / 3100) * 0.12;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sceneRef.current = null;
      setGunEnvironment(null);
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const view = sceneRef.current;
    if (!view) return;
    const gun = buildGun(weapon);
    // Centre the gun on its middle and scale it to fill the view, whatever its length.
    const box = new THREE.Box3().setFromObject(gun.root);
    const centre = box.getCenter(new THREE.Vector3());
    gun.root.position.sub(centre);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.5 / Math.max(size.x, size.y, size.z);
    const pivot = new THREE.Group();
    pivot.scale.setScalar(scale);
    pivot.add(gun.root);
    view.holder.add(pivot);
    return () => {
      view.holder.remove(pivot);
      pivot.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
    };
  }, [weapon]);

  return <canvas ref={canvasRef} className="zs-viewer" aria-label="The chosen gun, turning" />;
}
