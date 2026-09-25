import * as THREE from "three";
import { isCharacterId, type CharacterId } from "@/games/fencing/characters";
import type { FencerAction, FencerFrame, StageFrame } from "@/games/fencing/engine/frames";
import type { FixedShot } from "@/games/fencing/render/camera-director";
import type { StageRenderer } from "@/games/fencing/render/stage-renderer";

/**
 * A development view for looking closely at the fencers, reached from the
 * showcase page: `?view=poster&fgallery=vale,iron&fact=guard&fcam=side`.
 * It stands two fencers still, in any action, under any camera, so every
 * model and pose can be checked from every side.
 */
export function readGallery(): { characters: [CharacterId, CharacterId]; action: FencerAction; camera: string; gap: number } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const pair = params.get("fgallery");
  if (!pair) return null;
  const [a, b] = pair.split(",");
  const action = (params.get("fact") ?? "idle") as FencerAction;
  return {
    characters: [isCharacterId(a) ? a : "vale", isCharacterId(b) ? b : "iron"],
    action,
    camera: params.get("fcam") ?? "side",
    gap: Number(params.get("fgap") ?? 2.6),
  };
}

const CAMERAS: Record<string, (gap: number) => FixedShot> = {
  side: (gap) => ({ position: new THREE.Vector3(0, 1.4, 3.2 + gap), target: new THREE.Vector3(0, 1.05, 0), fov: 34 }),
  front: () => ({ position: new THREE.Vector3(-4.2, 1.5, 1.4), target: new THREE.Vector3(-1.2, 1.1, 0), fov: 34 }),
  back: () => ({ position: new THREE.Vector3(0, 1.6, -3.6), target: new THREE.Vector3(0, 1.1, 0), fov: 40 }),
  close1: (gap) => ({ position: new THREE.Vector3(-gap / 2 + 0.3, 1.5, 1.5), target: new THREE.Vector3(-gap / 2 + 0.1, 1.35, 0), fov: 34 }),
  close2: (gap) => ({ position: new THREE.Vector3(gap / 2 - 0.3, 1.5, 1.5), target: new THREE.Vector3(gap / 2 - 0.1, 1.35, 0), fov: 34 }),
  broadcast: () => ({ position: new THREE.Vector3(0, 2.4, 8.5), target: new THREE.Vector3(0, 0.95, 0), fov: 30 }),
};

/** Stands the gallery pair and pins its camera. Returns the frame to draw. */
export function galleryFrame(renderer: StageRenderer, gallery: NonNullable<ReturnType<typeof readGallery>>, t: number): StageFrame {
  renderer.pin((CAMERAS[gallery.camera] ?? CAMERAS.side!)(gallery.gap));
  const fencer = (slot: 1 | 2): FencerFrame => ({
    slot, characterId: gallery.characters[slot - 1]!, x: (slot === 1 ? -1 : 1) * (gallery.gap / 2), facing: slot === 1 ? 1 : -1,
    pitch: 0, yaw: 0, roll: 0, speed: 0, action: gallery.action, actionMs: 150, parrying: gallery.action === "parry",
  });
  return { t, fencers: [fencer(1), fencer(2)] };
}
