/**
 * Flat vector produce illustrations for the PLU directory cards.
 *
 * The source designs pointed at remote stock photography; inline SVG keeps the
 * terminal fully self-contained (and therefore offline-capable) with no image
 * requests at all. Each drawing is an original simple shape study, sized to the
 * 96px card slot.
 */

type ArtProps = { className?: string };

const VB = "0 0 96 96";

function Leaf({ x = 48, y = 18 }: { x?: number; y?: number }) {
  return (
    <path
      d={`M${x} ${y} c8 -8 18 -9 24 -5 c-3 8 -12 13 -24 12 z`}
      fill="#00855d"
      opacity="0.9"
    />
  );
}

const ART: Record<string, (p: ArtProps) => React.JSX.Element> = {
  banana: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Bananas">
      <path
        d="M18 34c2 26 18 42 44 44 8 1 14-3 16-10 1-5-3-8-9-8-20-1-33-12-37-30-2-7-5-9-9-8-4 1-6 6-5 12z"
        fill="#ffd447"
      />
      <path
        d="M24 32c4 24 19 38 43 40 5 0 8-1 9-3-21-2-35-13-41-33-2-6-5-8-8-7-3 1-4 2-3 3z"
        fill="#f5b921"
      />
      <path d="M14 28l8-4 4 8-9 3z" fill="#6b5a22" />
      <path d="M74 70c4 0 7 2 7 5s-3 5-7 5-7-2-7-5 3-5 7-5z" fill="#e0a419" opacity="0.55" />
    </svg>
  ),

  "apple-gala": ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Gala apples">
      <path
        d="M48 26c12-6 30 2 30 24 0 20-13 34-22 34-4 0-6-2-8-2s-4 2-8 2c-9 0-22-14-22-34 0-22 18-30 30-24z"
        fill="#d8332f"
      />
      <path
        d="M48 26c-6-3-14-3-20 1 6 0 12 3 16 8 4 16 2 34-6 45 3 3 6 4 8 4 4 0 6-2 8-2 1 0 2 0 3 1-6-18-6-40-9-57z"
        fill="#f2c14a"
        opacity="0.55"
      />
      <rect x="46" y="12" width="4" height="16" rx="2" fill="#6b4a2a" />
      <Leaf x={50} y={16} />
    </svg>
  ),

  "apple-honeycrisp": ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Honeycrisp apples">
      <path
        d="M48 26c12-6 30 2 30 24 0 20-13 34-22 34-4 0-6-2-8-2s-4 2-8 2c-9 0-22-14-22-34 0-22 18-30 30-24z"
        fill="#e8b23c"
      />
      <path
        d="M60 24c11 3 18 12 18 26 0 20-13 34-22 34-3 0-5-1-7-2 10-8 16-22 16-38 0-8-2-15-5-20z"
        fill="#c8392f"
      />
      <rect x="46" y="12" width="4" height="16" rx="2" fill="#6b4a2a" />
      <Leaf x={50} y={16} />
    </svg>
  ),

  avocado: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Hass avocado">
      <path
        d="M48 14c14 0 24 14 24 32 0 22-11 36-24 36s-24-14-24-36c0-18 10-32 24-32z"
        fill="#3d5c2a"
      />
      <path
        d="M48 24c9 0 16 10 16 23 0 16-7 26-16 26s-16-10-16-26c0-13 7-23 16-23z"
        fill="#b9cf6a"
      />
      <ellipse cx="48" cy="56" rx="11" ry="13" fill="#8a5a2c" />
    </svg>
  ),

  tomato: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Roma tomatoes">
      <ellipse cx="48" cy="54" rx="22" ry="28" fill="#d33224" />
      <ellipse cx="41" cy="44" rx="7" ry="12" fill="#ec5a45" opacity="0.65" />
      <path
        d="M48 24c-8 0-14 2-16 5 4 1 6 3 7 5 2-3 5-4 9-4s7 1 9 4c1-2 3-4 7-5-2-3-8-5-16-5z"
        fill="#2f7a3e"
      />
      <rect x="46" y="16" width="4" height="10" rx="2" fill="#2f7a3e" />
    </svg>
  ),

  cucumber: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="English cucumber">
      <rect x="36" y="12" width="24" height="72" rx="12" fill="#2f6b33" />
      <rect x="41" y="18" width="8" height="60" rx="4" fill="#4a8c3f" opacity="0.75" />
      <circle cx="54" cy="30" r="2" fill="#1f4a24" opacity="0.6" />
      <circle cx="52" cy="46" r="2" fill="#1f4a24" opacity="0.6" />
      <circle cx="55" cy="62" r="2" fill="#1f4a24" opacity="0.6" />
    </svg>
  ),

  pepper: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Red bell pepper">
      <path
        d="M30 44c0-12 8-18 18-18s18 6 18 18v14c0 14-8 22-18 22s-18-8-18-22z"
        fill="#cf2f2f"
      />
      <path d="M38 46c0-10 4-16 10-17-8 6-10 16-8 30 1 9 4 15 8 19-8-2-10-12-10-22z" fill="#ea5a4a" opacity="0.6" />
      <rect x="45" y="14" width="6" height="14" rx="3" fill="#2f7a3e" />
      <path d="M40 26c5-3 11-3 16 0-5 3-11 3-16 0z" fill="#3e9150" />
    </svg>
  ),

  lemon: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Lemons">
      <ellipse cx="48" cy="50" rx="28" ry="20" fill="#f3d13a" />
      <ellipse cx="40" cy="44" rx="9" ry="6" fill="#fbe988" opacity="0.7" />
      <path d="M76 50c4 0 6 1 6 2s-2 2-6 2z" fill="#d9b524" />
      <path d="M20 50c-4 0-6 1-6 2s2 2 6 2z" fill="#d9b524" />
      <Leaf x={52} y={28} />
    </svg>
  ),

  lime: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Persian limes">
      <ellipse cx="48" cy="50" rx="26" ry="22" fill="#4f9a2f" />
      <ellipse cx="40" cy="42" rx="8" ry="6" fill="#84c45a" opacity="0.7" />
      <rect x="46" y="24" width="4" height="8" rx="2" fill="#2f6b33" />
      <Leaf x={50} y={24} />
    </svg>
  ),

  onion: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Yellow onions">
      <path d="M48 26c14 0 24 12 24 26s-11 24-24 24-24-10-24-24 10-26 24-26z" fill="#d9a441" />
      <path d="M48 26c-5 10-7 32 0 50" stroke="#b5832c" strokeWidth="2" fill="none" />
      <path d="M48 26c5 10 7 32 0 50" stroke="#b5832c" strokeWidth="2" fill="none" />
      <path d="M44 14c2 6 2 10 4 12 2-2 2-6 4-12-3 2-5 2-8 0z" fill="#9c7a3c" />
    </svg>
  ),

  broccoli: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Broccoli crowns">
      <rect x="42" y="52" width="12" height="30" rx="6" fill="#7fa85e" />
      <circle cx="34" cy="40" r="13" fill="#2f6b33" />
      <circle cx="62" cy="40" r="13" fill="#2f6b33" />
      <circle cx="48" cy="32" r="15" fill="#3b8340" />
      <circle cx="48" cy="48" r="14" fill="#357a3a" />
    </svg>
  ),

  "sweet-potato": ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Sweet potatoes">
      <path
        d="M20 58c-4-12 6-26 24-30 20-4 34 6 32 18-2 12-18 22-34 22-12 0-20-4-22-10z"
        fill="#b9552a"
      />
      <path d="M30 44c10-6 24-8 36-4-10-6-26-5-36 4z" fill="#d97a44" opacity="0.7" />
      <circle cx="40" cy="52" r="2" fill="#8c3d1d" opacity="0.6" />
      <circle cx="56" cy="48" r="2" fill="#8c3d1d" opacity="0.6" />
    </svg>
  ),

  cilantro: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Cilantro bunch">
      <path d="M46 46h4v36h-4z" fill="#5c8a3a" />
      <circle cx="36" cy="36" r="11" fill="#3b8340" />
      <circle cx="60" cy="36" r="11" fill="#3b8340" />
      <circle cx="48" cy="26" r="12" fill="#4a9a48" />
      <circle cx="48" cy="44" r="11" fill="#357a3a" />
      <rect x="40" y="74" width="16" height="6" rx="3" fill="#b5832c" />
    </svg>
  ),

  watermelon: ({ className }) => (
    <svg viewBox={VB} className={className} role="img" aria-label="Seedless watermelon">
      <ellipse cx="48" cy="50" rx="32" ry="26" fill="#2f6b33" />
      <path d="M22 42c8-4 44-4 52 0" stroke="#7fa85e" strokeWidth="4" fill="none" />
      <path d="M20 54c10 4 46 4 56 0" stroke="#7fa85e" strokeWidth="4" fill="none" />
      <ellipse cx="48" cy="50" rx="32" ry="26" fill="none" stroke="#255628" strokeWidth="2" />
    </svg>
  ),
};

/** Generic crate fallback for catalog items without a dedicated drawing. */
function Fallback({ className }: ArtProps) {
  return (
    <svg viewBox={VB} className={className} role="img" aria-label="Product">
      <rect x="20" y="38" width="56" height="38" rx="6" fill="#dce9ff" />
      <rect x="20" y="38" width="56" height="10" rx="4" fill="#bccac0" />
      <circle cx="48" cy="30" r="12" fill="#00855d" opacity="0.25" />
    </svg>
  );
}

export function ProduceArt({ art, className = "w-24 h-24" }: { art?: string; className?: string }) {
  const Component = (art && ART[art]) || Fallback;
  return <Component className={className} />;
}
