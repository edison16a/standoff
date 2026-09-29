import { notFound } from "next/navigation";
import { KartResults } from "./KartResults";

/** Magic Kart's results with the podium, without racing. Development only. */
export default function KartPodiumPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KartResults />;
}
