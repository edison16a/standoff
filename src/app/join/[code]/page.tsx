import { PhoneEntry } from "@/platform/phone/components/PhoneEntry";
import { ROOM_CODE_PATTERN } from "@/platform/protocol";
import { notFound } from "next/navigation";

/** The page a phone opens from the QR code. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalized)) notFound();
  return <PhoneEntry code={normalized} />;
}
