"use client";
import { useTheme } from "@/hooks/use-theme";
import { IconButton } from "./IconButton";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return <IconButton icon={dark ? "sun" : "moon"} label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme} />;
}
