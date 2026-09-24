"use client";
import type { ReactNode } from "react";
import "../kit.css";

interface StepShellProps {
  /** Every step's short name, in order, like Calibrate, Weapon, Ready. */
  steps: readonly string[];
  /** Index of the step on screen. */
  current: number;
  title: string;
  children: ReactNode;
  /** The buttons that move on, pinned under the content. */
  footer?: ReactNode;
}

/**
 * The frame every game's phone setup uses, so each step gets its own
 * page and players always see where they are: the name comes first on
 * the platform's screen, then calibration, then the game's choices, then
 * ready.
 */
export function StepShell({ steps, current, title, children, footer }: StepShellProps) {
  return (
    <section className="kit-steps">
      <ol className="kit-steps__track" aria-label="Setup steps">
        {steps.map((step, index) => (
          <li
            key={step}
            className={`kit-steps__step ${index === current ? "kit-steps__step--current" : ""} ${index < current ? "kit-steps__step--done" : ""}`}
            aria-current={index === current ? "step" : undefined}
          >
            <span className="kit-steps__number">{index + 1}</span>
            <span className="kit-steps__name">{step}</span>
          </li>
        ))}
      </ol>
      <h2 className="kit-steps__title">{title}</h2>
      <div className="kit-steps__body">{children}</div>
      {footer && <div className="kit-steps__footer">{footer}</div>}
    </section>
  );
}
