import { notFound } from "next/navigation";
import { VictoryLab, type LabShow } from "@/games/kit/victory/dev/VictoryLab";

const SHOWS: readonly LabShow[] = ["all", "belt", "basketball", "world", "podium"];

/**
 * The victory kit's test bench. Development only: players never land
 * here. `show` picks what is on stage: all, belt, basketball, world or podium.
 */
export default async function VictoryDevPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const show = (await searchParams).show;
  return <VictoryLab show={SHOWS.find((s) => s === show) ?? "all"} />;
}
