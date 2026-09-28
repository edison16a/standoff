import type { ReactNode } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Where the logo takes a phone: its own home, the join screen, never the big screen menu. */
export const PHONE_HOME = "/join";

/** The header on every phone screen. `children` sits before the theme and GitHub buttons. */
export function PhoneBar({ children }: { children?: ReactNode }) {
  return (
    <header className="phone__bar">
      <HomeLink href={PHONE_HOME} />
      <div className="phone__bar-actions">
        {children}
        <ThemeToggle />
        <GitHubButton compact />
      </div>
    </header>
  );
}
