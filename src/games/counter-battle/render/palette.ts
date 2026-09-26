/**
 * The arena's own colours. The bunkers are lime and charcoal with white
 * trim, loud like a pro paintball field and clear of both team colours,
 * so a fighter in pink or cyan always stands out against cover.
 */
export const FIELD_COLOURS = {
  lime: "#b8f400",
  limeDark: "#7fae00",
  charcoal: "#23262d",
  white: "#f4f6f1",
  strap: "#15171b",
  drum: "#f26b1d",
  drumDark: "#9a3b0c",
  plywood: "#c99a5e",
  plywoodDark: "#8a6236",
  turf: "#2f8f3a",
  turfLight: "#3aa447",
  line: "#f3f7ee",
  netPost: "#2c2f36",
  gravel: "#8c8577",
} as const;

/** The late afternoon light: warm sun, cool sky. */
export const LIGHT = {
  sun: "#ffe2b8",
  sky: "#9fd3ff",
  ground: "#4b5d2c",
  fog: "#b9d6ec",
} as const;
