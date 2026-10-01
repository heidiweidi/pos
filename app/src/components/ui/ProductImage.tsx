/**
 * A product photo, or an empty box when the product has none — no placeholder
 * icon, so a missing photo reads as "not set" rather than as a wrong picture.
 */
export function ProductImage({ src, alt = "", className = "" }: { src?: string; alt?: string; className?: string }) {
  if (!src) {
    return <span aria-hidden="true" className={`block rounded bg-surface-container-low ${className}`} />;
  }
  return (
    // Plain <img>: photos are tiny (≤100 KB) and served from Supabase Storage's CDN,
    // so Next's image optimiser (not enabled on this Worker) would add nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" className={`block rounded object-cover ${className}`} />
  );
}
