import { KINDS } from "./kinds";
import { BOARDS, BOOTH, boardTop, type Vec3 } from "./layout";
import type { Target } from "./target";

/** A ray from the camera through a point on screen. The direction need not be normalised. */
export interface Ray {
  origin: Vec3;
  dir: Vec3;
}

/** What a ray meets first: a target (with where on it), or the scenery. */
export interface Probe {
  point: Vec3;
  target: Target | null;
  bull: boolean;
}

/** Where a ray crosses the plane at depth z, if it does in front of the camera. */
export function atDepth(ray: Ray, z: number): Vec3 | null {
  if (Math.abs(ray.dir.z) < 1e-9) return null;
  const t = (z - ray.origin.z) / ray.dir.z;
  if (t <= 0) return null;
  return { x: ray.origin.x + ray.dir.x * t, y: ray.origin.y + ray.dir.y * t, z };
}

/**
 * Whether a point on a target's face falls inside its hit shapes, and if
 * so whether it is in the bull. Returns null for a miss.
 */
export function strikes(target: Target, point: Vec3): { bull: boolean } | null {
  const info = KINDS[target.kind];
  const dx = ((point.x - target.x) * target.facing) / info.scale;
  const dy = (point.y - target.y) / info.scale;
  const inside = info.shapes.some((s) => ((dx - s.x) / s.rx) ** 2 + ((dy - s.y) / s.ry) ** 2 <= 1);
  if (!inside) return null;
  const first = info.shapes[0]!;
  const bull = info.bullRadius !== undefined && Math.hypot(dx - first.x, dy - first.y) <= info.bullRadius;
  return { bull };
}

type Surface = { z: number; kind: "board"; index: number } | { z: number; kind: "target"; target: Target } | { z: number; kind: "counter" };

/**
 * Follows a ray into the booth and returns the first thing it meets. The
 * counter and the wave boards stop it where they stand taller than the
 * ray, so a duck half hidden behind a wave can only be hit where it
 * shows. The same probe places the laser dot and decides every shot, so
 * players always hit exactly what the dot sits on.
 */
export function probe(targets: readonly Target[], ray: Ray): Probe {
  const surfaces: Surface[] = [{ z: BOOTH.counterZ, kind: "counter" }];
  BOARDS.forEach((board, index) => surfaces.push({ z: board.z, kind: "board", index }));
  for (const target of targets) if (!target.hit) surfaces.push({ z: target.z, kind: "target", target });
  // Nearest first. Targets sit a little behind their own board, so order by depth is enough.
  surfaces.sort((a, b) => b.z - a.z);

  for (const surface of surfaces) {
    const point = atDepth(ray, surface.z);
    if (!point) continue;
    if (surface.kind === "counter") {
      if (point.y < BOOTH.counterTopY) return { point, target: null, bull: false };
    } else if (surface.kind === "board") {
      if (Math.abs(point.x) <= BOOTH.halfWidth && point.y < boardTop(BOARDS[surface.index]!, point.x)) {
        return { point, target: null, bull: false };
      }
    } else if (Math.abs(point.x) <= BOOTH.halfWidth) {
      // Targets out past the side posts are behind them, so they cannot be hit.
      const struck = strikes(surface.target, point);
      if (struck) return { point, target: surface.target, bull: struck.bull };
    }
  }
  const wall = atDepth(ray, BOOTH.wallZ) ?? { x: ray.origin.x, y: ray.origin.y, z: BOOTH.wallZ };
  return { point: wall, target: null, bull: false };
}
