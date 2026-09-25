import Image from "next/image";
import cover from "./cover.jpg";

/**
 * A fire blade cutting a watermelon, an orange and a peach in one swipe
 * over the wooden board. A copy of the captured poster, for anywhere the
 * drawn cover is still used.
 */
export function Cover() {
  return <Image className="cover__art" src={cover} alt="" fill sizes="(max-width: 720px) 100vw, 50vw" placeholder="blur" />;
}
