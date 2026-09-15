import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Incremental cache can be enabled later with a KV or R2 binding, e.g.
  //   incrementalCache: r2IncrementalCache,
  // For a POS terminal every page is dynamic, so the default (no cache) is right.
});
