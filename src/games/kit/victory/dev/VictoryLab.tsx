"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createBasketballTrophy } from "../trophies/basketball-trophy";
import { createBoxingBelt } from "../trophies/boxing-belt";
import { createCupTrophy } from "../trophies/cup-trophy";
import { createWorldCupTrophy } from "../trophies/world-cup-trophy";
import { createPedestal, createPodium } from "../stands/podium";
import { VictoryRoom } from "../scene/victory-room";
import { VictoryOverlay } from "../ui/VictoryOverlay";

export type LabShow = "all" | "basketball" | "worldcup" | "belt" | "cup" | "podium";

/**
 * The victory kit's test bench, for looking at every piece up close.
 * Development only. `show` picks one piece, or all of them in a row.
 */
export function VictoryLab({ show }: { show: LabShow }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const room = new VictoryRoom(el, { orbit: { radius: show === "all" ? 5.5 : 1.6, height: show === "all" ? 1.6 : 1.1, lookHeight: show === "all" ? 0.9 : 0.95, speed: 0.25 } });
    const items: [THREE.Object3D, number][] = [];
    const scale = 1.6;
    if (show === "all" || show === "basketball") items.push([createBasketballTrophy(), scale]);
    if (show === "all" || show === "worldcup") items.push([createWorldCupTrophy(), scale * 1.5]);
    if (show === "all" || show === "cup") items.push([createCupTrophy({ metal: "silver" }), scale * 1.3]);
    if (show === "all" || show === "belt") {
      const belt = createBoxingBelt();
      belt.position.y = 0.1;
      const holderGroup = new THREE.Group();
      holderGroup.add(belt);
      items.push([holderGroup, 1]);
    }
    items.forEach(([item, s], i) => {
      const x = (i - (items.length - 1) / 2) * 1.4;
      const pedestal = createPedestal({ radius: 0.42, height: 0.6 });
      pedestal.position.x = x;
      item.scale.setScalar(s);
      item.position.set(x, 0.6, 0);
      room.scene.add(pedestal, item);
    });
    if (show === "podium" || show === "all") {
      const podium = createPodium({ width: 1, height: 0.7 });
      podium.object.position.z = show === "all" ? -2.5 : 0;
      room.scene.add(podium.object);
      room.scene.updateMatrixWorld();
      ([1, 2, 3] as const).forEach((place) => {
        const cup = createCupTrophy({ metal: place === 1 ? "gold" : place === 2 ? "silver" : "bronze" });
        cup.position.copy(podium.topOf(place));
        cup.scale.setScalar(1.4);
        room.scene.add(cup);
      });
    }
    room.lights.aimAt(new THREE.Vector3(0, 0.6, 0));
    room.confetti.cannons({ x: 0, y: 0, z: 0 }, { ring: 3.5 });
    room.confetti.startRain({ x: 0, y: 7, z: 0 }, 4, 70);
    room.onFrame((dt) => {
      for (const [item] of items) item.rotation.y += dt * 0.3;
    });
    room.start();
    (window as unknown as { __victoryRoom?: VictoryRoom }).__victoryRoom = room;
    return () => room.dispose();
  }, [show]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }} />
      <VictoryOverlay eyebrow="Victory kit" names={[{ name: "Edison", colour: "#ef4444" }]} subtitle="Every trophy, the belt and the podium" align={show === "all" ? "top" : "bottom"} />
    </div>
  );
}
