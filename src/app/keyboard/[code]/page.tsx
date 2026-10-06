import { notFound } from "next/navigation";
import { PanelEntry } from "@/platform/keyboard/components/PanelEntry";
import { ROOM_CODE_PATTERN } from "@/platform/protocol";

/**
 * The keyboard player's phone, shown inside the host page's phone panel
 * (see src/platform/keyboard). Opened on its own it never joins.
 */
export default async function KeyboardPanelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalized)) notFound();
  return <PanelEntry code={normalized} />;
}
