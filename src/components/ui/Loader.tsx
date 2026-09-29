import { MARK_SHAPES, MARK_STROKE, MARK_VIEWBOX } from "./Brand";

/**
 * The on brand wait: the logo's three triangles hop in turn, like a play
 * button pushing forward, over a sliding bar in the same colours. Used
 * while a phone or the host connects, joins or loads a game, so waiting
 * always looks alive and never like a frozen page.
 */
export function Loader({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`loader ${className ?? ""}`} role="status" aria-live="polite">
      <svg className="loader__mark" viewBox={MARK_VIEWBOX} strokeWidth={MARK_STROKE} strokeLinejoin="round" aria-hidden="true">
        {MARK_SHAPES.map((shape, i) => (
          <path key={shape.colour} className={`loader__shape loader__shape--${i + 1}`} d={shape.path} fill={shape.colour} stroke={shape.colour} />
        ))}
      </svg>
      <span className="loader__bar" aria-hidden="true" />
      <span className="loader__label">{label}</span>
    </div>
  );
}

/** A small spinner in the brand colours, for one line notices like Reconnecting. */
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
