import type { HostRoomApi } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { rezone, WHOLE_SCREEN, type AimZone, type ScreenPoint } from "./aim-math";
import { AIM_TARGETS } from "./aim-targets";
import { aimFireSchema, aimSchema, aimStepSchema, type AimStep } from "./protocol";

interface SeatAim {
  /** The latest point the phone sent. */
  target: ScreenPoint;
  /** What is drawn, eased toward the target so network gaps never make the dot jump. */
  shown: ScreenPoint;
  step: AimStep | null;
  /**
   * The zone the calibration targets were last shown in. The phone's aim
   * spans it, so it is mapped into the seat's zone of the moment. Null
   * until a target shows, as with drag aiming, which follows the zone.
   */
  calibratedIn: AimZone | null;
  seenAt: number;
  easedAt: number;
}

/** How quickly the drawn dot catches up with the phone, per second. */
const EASE_RATE = 28;
/** A phone that has not sent its aim for this long is not aiming right now. */
const STALE_MS = 1200;

const TARGET_STEPS: readonly AimStep[] = AIM_TARGETS;

/**
 * How far out an aim may go, in zone units. A touch inside the true edge,
 * so a laser dot a game draws in 3D, centred on the aim, still shows
 * rather than sitting half off the screen.
 */
export const EDGE = 0.96;

/**
 * Holds a point at the edge of its zone. Pointing past the edge leaves the
 * dot there, still in sight, and as the phone comes back in it moves on
 * from the edge smoothly, with no jump. Every pointing game gets this.
 */
export function pinToEdge(point: ScreenPoint): ScreenPoint {
  return { x: Math.max(-EDGE, Math.min(EDGE, point.x)), y: Math.max(-EDGE, Math.min(EDGE, point.y)) };
}

/**
 * The host side of the aim kit. It listens for every phone's aim, trigger
 * pulls and calibration step, and hands the game a smoothed point per
 * seat in screen space (x and y from -1 to 1, y up), ready to raycast
 * into a 3D scene or draw over it.
 */
export class HostAim {
  private readonly seats = new Map<Seat, SeatAim>();
  private readonly zones = new Map<Seat, AimZone>();
  private readonly fireListeners = new Set<(seat: Seat, point: ScreenPoint) => void>();
  private readonly off: () => void;

  constructor(room: HostRoomApi) {
    this.off = room.on((event) => {
      if (event.type === "left") this.seats.delete(event.seat);
      if (event.type !== "message") return;
      const { seat, payload } = event;
      const aim = aimSchema.safeParse(payload);
      if (aim.success) return this.update(seat, aim.data);
      const fire = aimFireSchema.safeParse(payload);
      if (fire.success) {
        // A player who is shooting has finished calibrating, whatever message went missing.
        this.entry(seat).step = null;
        this.update(seat, fire.data);
        const point = this.toZone(seat, { x: fire.data.x, y: fire.data.y });
        for (const listener of this.fireListeners) listener(seat, point);
        return;
      }
      const step = aimStepSchema.safeParse(payload);
      if (step.success) {
        const aim = this.entry(seat);
        aim.step = step.data.step;
        if (TARGET_STEPS.includes(aim.step)) aim.calibratedIn = this.zone(seat);
      }
    });
  }

  /** Called with the exact aim of every trigger pull. Returns an unsubscribe. */
  onFire(listener: (seat: Seat, point: ScreenPoint) => void): () => void {
    this.fireListeners.add(listener);
    return () => this.fireListeners.delete(listener);
  }

  /**
   * For games with a view per player: the part of the screen a seat aims
   * inside, which is where its calibration targets show and what its
   * points span. Null gives it the whole screen again. If the zone changes
   * after calibrating, points are mapped to the new zone, so the aim still
   * lands where the player really points.
   */
  setZone(seat: Seat, zone: AimZone | null): void {
    if (zone) this.zones.set(seat, { ...zone });
    else this.zones.delete(seat);
    const aim = this.seats.get(seat);
    // Targets on screen move with the zone, and the reading taken is against them.
    if (aim?.step && TARGET_STEPS.includes(aim.step)) aim.calibratedIn = this.zone(seat);
  }

