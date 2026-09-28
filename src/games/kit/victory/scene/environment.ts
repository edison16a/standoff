import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * A soft studio to reflect in. Gold and silver only show what they
 * reflect, so a trophy without this reads as a dark lump. Set the result
 * as `scene.environment` and dispose it with the scene.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer, blur = 0.03): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(new RoomEnvironment(), blur).texture;
  pmrem.dispose();
  return texture;
}

/**
 * A dark glossy floor with a pool of light in the middle that fades to
 * black at the edge, so the scene has no visible horizon.
 */
export function stageFloor(radius = 12, colour = "#16151c"): THREE.Mesh {
  const material = new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.32, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const glow = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      glow.addColorStop(0, "#ffffff");
      glow.addColorStop(0.55, "#8a8a8a");
      glow.addColorStop(1, "#000000");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 256, 256);
      material.map = new THREE.CanvasTexture(canvas);
      material.map.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 96).rotateX(-Math.PI / 2), material);
  floor.receiveShadow = true;
  floor.name = "stage-floor";
  return floor;
}
