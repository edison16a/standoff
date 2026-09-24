/**
 * Fencing's card before its media is captured: the evening strip in two
 * colours, drawn in CSS. The captured icon and clip replace it.
 */
export function Cover() {
  return (
    <div
      className="cover__art"
      aria-hidden="true"
      style={{ background: "linear-gradient(160deg, #1a1240 0%, #07080f 60%), radial-gradient(circle at 50% 80%, #ff4757 0%, transparent 60%)" }}
    />
  );
}
