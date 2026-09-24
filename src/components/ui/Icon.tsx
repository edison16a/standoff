import { ICON_PATHS, type IconName } from "./icon-paths";

interface IconProps {
  name: IconName;
  size?: number;
}

/** One stroke icon in the current text colour. Decorative, so hidden from screen readers. */
export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
