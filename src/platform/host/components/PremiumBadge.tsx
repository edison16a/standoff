import { StandoffMark } from "@/components/ui/Brand";

/**
 * The gold pill on a Standoff Premium game, with the logo mark. On a tile
 * too small for both words the first one drops out, and the mark still
 * says whose premium it is. See home-premium.css.
 */
export function PremiumBadge({ place }: { place: "tile" | "details" }) {
  return (
    <span className={`premium-badge premium-badge--${place}`}>
      <StandoffMark />
      <span className="premium-badge__brand">Standoff </span>
      Premium
    </span>
  );
}
