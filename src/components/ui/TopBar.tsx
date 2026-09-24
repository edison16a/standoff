import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { GitHubButton } from "./GitHubButton";
import { ThemeToggle } from "./ThemeToggle";

/** The bar across the top of every screen: name on the left, actions on the right. */
export function TopBar({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
  return (
    <header className="topbar">
      <Brand />
      <div className="topbar__actions">
        {children}
        <ThemeToggle />
        <GitHubButton compact={compact} />
      </div>
    </header>
  );
}
