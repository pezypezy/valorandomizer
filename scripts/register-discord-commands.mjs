const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!applicationId || !botToken || !guildId) {
  console.error("DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and DISCORD_GUILD_ID are required.");
  process.exit(1);
}

const MAX_SNOWFLAKE = 9223372036854775807n;
function isValidSnowflake(value) {
  if (!/^\d{17,19}$/.test(value)) return false;
  try {
    const parsed = BigInt(value);
    return parsed > 0n && parsed <= MAX_SNOWFLAKE;
  } catch {
    return false;
  }
}

if (!isValidSnowflake(applicationId)) {
  console.error(
    "Invalid Discord Application ID. Copy it directly from Developer Portal > General Information > Application ID.",
  );
  process.exit(1);
}

if (!isValidSnowflake(guildId)) {
  console.error("Invalid Discord Guild ID. Copy the server ID again with Discord developer mode enabled.");
  process.exit(1);
}

const commands = [
  {
    name: "valorandom",
    description: "Open Valorandomizer and post the result to this channel",
    description_localizations: {
      ja: "Valorandomizerを開き、結果をこのチャンネルへ投稿します",
      ko: "Valorandomizer를 열고 결과를 이 채널에 게시합니다",
    },
    type: 1,
  },
  {
    name: "valopropick",
    description: "Draw a pro composition on Valorandomizer and post it here",
    description_localizations: {
      ja: "Valorandomizerでプロ構成を抽選し、このチャンネルへ投稿します",
      ko: "Valorandomizer에서 프로 조합을 추첨하고 이 채널에 게시합니다",
    },
    type: 1,
  },
];

const endpoint = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    authorization: `Bot ${botToken}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(commands),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Discord command registration failed (${response.status}): ${body}`);
  process.exit(1);
}

const registered = JSON.parse(body);
console.log(`Registered ${registered.length} guild commands in ${guildId}:`);
for (const command of registered) console.log(`- /${command.name} (${command.id})`);
