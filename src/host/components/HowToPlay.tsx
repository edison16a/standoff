import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/icon-paths";

const MOVES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "hand",
    title: "Hold it like a sword",
    text: "Grip the phone like a handle with the top edge pointing at the screen, then tap Calibrate. That pose is your guard.",
  },
  {
    icon: "target",
    title: "Aim",
    text: "The blade on screen follows your hand. Circle the phone and the blade circles. A jab only lands if the tip points at your opponent.",
  },
  {
    icon: "skip",
    title: "Jab",
    text: "Thrust the phone forward, fast and short. Your fencer lunges. It lands if you are in range and not parried.",
  },
  {
    icon: "refresh",
    title: "Parry",
    text: "Snap the phone back toward you. For one second, any jab that reaches you is blocked, and the attacker is thrown off balance.",
  },
  {
    icon: "expand",
    title: "Move",
    text: "Push your arm out and hold it there to advance, pull it in and hold to retreat. Rest it in the middle to stand still.",
  },
  {
    icon: "trophy",
    title: "Win",
    text: "First to two touches. Every touch gets a replay, which both players can skip.",
  },
];

/** The rules, short enough to read while the other player finds their phone. */
export function HowToPlay() {
  return (
    <ul className="howto">
      {MOVES.map((move) => (
        <li key={move.title} className="howto__item">
          <span className="howto__icon">
            <Icon name={move.icon} />
          </span>
          <div>
            <strong>{move.title}</strong>
            <p className="muted">{move.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
