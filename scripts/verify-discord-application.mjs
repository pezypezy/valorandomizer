const token = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim() || "1148945042510196806";

if (!token) {
  console.error("DISCORD_BOT_TOKEN is not configured.");
  process.exit(1);
}

async function discordGet(path) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "Valorandomizer-Integration-Test/1.0",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discord API ${path} returned ${response.status}: ${text.slice(0, 500)}`);
  }

  return JSON.parse(text);
}

const application = await discordGet("/oauth2/applications/@me");
if (typeof application.id !== "string" || !/^\d{17,20}$/.test(application.id)) {
  throw new Error("Discord application response did not contain a valid application ID.");
}
if (typeof application.verify_key !== "string" || !/^[0-9a-f]{64}$/i.test(application.verify_key)) {
  throw new Error("Discord application response did not contain a valid 32-byte verify key.");
}

const commands = await discordGet(`/applications/${application.id}/guilds/${guildId}/commands`);
if (!Array.isArray(commands)) {
  throw new Error("Discord guild commands response was not an array.");
}

const commandNames = commands.map((command) => command?.name).filter((name) => typeof name === "string");
for (const required of ["valorandom", "valopropick", "aipick"]) {
  if (!commandNames.includes(required)) {
    throw new Error(`Required Discord command /${required} is not registered in guild ${guildId}.`);
  }
}

console.log(`DISCORD_APPLICATION_ID=${application.id}`);
console.log(`DISCORD_PUBLIC_KEY=${application.verify_key.toLowerCase()}`);
console.log(`DISCORD_GUILD_ID=${guildId}`);
console.log(`REGISTERED_COMMANDS=${commandNames.sort().join(",")}`);
console.log("LIVE_DISCORD_INTEGRATION_CHECK=PASS");
