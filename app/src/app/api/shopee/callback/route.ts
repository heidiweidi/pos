import { NextResponse, type NextRequest } from "next/server";

import { completeAuthorization } from "@/lib/shopee/service";

/**
 * Shopee redirects here after the manager authorises the app, with `code` and
 * `shop_id` (or `main_account_id`) in the query. Register this URL as the app's
 * redirect URL in the Shopee Open Platform console.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shopId = searchParams.get("shop_id") ?? searchParams.get("main_account_id");
  const back = (query: string) => NextResponse.redirect(new URL(`/manager/mode?${query}`, request.url));

  if (!code || !shopId) return back("shopee=error&reason=missing");

  try {
    await completeAuthorization(code, shopId);
    return back("shopee=connected");
  } catch (error) {
    console.error("[shopee] callback failed:", error);
    return back(`shopee=error&reason=${encodeURIComponent(error instanceof Error ? error.message : "failed")}`);
  }
}
