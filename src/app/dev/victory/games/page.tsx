import { notFound } from "next/navigation";
import { GameScenes } from "./GameScenes";

/** The games' own winners' scenes with sample players. Development only. `?game=kart` or `?game=brawl`. */
export default async function VictoryGamesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <GameScenes game={params.game === "brawl" ? "brawl" : "kart"} />;
}
