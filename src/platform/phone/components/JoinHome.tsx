"use client";
import { useRouter } from "next/navigation";
import { StandoffMark } from "@/components/ui/Brand";
import { chooseHostHere } from "../device";
import { JoinForm } from "./JoinForm";
import { PhoneBar } from "./PhoneBar";

/**
 * A phone's home: the join screen. Phones are controllers, so opening the
 * site on one, or tapping the logo, lands here rather than on the big
 * screen menu. A small link still lets a tablet be the big screen.
 */
export function JoinHome({ onHostHere }: { onHostHere?: () => void }) {
  const router = useRouter();
  return (
    <div className="phone">
      <PhoneBar />
      <main className="phone__body">
        <section className="phone-hero phone-hero--join">
          <span className="phone-hero__mark">
            <StandoffMark />
          </span>
          <h1 className="phone-title">Join a game</h1>
          <p className="muted phone-hero__lead">Type the code on the big screen, or scan its QR code.</p>
          <JoinForm onCode={(code) => router.push(`/join/${code}`)} />
          <button
            type="button"
            className="btn btn--ghost phone-hero__aside"
            onClick={() => {
              chooseHostHere();
              // At the site home the page swaps in place. From /join it goes home.
              if (onHostHere) onHostHere();
              else router.push("/");
            }}
          >
            Use this screen as the big screen
          </button>
        </section>
      </main>
    </div>
  );
}
