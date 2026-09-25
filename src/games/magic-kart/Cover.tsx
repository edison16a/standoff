import Image from "next/image";
import cover from "./cover.jpg";

/**
 * The pack flying the lagoon jump on Sunny Shores. A copy of the captured
 * poster, used wherever the home screen has no media to show.
 */
export function Cover() {
  return <Image className="cover__art" src={cover} alt="" fill sizes="(max-width: 720px) 100vw, 50vw" placeholder="blur" />;
}
