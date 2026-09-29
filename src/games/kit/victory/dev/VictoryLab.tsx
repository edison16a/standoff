"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createBasketballTrophy, createBoxingBelt, createPodium, createWorldTrophy, trophyMaterials, VictoryStage } from "..";
import { VictoryNames } from "../overlay/VictoryNames";

export type LabShow = "all" | "belt" | "basketball" | "world" | "podium";

/**
 * The victory kit's test bench: every trophy under the lights with
 * confetti, or one close up. Development only.
 */
export function VictoryLab({ show }: { show: LabShow }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const close = show !== "all" && show !== "podium";
    const stage = new VictoryStage(canvas, {
      preserve: true,
      shot: close ? { centre: { x: 0, z: 0 }, radius: 1.05, height: 1.25, lookHeight: 1.15, speed: 0.25, introS: 1.5 } : { centre: { x: 0, z: 0 }, radius: 6.5, height: 2.6, lookHeight: 1.3, speed: 0.08 },
    });
    const materials = trophyMaterials();
    const podium = createPodium({ places: 3, width: 1.2, height: 0.9 });
    stage.scene.add(podium.group);
    const disposers: (() => void)[] = [() => podium.dispose(), () => materials.dispose()];
    const spinners: THREE.Object3D[] = [];
    const place = (object: THREE.Object3D, at: THREE.Vector3) => {
      object.position.copy(at);
      stage.scene.add(object);
      spinners.push(object);
    };
    if (show === "all" || show === "belt") {
      const belt = createBoxingBelt({ scale: close ? 1 : 1.1 });
      belt.group.position.y = 0.16;
      const holder = new THREE.Group();
      holder.add(belt.group);
      place(holder, podium.spots[0]!.clone().add(new THREE.Vector3(0, 0.02, 0)));
      disposers.push(belt.dispose);
    }
    if (show === "all" || show === "basketball") {
      const trophy = createBasketballTrophy({ height: 0.62, materials });
      place(trophy.group, show === "all" ? podium.spots[1]! : podium.spots[0]!);
      disposers.push(trophy.dispose);
    }
    if (show === "all" || show === "world") {
      const trophy = createWorldTrophy({ height: 0.5, materials });
      place(trophy.group, show === "all" ? podium.spots[2]! : podium.spots[0]!);
      disposers.push(trophy.dispose);
    }
    const lookAt = new THREE.Vector3(0, close ? 1.1 : 0.9, 0);
    stage.lights.addSpot({ from: { x: -3, y: 8, z: 4 }, at: lookAt, colour: "#fff1d6", intensity: 520, angle: close ? 0.12 : 0.3, shadows: true });
    stage.lights.addSpot({ from: { x: 4, y: 7, z: 2 }, at: lookAt, colour: "#9fc4ff", intensity: 260, angle: 0.28, sway: { radius: 0.6, speed: 0.7 } });
    stage.lights.addSpot({ from: { x: 0, y: 6, z: -5 }, at: lookAt, colour: "#ffd27a", intensity: 300, angle: 0.25 });
    stage.confetti.cannon({ from: { x: -3, y: 0.2, z: 2 }, direction: { x: 0.5, y: 1, z: -0.2 }, spread: 0.3, speed: 16, count: 700 });
    stage.confetti.cannon({ from: { x: 3, y: 0.2, z: 2 }, direction: { x: -0.5, y: 1, z: -0.2 }, spread: 0.3, speed: 16, count: 700 });
    stage.confetti.shower({ centre: { x: 0, y: 0, z: 0 }, radius: 4, height: 5, count: 900 });
    stage.start((dt) => {
      for (const object of spinners) object.rotation.y += dt * 0.35;
    });
    Object.assign(window, { __victoryStage: stage });
    return () => {
      stage.dispose();
      for (const dispose of disposers) dispose();
    };
  }, [show]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <VictoryNames eyebrow="Champion" names={[{ name: "Ann", colour: "#e63946" }]} detail="By knockout in round 3" />
    </div>
  );
}
