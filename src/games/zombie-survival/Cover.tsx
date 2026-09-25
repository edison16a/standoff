import Image from "next/image";
import cover from "./cover.jpg";

/**
 * Four players' lasers on the Butcher in his alley: a copy of the
 * showcase poster, shown wherever the captured media is not.
 */
export function Cover() {
  return <Image className="cover__art" src={cover} alt="" fill sizes="(max-width: 720px) 100vw, 50vw" placeholder="blur" />;
}
