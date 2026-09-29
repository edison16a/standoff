/**
 * What is drawn on the controller's round buttons: a small icon over
 * the word, so each button reads at a glance while the player watches
 * the big screen.
 */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A football on its side. */
function Ball() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12c3-6 15-6 18 0-3 6-15 6-18 0Z" {...stroke} />
      <path d="M9 12h6M10.5 10.5v3M13.5 10.5v3" {...stroke} strokeWidth={1.6} />
    </svg>
  );
}

/** A spin: an arrow curling all the way round. */
function Juke() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12a7 7 0 1 1-3-5.7" {...stroke} />
      <path d="M16.5 2.8 16.2 6.6 20 7" {...stroke} />
    </svg>
  );
}

/** A body flying forward, arms out. */
function Dive() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="19" cy="8" r="2.2" fill="currentColor" />
      <path d="M3 17l6-3 7-4.5M9 14l-2 4M13 12l3 3" {...stroke} />
    </svg>
  );
}

/** Two chevrons: a burst through the line. */
function Rush() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5l7 7-7 7M12 5l7 7-7 7" {...stroke} strokeWidth={2.6} />
    </svg>
  );
}

/** An impact star. */
function Tackle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l2.2 6 6-2.2-3.4 5.2L22 14l-6.2.6L16 21l-4-4.6L8 21l.2-6.4L2 14l5.2-3-3.4-5.2 6 2.2Z" fill="currentColor" />
    </svg>
  );
}

/** A shield: stay with your man. */
function Guard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6Z" {...stroke} />
      <path d="M12 7v10" {...stroke} strokeWidth={2} />
    </svg>
  );
}

/** A kicking boot with its studs. */
function Kick() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3h6v8l6 2.2c1.8.6 2.8 1.6 2.8 3.3V18H4Z" fill="currentColor" />
      <path d="M6 21h2M11 21h2M16 21h2" {...stroke} strokeWidth={1.8} />
    </svg>
  );
}

/** Fast forward. */
function Skip() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5l8 7-8 7ZM12 5l8 7-8 7Z" fill="currentColor" />
    </svg>
  );
}

const ICONS = { ball: Ball, juke: Juke, dive: Dive, rush: Rush, tackle: Tackle, guard: Guard, kick: Kick, skip: Skip } as const;
export type FaceIcon = keyof typeof ICONS;

export function ButtonFace({ icon, text }: { icon: FaceIcon; text: string }) {
  const Icon = ICONS[icon];
  return (
    <span className="fb-face">
      <Icon />
      <span className="fb-face__text">{text}</span>
    </span>
  );
}
