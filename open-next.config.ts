import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Incremental cache / queue / tag cache can be added here later
  // (e.g. R2 + D1) when Phase 2 introduces persistence.
});
