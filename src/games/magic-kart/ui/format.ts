const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

/** 1st, 2nd, 3rd and so on. */
export function ordinal(place: number): string {
  return ORDINALS[place - 1] ?? `${place}th`;
}

/** A race time as minutes, seconds and hundredths, like 1:23.45. */
export function raceTime(seconds: number): string {
  const whole = Math.max(0, seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, "0")}`;
}
