/**
 * Blade Clash's card before its media is captured: two blades of light
 * crossing over a dark hall, drawn in CSS. The captured icon and clip
 * replace it.
 */
export function Cover() {
  return (
    <div
      className="cover__art"
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(35deg, transparent 48.5%, #ffd9a8 49.5%, #ff8a1f 50.5%, transparent 51.5%), linear-gradient(145deg, transparent 48.5%, #ffffff 49.5%, #7cc4ff 50.5%, transparent 51.5%), radial-gradient(circle at 50% 50%, #ff8a1f55 0%, transparent 45%), linear-gradient(160deg, #1c1030 0%, #07080f 70%)",
      }}
    />
  );
}
