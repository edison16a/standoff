import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";

export default function NotFound() {
  return (
    <div className="host-page">
      <TopBar />
      <main className="phone__body">
        <section className="phone-card phone-card--center">
          <h1 className="phone-title">Nothing here</h1>
          <p className="muted">That room code does not look right. Scan the QR code on the host screen again.</p>
          <Link className="btn" href="/">
            Go to the start page
          </Link>
        </section>
      </main>
    </div>
  );
}
