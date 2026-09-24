/**
 * With ?zlow on the host's address, the 3D view draws at low resolution
 * with cheap texture filtering, and the game may take bigger time steps.
 * Browser tests use it, since they render in software on a busy machine.
 */
export function lowQuality(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("zlow");
}

/**
 * With ?zgallery=butcher,walker on the host's address, those zombies
 * stand close in front of the lobby instead of the usual shamblers, so
 * their models can be looked at. Add &zpose=attack or &zpose=dead, and
 * &zset=hospital or &zset=industrial to dress them for those places.
 */
export function gallery(): { kinds: string[]; pose: string; setting: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const kinds = params.get("zgallery");
  return kinds ? { kinds: kinds.split(","), pose: params.get("zpose") ?? "walk", setting: params.get("zset") ?? "town" } : null;
}
