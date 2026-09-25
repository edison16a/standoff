import Image from "next/image";
import cover from "./cover.jpg";

/**
 * A fairground booth of ducks and targets, with four lasers and one on the
 * golden duck. A copy of the captured poster, for anywhere the platform
 * still falls back to the drawn cover.
 */
export function Cover() {
  return <Image className="cover__art" src={cover} alt="" fill sizes="(max-width: 720px) 100vw, 50vw" placeholder="blur" />;
}
