import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wranglerUrl = new URL("../../wrangler.jsonc", import.meta.url);

test("Wrangler preserves Dashboard variables without pinning Discord credentials", async () => {
  const config = await readFile(wranglerUrl, "utf8");

  assert.match(config, /"keep_vars"\s*:\s*true/);
  assert.doesNotMatch(config, /"DISCORD_PUBLIC_KEY"\s*:/);
  assert.doesNotMatch(config, /"DISCORD_ALLOWED_GUILD_ID"\s*:/);
  assert.doesNotMatch(config, /"DISCORD_SESSION_SECRET"\s*:/);
});
