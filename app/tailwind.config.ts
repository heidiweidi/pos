import type { Config } from "tailwindcss";

/**
 * Restohub POS design tokens.
 *
 * Ported 1:1 from pos/design/DESIGN.md so that every utility class used in the
 * Stitch HTML exports (`font-label-md`, `text-numeric-hero`, `p-space-md`,
 * `bg-surface-container-lowest`, ...) resolves to the same value here.
 *
 * Note on radii: DESIGN.md's frontmatter is the source of truth (sm .125 /
 * DEFAULT .25 / md .375 / lg .5 / xl .75 / full 9999px). It matches the written
 * spec — "0.25rem/4px base to 0.5rem/8px container radius", "full" pills for
 * status dots and avatars — whereas the generated HTML shipped a shifted scale.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#3d4a42",
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        outline: "#6d7a72",
        "outline-variant": "#bccac0",
        "surface-tint": "#006c4a",
        primary: "#006948",
        "on-primary": "#ffffff",
        "primary-container": "#00855d",
        "on-primary-container": "#f5fff7",
        "inverse-primary": "#68dba9",
        secondary: "#565e74",
        "on-secondary": "#ffffff",
        "secondary-container": "#dae2fd",
        "on-secondary-container": "#5c647a",
        tertiary: "#825100",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#a36700",
        "on-tertiary-container": "#fffbff",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "primary-fixed": "#85f8c4",
        "primary-fixed-dim": "#68dba9",
        "on-primary-fixed": "#002114",
        "on-primary-fixed-variant": "#005137",
        "secondary-fixed": "#dae2fd",
        "secondary-fixed-dim": "#bec6e0",
        "on-secondary-fixed": "#131b2e",
        "on-secondary-fixed-variant": "#3f465c",
        "tertiary-fixed": "#ffddb8",
        "tertiary-fixed-dim": "#ffb95f",
        "on-tertiary-fixed": "#2a1700",
        "on-tertiary-fixed-variant": "#653e00",
        background: "#f8f9ff",
        "on-background": "#0b1c30",
        "surface-variant": "#d3e4fe",
      },
      fontFamily: {
        "headline-xl": ["DM Sans", "system-ui", "sans-serif"],
        "headline-lg": ["DM Sans", "system-ui", "sans-serif"],
        "headline-md": ["DM Sans", "system-ui", "sans-serif"],
        "headline-sm": ["DM Sans", "system-ui", "sans-serif"],
        "numeric-hero": ["DM Sans", "system-ui", "sans-serif"],
        "body-xl": ["Inter", "system-ui", "sans-serif"],
        "body-lg": ["Inter", "system-ui", "sans-serif"],
        "body-md": ["Inter", "system-ui", "sans-serif"],
        "body-sm": ["Inter", "system-ui", "sans-serif"],
        "label-lg": ["Inter", "system-ui", "sans-serif"],
        "label-md": ["Inter", "system-ui", "sans-serif"],
        "label-sm": ["Inter", "system-ui", "sans-serif"],
        "numeric-lg": ["Inter", "system-ui", "sans-serif"],
        "numeric-md": ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-xl": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["22px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-xl": ["20px", { lineHeight: "28px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-lg": ["15px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
        "label-md": ["13px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.03em", fontWeight: "600" }],
        "numeric-hero": ["40px", { lineHeight: "44px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "numeric-lg": ["24px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "numeric-md": ["16px", { lineHeight: "20px", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "0.75rem",
        "gutter-lg": "1rem",
        margin: "0.75rem",
        "margin-lg": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "space-lg": "1rem",
        "space-xl": "1.5rem",
      },
      boxShadow: {
        // "Tactile lip" from the spec — crisp offsets, no atmospheric mud.
        tile: "0 1px 2px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(15, 23, 42, 0.05)",
        modal: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
      },
      keyframes: {
        "scan-in": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "scan-in": "scan-in 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
