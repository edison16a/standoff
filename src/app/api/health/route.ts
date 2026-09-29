import { createBackend, findRedisUrl, sharedStore } from "@/platform/relay/create-backend";

/**
 * Says where rooms live on this deploy and which deployment answered,
 * which helps tell a deploy that ended the open rooms from a bug. Memory is
 * the normal store. It never names a Redis host.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const store = findRedisUrl() ? "redis" : "memory";
  try {
    await createBackend();
  } catch {
    return Response.json({ store, ok: false }, { status: 503, headers: NO_STORE });
  }
  return Response.json(
    {
      store,
      shared: sharedStore(),
      deployment: process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 12) ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
    { headers: NO_STORE },
  );
}
