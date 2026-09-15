import type { CSSProperties } from "react";

/**
 * Material Symbols Outlined glyph.
 *
 * The design system leans on ligature icon names throughout ("scale", "payments",
 * "barcode_scanner"), so this keeps the markup identical to the source screens.
 */
export function Icon({
  name,
  className = "",
  fill = false,
  style,
}: {
  name: string;
  className?: string;
  /** Switch to the filled variant of the glyph. */
  fill?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={fill ? { ...style, fontVariationSettings: '"FILL" 1' } : style}
    >
      {name}
    </span>
  );
}
