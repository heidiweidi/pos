import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth cookie on every request.
 *
 * Phase 1 is a no-op: without Supabase env vars configured the request passes
 * straight through, so the dummy auth provider stays in charge. Once the vars
 * are set this starts keeping server-rendered pages in sync with the session.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = NextResponse.next({ request });

  if (!url || !key) return response;

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
