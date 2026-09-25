/** The game's name as chunky sticker lettering, for the icon and the lobby. */
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`ss-logo${small ? " ss-logo--small" : ""}`} aria-label="Subway Surfers">
      <span className="ss-logo__word ss-logo__word--top">SUBWAY</span>
      <span className="ss-logo__word ss-logo__word--bottom">SURFERS</span>
    </div>
  );
}
