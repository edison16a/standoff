import { notFound } from "next/navigation";
import { findGame } from "@/games/catalog";
import { ShowcaseEntry } from "@/platform/showcase/ShowcaseEntry";
import type { ShowcaseView } from "@/platform/games/game-api";

const VIEWS: readonly ShowcaseView[] = ["loop", "icon", "poster"];

/**
 * A game playing itself, for capturing its home screen media with
 * tools/media. Development only: players never land here.
 */
export default async function ShowcasePage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { game } = await params;
  const { view } = await searchParams;
  if (!findGame(game)) notFound();
  const chosen = VIEWS.find((v) => v === view) ?? "loop";
  return <ShowcaseEntry gameId={game} view={chosen} />;
}
