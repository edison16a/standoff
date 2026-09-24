import Link from "next/link";
import { StandoffMark } from "@/components/ui/Brand";

export default function NotFound() {
  return (
    <main className="phone">
      <div className="phone__body">
        <section className="phone-hero">
          <span className="phone-hero__mark">
            <StandoffMark />
          </span>
          <h1 className="phone-title">Room not found</h1>
          <Link className="btn" href="/">
            Start page
          </Link>
        </section>
      </div>
    </main>
  );
}
