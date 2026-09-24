import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The shapes a pump action BB rifle is made of. The gun is built with its
 * barrel along +z, so Object3D.lookAt points it at a target, and with the
 * front of the receiver at the origin. Sizes are close to a real one,
 * scaled up a little when placed so it reads on a big screen.
 */

export const BARREL_Y = 0.008;
export const TUBE_Y = -0.017;
export const MUZZLE_Z = 0.67;
export const LASER_AT = new THREE.Vector3(0, -0.041, 0.566);
/** How far the pump travels back when it is worked. */
export const PUMP_TRAVEL = 0.085;

/** Turns a lathe (which spins around y) to run along z. */
function alongZ(geometry: THREE.BufferGeometry, y: number, z: number): THREE.BufferGeometry {
  return geometry.rotateX(Math.PI / 2).translate(0, y, z);
}

function lathe(profile: [number, number][], segments = 32): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, h]) => new THREE.Vector2(r, h)),
    segments,
  );
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

/** Barrel, crowned muzzle cap, shot tube and front sight: the gun's blued steel. */
export function barrelGeometry(): THREE.BufferGeometry {
  const barrel = alongZ(
    lathe([
      [0, 0],
      [0.0125, 0],
      [0.0125, 0.54],
      [0.0118, 0.56],
      [0.0165, 0.565],
      [0.0172, 0.58],
      [0.0172, 0.61],
      [0.0155, 0.624],
      [0.0062, 0.624],
      [0.0062, 0.6],
    ]),
    BARREL_Y,
    0.046,
  );
  const tube = alongZ(
    lathe([
      [0, 0],
      [0.0085, 0],
      [0.0085, 0.5],
      [0.0075, 0.51],
      [0, 0.51],
    ], 20),
    TUBE_Y,
    0.06,
  );
  // Front sight: a low ramp on the muzzle cap with a thin blade on top.
  const ramp = new THREE.BoxGeometry(0.007, 0.008, 0.03).translate(0, BARREL_Y + 0.019, MUZZLE_Z - 0.03);
  const blade = new THREE.BoxGeometry(0.0028, 0.012, 0.008).translate(0, BARREL_Y + 0.027, MUZZLE_Z - 0.026);
  // Rear sight: a leaf with a notch cut in it, on a little elevator ladder.
  const leafL = new THREE.BoxGeometry(0.007, 0.01, 0.003).translate(-0.006, BARREL_Y + 0.017, 0.15);
  const leafR = leafL.clone().translate(0.012, 0, 0);
  const leafBase = new THREE.BoxGeometry(0.019, 0.004, 0.003).translate(0, BARREL_Y + 0.0125, 0.15);
  const ladder = new THREE.BoxGeometry(0.008, 0.003, 0.024).translate(0, BARREL_Y + 0.0125, 0.165);
  return merge([barrel, tube, ramp, blade, leafL, leafR, leafBase, ladder]);
}

/** Two bands clamping the barrel to the shot tube, in the trim colour. */
export function bandGeometry(): THREE.BufferGeometry {
  const outline = (grow: number) => {
    // The top half of a circle round the barrel, joined to the bottom half of one round the tube.
    const shape = new THREE.Shape();
    shape.absarc(0, BARREL_Y, 0.0125 + grow, 0, Math.PI, false);
    shape.absarc(0, TUBE_Y, 0.0085 + grow, Math.PI, Math.PI * 2, false);
    return shape;
  };
  const shape = outline(0.003);
  shape.holes.push(outline(0) as unknown as THREE.Path);
  const band = (z: number) => new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, z);
  return merge([band(0.43), band(0.585)]);
}

/** The ribbed pump grip, oval in section, wrapped under barrel and tube. */
export function pumpGeometry(): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.013, 0],
    [0.023, 0.004],
    [0.0275, 0.018],
  ];
  for (let h = 0.03; h < 0.19; h += 0.014) profile.push([0.0275, h], [0.0248, h + 0.004], [0.0248, h + 0.008], [0.0275, h + 0.012]);
  profile.push([0.0275, 0.2], [0.023, 0.214], [0.013, 0.218]);
  const grip = lathe(profile, 36);
  grip.scale(1.08, 1, 0.92);
  return alongZ(grip, (BARREL_Y + TUBE_Y) / 2 - 0.004, 0.2);
}