  /** The zone a seat aims inside, the whole screen unless the game set one. */
  zone(seat: Seat): AimZone {
    return this.zones.get(seat) ?? WHOLE_SCREEN;
  }

  /** The eased point to draw for a seat this frame, or null if it is not aiming. Points span the seat's zone. */
  point(seat: Seat, nowMs = performance.now()): ScreenPoint | null {
    const aim = this.seats.get(seat);
    if (!aim || nowMs - aim.seenAt > STALE_MS) return null;
    const dt = Math.min(0.1, Math.max(0, (nowMs - aim.easedAt) / 1000));
    const k = 1 - Math.exp(-EASE_RATE * dt);
    aim.shown = { x: aim.shown.x + (aim.target.x - aim.shown.x) * k, y: aim.shown.y + (aim.target.y - aim.shown.y) * k };
    aim.easedAt = nowMs;
    return this.toZone(seat, aim.shown);
  }

  /**
   * Whether a seat's aim is held at the edge of its zone right now, the
   * phone pointing at or past it. Uses the phone's latest point, not the
   * eased one, so it lets go the moment the aim comes back in.
   */
  atEdge(seat: Seat, nowMs = performance.now()): boolean {
    const aim = this.seats.get(seat);
    if (!aim || nowMs - aim.seenAt > STALE_MS) return false;
    const at = this.toZone(seat, aim.target);
    return Math.max(Math.abs(at.x), Math.abs(at.y)) >= EDGE;
  }

  /** The calibration target a seat is looking for, if it is calibrating. */
  step(seat: Seat): AimStep | null {
    return this.seats.get(seat)?.step ?? null;
  }

  /** Seats that have ever aimed or calibrated. */
  known(): Seat[] {
    return [...this.seats.keys()];
  }

  /** A point as the phone sent it, in the zone it calibrated in, mapped into the seat's zone now. */
  private toZone(seat: Seat, point: ScreenPoint): ScreenPoint {
    const from = this.seats.get(seat)?.calibratedIn;
    return pinToEdge(from ? rezone(point, from, this.zone(seat)) : point);
  }

  dispose(): void {
    this.off();
    this.fireListeners.clear();
  }

  private entry(seat: Seat): SeatAim {
    let aim = this.seats.get(seat);
    if (!aim) {
      const now = performance.now();
      aim = { target: { x: 0, y: 0 }, shown: { x: 0, y: 0 }, step: null, calibratedIn: null, seenAt: now, easedAt: now };
      this.seats.set(seat, aim);
    }
    return aim;
  }

  private update(seat: Seat, point: ScreenPoint): void {
    const aim = this.entry(seat);
    const fresh = performance.now() - aim.seenAt > STALE_MS;
    // Pinned before easing, so a dot held at the edge sets off again the moment the aim comes back in.
    aim.target = pinToEdge(point);
    // A dot reappearing after a pause starts where it is, not sliding in from where it was.
    if (fresh) aim.shown = aim.target;
    aim.seenAt = performance.now();
  }
}

/** Screen space to CSS pixels in a box of the given size. */
export function toPixels(point: ScreenPoint, width: number, height: number): { x: number; y: number } {
  return { x: ((point.x + 1) / 2) * width, y: ((1 - point.y) / 2) * height };
}

/** A pixel point moved just inside a box, so a dot held at the edge of its zone shows whole. */
export function insideBox(at: { x: number; y: number }, box: { x: number; y: number; w: number; h: number }, margin: number): { x: number; y: number } {
  const mx = Math.min(margin, box.w / 2);
  const my = Math.min(margin, box.h / 2);
  return { x: Math.min(Math.max(at.x, box.x + mx), box.x + box.w - mx), y: Math.min(Math.max(at.y, box.y + my), box.y + box.h - my) };
}

/** A point in a zone's space to CSS pixels on a screen of the given size. */
export function zonePixels(point: ScreenPoint, zone: AimZone, width: number, height: number): { x: number; y: number } {
  const at = toPixels(point, zone.w * width, zone.h * height);
  return { x: zone.x * width + at.x, y: zone.y * height + at.y };
}
