import Image from "next/image";
import cover from "./cover.jpg";

/**
 * Three karts side by side down the straight, heading for the checkered gantry.
 * A still render from a three.js scene, so the card shows the game's
 * look before the game itself exists.
 */
export function Cover() {
  return <Image className="cover__art" src={cover} alt="" fill sizes="(max-width: 720px) 100vw, 50vw" placeholder="blur" />;
}