/** The receiver: a rounded block with a loading port, screws, trigger guard and trigger. */
export function receiverGeometry(): { body: THREE.BufferGeometry; dark: THREE.BufferGeometry; trim: THREE.BufferGeometry } {
  const shape = new THREE.Shape();
  // Side profile in (z, y): a sloped front, a flat top and a deeper belly for the trigger.
  shape.moveTo(0.06, -0.026);
  shape.lineTo(0.06, 0.018);
  shape.quadraticCurveTo(0.058, 0.03, 0.045, 0.03);
  shape.lineTo(-0.15, 0.03);
  shape.lineTo(-0.16, 0.02);
  shape.lineTo(-0.16, -0.04);
  shape.quadraticCurveTo(-0.12, -0.046, -0.04, -0.04);
  shape.quadraticCurveTo(0.03, -0.036, 0.06, -0.026);
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.034, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.005, bevelSegments: 3, curveSegments: 12 });
  body.rotateY(-Math.PI / 2).translate(0.017, 0, 0);

  const port = new THREE.BoxGeometry(0.004, 0.016, 0.05).translate(0.0235, 0.008, -0.06);
  const groove = new THREE.BoxGeometry(0.006, 0.003, 0.17).translate(0, 0.036, -0.055);
  const trigger = new THREE.TorusGeometry(0.018, 0.0035, 8, 16, Math.PI * 0.7).rotateY(Math.PI / 2).rotateX(Math.PI * 0.35);
  trigger.translate(0, -0.05, -0.1);

  const guard = new THREE.TorusGeometry(0.03, 0.004, 8, 24, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI);
  guard.translate(0, -0.042, -0.1);
  const screws = [-0.12, -0.02, 0.035].map((z) => new THREE.CylinderGeometry(0.0045, 0.0045, 0.05, 12).rotateZ(Math.PI / 2).translate(0, -0.01, z));
  const badge = new THREE.CylinderGeometry(0.012, 0.012, 0.047, 24).rotateZ(Math.PI / 2).scale(1, 0.7, 1.4).translate(0, 0.004, -0.085);
  // A cross bolt safety behind the trigger, standing proud on both sides.
  const safety = new THREE.CylinderGeometry(0.0055, 0.0055, 0.058, 16).rotateZ(Math.PI / 2).translate(0, -0.03, -0.135);
  // The steel tang where the stock meets the receiver.
  const tang = new THREE.BoxGeometry(0.03, 0.006, 0.05).translate(0, 0.031, -0.17);
  return { body, dark: merge([port, groove, trigger, safety]), trim: merge([guard, badge, tang, ...screws]) };
}

/** The stock, cut from one board: comb, pistol grip and a flat butt. */
export function stockGeometry(): { wood: THREE.BufferGeometry; butt: THREE.BufferGeometry } {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, 0.028);
  shape.quadraticCurveTo(-0.32, 0.034, -0.66, 0.052);
  shape.lineTo(-0.675, 0.046);
  shape.lineTo(-0.7, -0.108);
  shape.lineTo(-0.685, -0.118);
  shape.quadraticCurveTo(-0.46, -0.08, -0.3, -0.09);
  shape.quadraticCurveTo(-0.23, -0.12, -0.2, -0.1);
  shape.quadraticCurveTo(-0.17, -0.06, -0.15, -0.04);
  shape.lineTo(-0.15, 0.028);
  const wood = new THREE.ExtrudeGeometry(shape, { depth: 0.038, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.007, bevelSegments: 4, curveSegments: 20 });
  wood.rotateY(-Math.PI / 2).translate(0.019, 0, 0);
  const butt = new THREE.BoxGeometry(0.052, 0.17, 0.014).rotateX(-0.16).translate(0, -0.03, -0.7);
  return { wood, butt };
}

/** Sling swivels: one on the stock's belly, one on the shot tube near the muzzle, and a crown ring at the muzzle. */
export function fittingsGeometry(): THREE.BufferGeometry {
  const ring = (radius: number) => new THREE.TorusGeometry(radius, 0.0025, 8, 20);
  const rear = ring(0.011).rotateY(Math.PI / 2).translate(0, -0.1, -0.46);
  const rearStud = new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8).translate(0, -0.088, -0.46);
  const front = ring(0.01).rotateY(Math.PI / 2).translate(0, TUBE_Y - 0.021, 0.5);
  const frontStud = new THREE.CylinderGeometry(0.0035, 0.0035, 0.012, 8).translate(0, TUBE_Y - 0.011, 0.5);
  const crown = new THREE.TorusGeometry(0.0168, 0.0016, 8, 28).translate(0, BARREL_Y, MUZZLE_Z - 0.052);
  return merge([rear, rearStud, front, frontStud, crown]);
}

/** The laser pointer clamped under the barrel, with its ring clamp. */
export function laserGeometry(): { body: THREE.BufferGeometry; lens: THREE.BufferGeometry } {
  const body = alongZ(
    lathe([
      [0, 0],
      [0.0095, 0],
      [0.0105, 0.01],
      [0.0105, 0.07],
      [0.0115, 0.074],
      [0.0115, 0.086],
      [0.008, 0.086],
    ], 20),
    LASER_AT.y,
    LASER_AT.z - 0.086,
  );
  const clamp = new THREE.BoxGeometry(0.008, 0.03, 0.016).translate(0, (LASER_AT.y + TUBE_Y) / 2, LASER_AT.z - 0.045);
  const lens = new THREE.CircleGeometry(0.0065, 20).translate(LASER_AT.x, LASER_AT.y, LASER_AT.z + 0.0005);
  return { body: merge([body, clamp]), lens };
}
