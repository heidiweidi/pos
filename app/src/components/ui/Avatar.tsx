/**
 * Initials avatar.
 *
 * The source designs used stock portrait photographs; a POS shouldn't ship
 * pictures of people it doesn't have, so staff and members render as a tinted
 * monogram instead. Same footprint, no external image dependency.
 */
const TONES = [
  { bg: "#00855d", fg: "#f5fff7" },
  { bg: "#565e74", fg: "#ffffff" },
  { bg: "#825100", fg: "#fffbff" },
  { bg: "#213145", fg: "#eaf1ff" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toneOf(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export function Avatar({
  name,
  className = "w-8 h-8 rounded-full",
  textClassName = "text-label-sm font-label-sm",
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const tone = toneOf(name);
  return (
    <span
      aria-label={name}
      role="img"
      className={`shrink-0 inline-flex items-center justify-center select-none ${className} ${textClassName}`}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {initialsOf(name)}
    </span>
  );
}
