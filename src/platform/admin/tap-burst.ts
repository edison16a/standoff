/**
 * Spots a quick burst of taps, such as three taps on the settings gear
 * to open the hidden admin panel. Each tap must follow the last within
 * `gapMs`. Returns true on the tap that completes the burst, then starts
 * counting again, so a fourth tap is an ordinary tap.
 */
export function createTapBurst(needed = 3, gapMs = 450): (now: number) => boolean {
  let count = 0;
  let last = -Infinity;
  return (now) => {
    count = now - last <= gapMs ? count + 1 : 1;
    last = now;
    if (count < needed) return false;
    count = 0;
    last = -Infinity;
    return true;
  };
}
