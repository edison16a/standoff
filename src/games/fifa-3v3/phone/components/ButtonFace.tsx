/**
 * What is drawn on the controller's round buttons: a small icon over
 * the word, so the second button's change from Slide to Skill is
 * obvious at a glance.
 */

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5 16 10.4 14.5 15h-5L8 10.4Z" fill="currentColor" />
    </svg>
  );
}

function SlideIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 18h13l5-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13h6M6 9h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SkillIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7Z" fill="currentColor" />
    </svg>
  );
}

/** A boot poking at a ball. */
function StealIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9h7l2 5h-9Z" fill="currentColor" />
      <circle cx="17.5" cy="14.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8l3-3M14 10l4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Arms up over a rising figure. */
function JumpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="2.4" fill="currentColor" />
      <path d="M6 3l4 5h4l4-5M10 8l-1 7M14 8l1 7M9 15l-2 4M15 15l2 4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A shield: stay with your man. */
function GuardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = { ball: BallIcon, slide: SlideIcon, skill: SkillIcon, steal: StealIcon, jump: JumpIcon, guard: GuardIcon } as const;

export function ButtonFace({ icon, text }: { icon: keyof typeof ICONS; text: string }) {
  const Icon = ICONS[icon];
  return (
    <span className="fifa-face">
      <Icon />
      <span className="fifa-face__text">{text}</span>
    </span>
  );
}
