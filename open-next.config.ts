import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Application data uses the D1 binding configured in wrangler.jsonc.
  // OpenNext cache and queue bindings can be added independently when needed.
});
