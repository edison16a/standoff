import Link from "next/link";
import { Brand } from "./Brand";

/**
 * The Standoff logo in the top left of every screen, which always leads
 * back home. Inside a room it is a button, because going home also ends
 * the room, and the room decides how to do that. A phone's home is the
 * join screen, so phones pass that as `href`.
 */
export function HomeLink({ onClick, href = "/" }: { onClick?: () => void; href?: string }) {
  if (onClick) {
    return (
      <button type="button" className="home-link" onClick={onClick} aria-label="Back to home">
        <Brand />
      </button>
    );
  }
  return (
    <Link className="home-link" href={href} aria-label="Standoff home">
      <Brand />
    </Link>
  );
}
