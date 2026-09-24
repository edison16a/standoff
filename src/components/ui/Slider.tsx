import type { InputHTMLAttributes } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "min" | "max" | "onChange"> {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /**
   * Where the fill starts. Most sliders fill from the left, a centred one
   * (like footwork, where zero is standing still) fills out from the middle.
   */
  origin?: "start" | "centre";
}

/** A native range input with a flat accent fill drawn underneath it. */
export function Slider({ value, min, max, onChange, origin = "start", ...rest }: SliderProps) {
  const at = ((value - min) / (max - min)) * 100;
  const from = origin === "centre" ? 50 : 0;
  const left = Math.min(from, at);
  const width = Math.abs(at - from);
  return (
    <span className="slider">
      <span className="slider__track" aria-hidden="true">
        <span className="slider__fill" style={{ left: `${left}%`, width: `${width}%` }} />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        {...rest}
      />
    </span>
  );
}
