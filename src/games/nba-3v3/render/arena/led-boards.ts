import * as THREE from "three";
import { TEAMS } from "../../roster";
import { ledTexture } from "../textures";
import { Bake } from "./bake";

/** LEDs per metre of board, across and up. */
const PITCH = 40;
/** Metres of ribbon one pass of the scrolling picture covers at its own shape, so words keep their proportions. */
/** Where the courtside boards stand: the front board's line and the side boards' lines. */
const FRONT_Z = -4.75;
const SIDE_X = 11.35;
const CYCLE = (4096 / 128) * 0.7;

/**
 * An LED panel: the picture comes through a grid of round diodes with
 * dark gaps between them, as a camera sees a real board up close. Far
 * away the grid would shimmer, so it fades out once a diode is smaller
 * than a pixel. The panel is brighter than white so the finish lets it
 * glow and bleed onto the floor's reflection.
 */
export function ledMaterial(map: THREE.Texture, metresAcross: number, metresUp: number, brightness = 1.7): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(brightness, brightness, brightness) });
  // Every panel sits a hair in front of its black housing; pulled forward in depth so the housing never
  // fights through as dark lines on a far or edge on view, as on the scoreboard's side screens.
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -4;
  mat.customProgramCacheKey = () => "nba-led";
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrid = { value: new THREE.Vector2(metresAcross * PITCH, metresUp * PITCH) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vPanel;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvPanel = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vPanel;\nuniform vec2 uGrid;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec2 cell = vPanel * uGrid;
        vec2 f = fract(cell) - 0.5;
        float diode = smoothstep(0.5, 0.28, length(f));
        float fine = max(fwidth(cell.x), fwidth(cell.y));
        diffuseColor.rgb *= mix(0.25 + diode * 1.25, 0.8, clamp(fine * 1.6 - 0.4, 0.0, 1.0));`,
      );
  };
  return mat;
}

/**
 * The scrolling LED ribbons: a long board along the front of each
 * stand at courtside, each in a black housing with a lip on top, and a
 * ring round the face of the upper deck. All the ribbons share one
 * scrolling texture; the board faces are three draws and the housings one.
 */
export class LedBoards {
  readonly group = new THREE.Group();
  /** The scrolling picture all the ribbons share. */
  readonly texture: THREE.CanvasTexture;
  private readonly owned: THREE.Material[] = [];

  constructor() {
    const words = ["BASKETBALL 3V3", "STANDOFF", TEAMS[0].name.toUpperCase(), "FIRST TO 11", TEAMS[1].name.toUpperCase(), "LET'S GO"];
    this.texture = ledTexture(words, [TEAMS[0].color, "#ffffff", TEAMS[1].color, "#facc15"]);
    this.texture.repeat.set(2, 1);
    this.texture.anisotropy = 8;
    const housing = new THREE.MeshStandardMaterial({ color: "#0c0e14", roughness: 0.5, metalness: 0.3 });
    this.owned.push(housing);
    const shell = new Bake();
    const strip = (w: number, x: number, z: number, yaw: number, start: number) => {
      // One uv unit spans two passes of the picture, so the diode grid is sized to that.
      const face = ledMaterial(this.texture, CYCLE * 2, 0.7);
      this.owned.push(face);
      const plane = new THREE.PlaneGeometry(w, 0.7);
      // The texture repeats twice per uv unit, so scale the uvs to show the words at their true width,
      // and start each board where the one before it stops so the words run on round the corners.
      const uv = plane.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setX(i, (start + uv.getX(i) * w) / (CYCLE * 2));
      const m = new THREE.Mesh(plane, face);
      m.position.set(x, 0.46, z);
      m.rotation.y = yaw;
      this.group.add(m);
      // The housing sits just behind the face, a little taller, with a lip that throws a line of shadow.
      const bx = -Math.sin(yaw) * 0.12;
      const bz = -Math.cos(yaw) * 0.12;
      shell.add(new THREE.BoxGeometry(w + 0.1, 0.86, 0.22), housing, { x: x + bx, y: 0.43, z: z + bz, ry: yaw });
      shell.add(new THREE.BoxGeometry(w + 0.1, 0.04, 0.3), housing, { x: x + bx * 0.7, y: 0.87, z: z + bz * 0.7, ry: yaw });
    };
    // The three boards meet at the front corners and stop there, so no board shows through another.
    const side = 18 - FRONT_Z;
    // They read left to right from the far end of the left board, along the front, and down the right.
    strip(side, -SIDE_X, FRONT_Z + side / 2, Math.PI / 2, 0);
    strip(2 * SIDE_X, 0, FRONT_Z, 0, side);
    strip(side, SIDE_X, FRONT_Z + side / 2, -Math.PI / 2, side + 2 * SIDE_X);
    this.group.add(...shell.build(false));

    // The ring round the upper deck's face, high over the stands.
    const arc = Math.PI * 1.4;
    const ring = ledMaterial(this.texture, 26.7 * arc, 0.9, 1.3);
    ring.side = THREE.BackSide;
    this.owned.push(ring);
    const band = new THREE.CylinderGeometry(26.7, 26.7, 0.9, 96, 1, true, Math.PI * 0.5, arc);
    // Seen from inside, the cylinder's own uvs would read backwards.
    const uv = band.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    const fascia = new THREE.Mesh(band, ring);
    fascia.position.set(0, 7.15, 6);
    this.group.add(fascia);
  }

  update(time: number): void {
    this.texture.offset.x = (time * 0.035) % 1;
  }

  dispose(): void {
    this.texture.dispose();
    for (const m of this.owned) m.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
