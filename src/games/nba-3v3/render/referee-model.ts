import * as THREE from "three";
import { CHARACTERS, type Character, type Team } from "../roster";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";

/** The referee: a lean official in a striped shirt, long black trousers and black shoes. */
const REF: Character = {
  ...CHARACTERS.ashby,
  name: "Referee",
  short: "Ref",
  number: 0,
  build: { height: 1.86, width: 0.98, bulk: 0.95, reach: 1 },
  look: {
    skin: "#c99a78", hair: "short", hairColor: "#3b2a1e", beard: "none", headband: null, sleeve: null, wristband: null,
    shoe: "#111111", shoeAccent: "#222222", sock: "#111111", mouthguard: false,
  },
};

const REF_TEAM: Team = { name: "", color: "#161616", dark: "#0a0a0a", trim: "#161616" };

/** Black and white vertical stripes, wrapped round the torso. */
function stripes(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#121212";
  for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 0, 8, 128);
  // A black collar band.
  ctx.fillRect(0, 0, 256, 7);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface RefereeModel {
  model: AthleteModel;
  dispose(): void;
}

/**
 * Builds the referee on the same skeleton as the players, so the pose
 * code drives him too, then dresses him: the jersey print swapped for
 * stripes and trousers over the legs.
 */
export function buildReferee(bodyMat: THREE.Material): RefereeModel {
  const model = buildAthlete(REF, REF_TEAM, bodyMat);
  const texture = stripes();
  for (const mesh of model.meshes) {
    const mat = mesh.material;
    if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
      mat.map.dispose();
      mat.map = texture;
      mat.needsUpdate = true;
    }
  }
  const cloth = new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.75 });
  const geos: THREE.BufferGeometry[] = [];
  const { thigh, shin, height } = model.dims;
  const s = height / 2;
  const leg = (joint: THREE.Object3D, r1: number, r2: number, len: number) => {
    const geo = new THREE.CylinderGeometry(r1, r2, len, 14, 1, true);
    geo.translate(0, -len / 2, 0);
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, cloth);
    mesh.castShadow = true;
    joint.add(mesh);
  };
  const j = model.joints;
  for (const hip of [j.hipL, j.hipR]) leg(hip, 0.09 * s, 0.07 * s, thigh);
  for (const knee of [j.kneeL, j.kneeR]) leg(knee, 0.066 * s, 0.056 * s, shin * 0.92);
  return {
    model,
    dispose() {
      model.dispose();
      texture.dispose();
      cloth.dispose();
      for (const g of geos) g.dispose();
    },
  };
}
