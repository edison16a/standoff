"use client";
import type { Call, PhoneState } from "../../protocol";
import { usePhone } from "./session-context";

const WORDS: Record<Call, { title: string; sub: string }> = {
  throw: { title: "Throw", sub: "Hike it and pass or run" },
  kick: { title: "Kick", sub: "Field goal in range, else punt" },
  two: { title: "Go for 2", sub: "One play from the two" },
};

/**
 * The QB's call before each play: throw or kick, and after a touchdown
 * kick for one or go for two. Two big tiles, with the seconds left
 * before the call is made for them.
 */
export function ChoosePad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const choose = host.choose;
  if (!choose) return null;
  const convert = choose.options.includes("two");
  return (
    <div className="fb-choose">
      <p className="fb-choose__title">
        {convert ? "Touchdown! Kick for 1 or go for 2?" : `${host.down}. Your call`}
        <span className="fb-choose__clock">{choose.left}</span>
      </p>
      <div className="fb-choose__options">
        {choose.options.map((option) => {
          const words = option === "kick" && convert ? { title: "Kick for 1", sub: "An extra point from the 15" } : WORDS[option];
          return (
            <button key={option} type="button" className={`fb-choose__option fb-choose__option--${option}`} onClick={() => phone.call(option)}>
              <strong>{words.title}</strong>
              <span>{words.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
