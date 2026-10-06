import { newBall, stepBall } from "../ball";
import { BALL_BODY } from "./constants";

const R = BALL_BODY.radius;
/** The fastest roll the table covers, m/s. */
const TOP = 34;
const DT = 1 / 120;

interface Row {
  speed: number;
  /** Metres and seconds still to go before the ball stops. */
  left: number;
  time: number;
}

let table: Row[] | null = null;

/**
 * A ball rolling true across the turf from a hard drive to a stop,
 * flown once with the match's own physics and kept: how far and how
 * long it still has to go from every speed. Passes, throws and dribble
 * touches read it to pick the pace that gets the ball where it is meant
 * to go, so the roll they plan is the roll the ball makes.
 */
function rows(): Row[] {
  if (table) return table;
  const ball = newBall();
  ball.vel.x = TOP;
  ball.spin.z = -TOP / R;
  const trace: { speed: number; x: number; t: number }[] = [];
  let t = 0;
  while (ball.vel.x > 1e-3 && t < 120) {
    trace.push({ speed: ball.vel.x, x: ball.pos.x, t });
    stepBall(ball, DT, [], { flightOnly: true });
    t += DT;
  }
  const end = { x: ball.pos.x, t };
  table = trace.map((r) => ({ speed: r.speed, left: end.x - r.x, time: end.t - r.t }));
  table.push({ speed: 0, left: 0, time: 0 });
  return table;
}

/** Interpolates the row at `speed`: falling speeds down the table. */
function at(speed: number): { left: number; time: number } {
  const t = rows();
  const s = Math.max(0, Math.min(TOP, speed));
  let lo = 0;
  let hi = t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid]!.speed > s) lo = mid;
    else hi = mid;
  }
  const a = t[lo]!;
  const b = t[hi]!;
  const f = a.speed === b.speed ? 0 : (a.speed - s) / (a.speed - b.speed);
  return { left: a.left + (b.left - a.left) * f, time: a.time + (b.time - a.time) * f };
}

/** Metres a rolling ball covers while it slows from `from` to `to` m/s. */
export function rollDistance(from: number, to = 0): number {
  return Math.max(0, at(from).left - at(to).left);
}

/** Seconds a rolling ball takes to slow from `from` to `to` m/s. */
export function rollTime(from: number, to = 0): number {
  return Math.max(0, at(from).time - at(to).time);
}

/** The pace to roll a ball at so it covers `distance` and still has `arrive` m/s when it gets there. */
export function rollSpeedFor(distance: number, arrive = 0): number {
  const want = rollDistance(arrive) + Math.max(0, distance);
  let lo = arrive;
  let hi = TOP;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid).left < want) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** How far a ball rolled at `speed` gets in `seconds`, and its pace then. */
export function rollAfter(speed: number, seconds: number): { distance: number; speed: number } {
  const start = at(speed);
  const time = Math.max(0, start.time - seconds);
  // Find the speed with that much time left, by bisection on the falling table.
  let lo = 0;
  let hi = Math.min(TOP, speed);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid).time < time) lo = mid;
    else hi = mid;
  }
  const now = (lo + hi) / 2;
  return { distance: start.left - at(now).left, speed: now };
}

/** The pace that rolls a ball `distance` in exactly `seconds`, as close as a roll allows. */
export function rollSpeedIn(distance: number, seconds: number): number {
  let lo = 0;
  let hi = TOP;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (rollAfter(mid, seconds).distance < distance) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
