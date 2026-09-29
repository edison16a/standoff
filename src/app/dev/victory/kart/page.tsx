import { notFound } from "next/navigation";
import { KartResults } from "./KartResults";

/** Magic Kart's results with the podium, without racing. Development only. `?who=` picks the winner's kart. */
export default async function KartPodiumPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <KartResults who={typeof params.who === "string" ? params.who : "blaze"} />;
}
