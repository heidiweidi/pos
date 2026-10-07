"use client";

import { useState } from "react";

/**
 * A product photo, or an empty box when the product has none — no placeholder
 * icon, so a missing photo reads as "not set" rather than as a wrong picture.
 * A remote photo that fails to load (e.g. removed from Shopee) falls back to the
 * same empty box instead of a broken-image icon.
 */
export function ProductImage({ src, alt = "", className = "" }: { src?: string; alt?: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <span aria-hidden="true" className={`block rounded bg-surface-container-low ${className}`} />;
  }
  return (
    // Plain <img>: photos are tiny (<=100 KB) or served from Shopee's CDN, so Next's
    // image optimiser (not enabled on this Worker) would add nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={`block rounded object-cover ${className}`}
    />
  );
}
