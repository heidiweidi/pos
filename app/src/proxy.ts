import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16's replacement for the old `middleware.ts` convention.
 *
 * Phase 1 this is a pass-through; once the Supabase env vars are set it starts
 * refreshing the auth cookie on every request so server components see a live
 * session.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, the service worker and the manifest —
     * those must never carry an auth round trip.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|offline).*)",
  ],
};
