import { notFound } from "next/navigation";
import { VictoryLab, type LabShow } from "@/games/kit/victory/dev/VictoryLab";

const SHOWS: readonly LabShow[] = ["all", "basketball", "worldcup", "belt", "cup", "podium"];

/**
 * The victory kit's test bench. Development only. `?show=` picks one
 * piece: basketball, worldcup, belt, cup or podium.
 */
export default async function VictoryDevPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const show = SHOWS.find((s) => s === params.show) ?? "all";
  return <VictoryLab show={show} />;
}
