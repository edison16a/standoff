/**
 * Page addresses carry room codes and, on a controller, the player's name
 * (/play/CODE/name). Analytics only needs which kind of page it was, so
 * those parts are swapped for placeholders before anything leaves the
 * browser. Query strings and fragments are dropped for the same reason.
 */
export function privateUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const path = parsed.pathname
    .replace(/^\/play\/[^/]+\/[^/]+/, "/play/[code]/[name]")
    .replace(/^\/play\/[^/]+/, "/play/[code]")
    .replace(/^\/join\/[^/]+/, "/join/[code]");
  return `${parsed.origin}${path}`;
}
