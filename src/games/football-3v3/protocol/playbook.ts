import { z } from "zod";

/**
 * The QB's page of plays as his phone draws it (engine/playbook/card.ts).
 * Points are in card units: across 0 to 1 from the QB's left sideline to
 * his right, and up 0 to 1 from behind the line to downfield.
 */
const unit = z.number().min(0).max(1);
const point = z.tuple([unit, unit]);

export const cardRunnerSchema = z.object({
  /** 1 to 4: his number on the card and on the field, which picks his colour. */
  n: z.number().int().min(1).max(4),
  path: z.array(point).max(8),
  end: z.enum(["arrow", "stop", "block"]),
  word: z.string().max(16),
  /** A person's runner, free to go where he likes. */
  free: z.boolean(),
  /** The back taking the pitch on a run call. */
  carry: z.boolean(),
});

export const playCardSchema = z.object({
  name: z.string().max(32),
  runners: z.array(cardRunnerSchema).max(4),
});

export const bookSchema = z.object({
  call: z.enum(["throw", "run"]),
  /** Whole seconds left to pick before the first play is called. */
  left: z.number().int().min(0).max(99),
  los: unit,
  qb: point,
  plays: z.array(playCardSchema).max(6),
});

/** The QB picks a play off the page by its place, deals a fresh page, or goes back to Throw, Run and Kick. */
export const playSchema = z.object({
  kind: z.literal("play"),
  action: z.union([z.number().int().min(0).max(5), z.enum(["redeal", "back"])]),
});

export type CardRunner = z.infer<typeof cardRunnerSchema>;
export type PlayCardView = z.infer<typeof playCardSchema>;
export type Book = z.infer<typeof bookSchema>;
