import { cookies } from "next/headers";

import { CONNECTION_COOKIE, MODE_COOKIE, resolveRuntime, type Runtime } from "./mode";

/** The terminal's mode and connection for this request. Server-only. */
export async function getRuntime(): Promise<Runtime> {
  const store = await cookies();
  return resolveRuntime(store.get(MODE_COOKIE)?.value, store.get(CONNECTION_COOKIE)?.value);
}
