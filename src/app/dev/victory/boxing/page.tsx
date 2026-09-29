import { notFound } from "next/navigation";
import { BoxingCeremony } from "./BoxingCeremony";

/** Boxing's winner's ceremony on its own. Development only. */
export default function BoxingCeremonyPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BoxingCeremony />;
}
