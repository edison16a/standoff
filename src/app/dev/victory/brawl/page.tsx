import { notFound } from "next/navigation";
import { BrawlResults } from "./BrawlResults";

/** Brawl Battle's results with the winner on the pedestal, without a match. Development only. `?who=` picks the fighter. */
export default async function BrawlPedestalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <BrawlResults who={typeof params.who === "string" ? params.who : "samurai"} />;
}
