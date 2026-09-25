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

const ICONS = { ball: BallIcon, slide: SlideIcon, skill: SkillIcon } as const;

export function ButtonFace({ icon, text }: { icon: keyof typeof ICONS; text: string }) {
  const Icon = ICONS[icon];
  return (
    <span className="fifa-face">
      <Icon />
      <span className="fifa-face__text">{text}</span>
    </span>
  );
}
