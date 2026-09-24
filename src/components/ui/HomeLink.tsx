import Link from "next/link";
import { Brand } from "./Brand";

/**
 * The Standoff logo in the top left of every screen, which always leads
 * back home. Inside a room it is a button, because going home also ends
 * the room, and the room decides how to do that.
 */
export function HomeLink({ onClick }: { onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" className="home-link" onClick={onClick} aria-label="Back to home">
        <Brand />
      </button>
    );
  }
  return (
    <Link className="home-link" href="/" aria-label="Standoff home">
      <Brand />
    </Link>
  );
}
