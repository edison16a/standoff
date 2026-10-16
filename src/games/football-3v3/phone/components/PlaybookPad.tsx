"use client";
import type { PhoneState } from "../../protocol";
import { PlayDiagram } from "./PlayDiagram";
import { usePhone } from "./session-context";

/**
 * The page of plays after Throw or Run: two plays drawn for this QB's
 * own runners, each a field with every runner's route in his colour and
 * number, as the big screen marks them. A tap calls the play; Refresh
 * deals two more; Back returns to Throw, Run and Kick. Only computer
 * runners run what the card draws; a hollow number is a person's
 * runner, who goes where he likes.
 */
export function PlaybookPad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const book = host.book;
  if (!book) return null;
  const people = book.plays[0]?.runners.some((r) => r.free) ?? false;
  return (
    <div className="fb-book">
      <div className="fb-book__bar">
        <button type="button" className="fb-book__btn" onClick={() => phone.playbook("back")}>
          Back
        </button>
        <p className="fb-book__title">
          {book.call === "run" ? "Pick a run" : "Pick a pass"}
          {people && <span className="fb-book__hint">Hollow number: a player runs free</span>}
        </p>
        <span className="fb-book__clock">{book.left}</span>
        <button type="button" className="fb-book__btn fb-book__btn--new" onClick={() => phone.playbook("redeal")}>
          Refresh
        </button>
      </div>
      <div className="fb-book__grid">
        {book.plays.map((play, i) => (
          <button key={`${i}:${play.name}`} type="button" className="fb-play" aria-label={play.name} onClick={() => phone.playbook(i)}>
            <PlayDiagram book={book} play={play} />
            <span className="fb-play__name">{play.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
