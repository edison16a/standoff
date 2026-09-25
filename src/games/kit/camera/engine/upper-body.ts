import { mid, span, type Point } from "./geometry";
import { FACE_POINTS, LM, type Landmark, type Pose } from "./landmarks";

/**
 * Measures read from the head and shoulders alone. Players stand waist
 * up in front of a computer camera, so the hips are often below the
 * picture and the legs never in it.
 */

const SEEN = 0.5;
/** A player turned further than this, about 60 degrees, gives too little to correct from. */
const MAX_TURN_CORRECTION = 2;

export interface HeadReading {
  point: Point;
  /** Some part of the face was clearly seen. When not, the point is the model's guess. */
  seen: boolean;
}

/**
 * The middle of every face point clearly seen: nose, eyes and ears. The
 * ears sit near the axis a nod turns about, so the average moves less on
 * a nod than the nose alone.
 */
export function headOf(landmarks: readonly Landmark[]): HeadReading {
  let x = 0;
  let y = 0;
  let count = 0;
  for (const index of FACE_POINTS) {
    const p = landmarks[index]!;
    if (p.visibility < SEEN) continue;
    x += p.x;
    y += p.y;
    count++;
  }
  if (count) return { point: { x: x / count, y: y / count }, seen: true };
  const nose = landmarks[LM.nose]!;
  return { point: { x: nose.x, y: nose.y }, seen: false };
}

/**
 * The shoulder width in frame heights as if the player faced the camera.
 * Turning side on shortens the picture's span, but it shortens the world
 * points' span across the picture just as much, so their ratio to the
 * full 3D span undoes the turn. What is left changes only with distance.
 */
export function shoulderWidthOf(pose: Pose, aspect: number): number {
  const picture = span(pose.landmarks[LM.leftShoulder]!, pose.landmarks[LM.rightShoulder]!, aspect);
  const a = pose.world[LM.leftShoulder]!;
  const b = pose.world[LM.rightShoulder]!;
  const across = Math.hypot(a.x - b.x, a.y - b.y);
  const full = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const turn = across > 1e-4 ? Math.min(MAX_TURN_CORRECTION, full / across) : 1;
  return picture * turn;
}

/** Both hips clearly seen. Waist up, they usually are not. */
export function hipsSeen(landmarks: readonly Landmark[]): boolean {
  return Math.min(landmarks[LM.leftHip]!.visibility, landmarks[LM.rightHip]!.visibility) >= SEEN;
}

/**
 * The middle of the hips: seen when it can be, else found one torso
 * length straight down from the shoulders, square to the shoulder line.
 * A lean at the waist tips the shoulder line as much as the spine, so
 * the guess stays under the real hips while the player leans.
 */
export function hipsOf(landmarks: readonly Landmark[], aspect: number, torso: number): Point {
  const left = landmarks[LM.leftShoulder]!;
  const right = landmarks[LM.rightShoulder]!;
  if (hipsSeen(landmarks)) return mid(landmarks[LM.leftHip]!, landmarks[LM.rightHip]!);
  const shoulders = mid(left, right);
  const dx = (right.x - left.x) * aspect;
  const dy = right.y - left.y;
  const length = Math.hypot(dx, dy);
  // Square to the shoulder line, pointing down the picture. Straight down when the line is too short to trust.
  const [downX, downY] = length > 1e-4 && dx > 0 ? [-dy / length, dx / length] : [0, 1];
  return { x: shoulders.x + (downX * torso) / aspect, y: shoulders.y + downY * torso };
}
