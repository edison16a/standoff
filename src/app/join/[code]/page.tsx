import { ControllerEntry } from "@/platform/phone/components/ControllerEntry";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@/platform/protocol";
import { notFound } from "next/navigation";

const CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

/** The page a phone opens from the QR code. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  if (!CODE_PATTERN.test(normalized)) notFound();
  return <ControllerEntry code={normalized} />;
}
