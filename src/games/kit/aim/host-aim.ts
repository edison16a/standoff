import type { HostRoomApi } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { rezone, WHOLE_SCREEN, type AimZone, type ScreenPoint } from "./aim-math";
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

const TARGET_STEPS: readonly AimStep[] = ["center", "top-left", "bottom-right"];

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
    return from ? rezone(point, from, this.zone(seat)) : point;
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
    aim.target = { x: point.x, y: point.y };
    // A dot reappearing after a pause starts where it is, not sliding in from where it was.
    if (fresh) aim.shown = aim.target;
    aim.seenAt = performance.now();
  }
}

/** Screen space to CSS pixels in a box of the given size. */
export function toPixels(point: ScreenPoint, width: number, height: number): { x: number; y: number } {
  return { x: ((point.x + 1) / 2) * width, y: ((1 - point.y) / 2) * height };
}

/** A point in a zone's space to CSS pixels on a screen of the given size. */
export function zonePixels(point: ScreenPoint, zone: AimZone, width: number, height: number): { x: number; y: number } {
  const at = toPixels(point, zone.w * width, zone.h * height);
  return { x: zone.x * width + at.x, y: zone.y * height + at.y };
}
