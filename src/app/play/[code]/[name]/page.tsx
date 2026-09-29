import { notFound, redirect } from "next/navigation";
import { PhoneEntry } from "@/platform/phone/components/PhoneEntry";
import { nameFromPath } from "@/platform/phone/play-path";
import { ROOM_CODE_PATTERN } from "@/platform/protocol";

/**
 * One player's controller, at /play/<CODE>/<name>. The join page moves
 * here once the phone is seated, so a reload or a reopened tab puts the
 * player straight back in their seat and their game.
 */
export default async function PlayPage({ params }: { params: Promise<{ code: string; name: string }> }) {
  const { code, name } = await params;
  const normalized = code.toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalized)) notFound();
  const player = nameFromPath(name);
  // Without a usable name there is no seat to go back to, so it is a plain join.
  if (!player) redirect(`/join/${normalized}`);
  return <PhoneEntry code={normalized} name={player} />;
}
