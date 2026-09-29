import { notFound } from "next/navigation";
import { BuildsPick } from "./BuildsPick";

/** Boxing's build choice without a camera. Development only. `?players=2` for two. */
export default async function BoxingBuildsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <BuildsPick players={params.players === "2" ? 2 : 1} />;
}
