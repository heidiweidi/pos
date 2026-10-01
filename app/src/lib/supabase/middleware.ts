import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { CONNECTION_COOKIE, MODE_COOKIE, resolveRuntime } from "../mode";

/**
 * Refreshes the Supabase auth cookie on every request.
 *
 * Phase 1 is a no-op: without Supabase env vars configured the request passes
 * straight through, so the dummy auth provider stays in charge. Once the vars
 * are set this starts keeping server-rendered pages in sync with the session.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Demo mode never talks to Supabase, so there is no session to refresh.
  const { mode, connection } = resolveRuntime(
    request.cookies.get(MODE_COOKIE)?.value,
    request.cookies.get(CONNECTION_COOKIE)?.value,
  );
  if (mode !== "actual" || !connection) return response;
  const { url, anonKey: key } = connection;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching getUser() is what performs the refresh; do not remove it.
    await supabase.auth.getUser();
  } catch (error) {
    // Never let a misconfigured or unreachable Supabase project take the whole
    // terminal down — fall back to passing the request through untouched.
    console.error("[supabase/middleware] updateSession failed, passing through:", error);
  }

  return response;
}
