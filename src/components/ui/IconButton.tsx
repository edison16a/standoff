import type { ComponentPropsWithRef } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icon-paths";

interface IconButtonProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  icon: IconName;
  /** Read out by screen readers and shown as the hover tooltip. */
  label: string;
}

export function IconButton({ icon, label, className, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={`icon-btn ${className ?? ""}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
