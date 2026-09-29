import { createBackend, findRedisUrl, sharedStore } from "@/platform/relay/create-backend";

/**
 * Says where rooms live on this deploy, so anyone can check at a glance
 * that Vercel has its Redis: `store` should read "redis" and `shared`
 * true. It never names the Redis host.
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
