import * as THREE from "three";
import type { Theme } from "./themes";

export interface StudioLook {
  skyTop: string;
  skyBottom: string;
  ground: string;
  sun: string;
  /** Colours of the two tall light strips either side, which draw the long highlights down the paint. */
  strips: readonly [string, string];
}

/** The reflection world for a map: its own sky and road, plus soft boxes for crisp highlights. */
export function studioFor(theme: Theme): StudioLook {
  const night = theme.reflections >= 0.7;
  return {
    skyTop: theme.skyTop,
    skyBottom: theme.skyBottom,
    ground: theme.road,
    sun: theme.sun,
    strips: night ? [theme.kerb[0]!, theme.kerb[1] ?? theme.line] : ["#ffffff", theme.skyBottom],
  };
}

/**
 * Bakes what the karts' paint and chrome reflect: the map's sky above,
 * its road below, the sun, and a few soft boxes like a photo studio's,
 * so the clear coat shows long bright highlights that slide over the
 * bodywork as the kart turns. Baked once per map into a prefiltered
 * environment, so each reflection is a texture read.
 */
export function bakeKartEnvironment(renderer: THREE.WebGLRenderer, look: StudioLook): THREE.Texture {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { top: { value: new THREE.Color(look.skyTop) }, bottom: { value: new THREE.Color(look.skyBottom) }, ground: { value: new THREE.Color(look.ground) } },
      vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform vec3 ground; varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 sky = mix(bottom * 1.25, top, smoothstep(0.0, 0.7, h));
          vec3 below = mix(bottom * 0.6, ground * 0.45, smoothstep(0.0, -0.25, h));
          gl_FragColor = vec4(h > 0.0 ? sky : below, 1.0);
        }`,
    }),
  );
  scene.add(sky);
  const light = (color: THREE.ColorRepresentation, power: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide });
  // A wide box overhead and two tall strips either side: the classic car studio.
  const top = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), light(look.sun, 2.4));
  top.position.set(0, 20, -2);
  top.rotation.x = Math.PI / 2;
  scene.add(top);
  look.strips.forEach((color, i) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(3, 18), light(color, 2.2));
    const side = i === 0 ? 1 : -1;
    strip.position.set(side * 22, 7, 4 * side);
    strip.lookAt(0, 4, 0);
    scene.add(strip);
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8), light(look.sun, 9));
  sun.position.set(-20, 32, 14);
  scene.add(sun);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.02, 0.1, 120).texture;
  pmrem.dispose();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    (mesh.material as THREE.Material | undefined)?.dispose();
  });
  return texture;
}

/** A neutral studio, for the phone's turntable and the podium. */
export const STUDIO: StudioLook = { skyTop: "#5d6b8f", skyBottom: "#e6e9f2", ground: "#2a2440", sun: "#fff4e0", strips: ["#ffffff", "#bfe3ff"] };
