import { clientEnvelopeSchema, type ClientEnvelope } from "@/shared/protocol";

/** Motion frames are tiny. Anything this big is not from our client. */
export const MAX_FRAME_BYTES = 16 * 1024;

/** Validates one message from a client. Anything that is not a known envelope comes back null. */
export function parseEnvelope(text: string): ClientEnvelope | null {
  if (text.length > MAX_FRAME_BYTES) return null;
  try {
    const result = clientEnvelopeSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
