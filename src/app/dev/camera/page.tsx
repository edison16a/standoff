import { notFound } from "next/navigation";
import { CameraLab } from "@/games/kit/camera/dev/CameraLab";

/**
 * The camera kit's test bench. Development only: players never land here.
 * Options in the address: players=1 or 2, camera=fake (injected poses,
 * no camera), model=full or lite, delegate=CPU, needs=full, guard=1.
 */
export default async function CameraDevPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const pick = (name: string) => (typeof params[name] === "string" ? params[name] : undefined);
  const model = pick("model");
  return (
    <CameraLab
      settings={{
        players: pick("players") === "1" ? 1 : 2,
        model: model === "full" || model === "lite" ? model : "auto",
        delegate: pick("delegate") === "CPU" ? "CPU" : "GPU",
        needs: pick("needs") === "full" ? "full" : "upper",
        guardStep: pick("guard") === "1",
      }}
    />
  );
}
