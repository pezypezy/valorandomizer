import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

const MINIMUM_PASSWORD_LENGTH = 12;
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const WRANGLER_CONFIG = new URL("../wrangler.jsonc", import.meta.url);
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const flags = new Set(process.argv.slice(2));
const skipSecrets = flags.has("--skip-secrets");
const deployAfterSetup = flags.has("--deploy");

function printHelp() {
  console.log(`Valorandomizer ranked-meta Cloudflare setup

Usage:
  pnpm meta:setup
  pnpm meta:setup -- --skip-secrets
  pnpm meta:setup -- --deploy

Options:
  --skip-secrets  Create/bind D1 and apply migrations without setting Worker secrets.
  --deploy        Run the project deploy command after setup.
  --help          Show this help without contacting Cloudflare.

Environment variables:
  META_BETA_PASSWORD       Optional non-interactive shared password (12+ characters).
  META_BETA_AUTH_SECRET    Optional session-signing secret; generated when omitted.
  RIOT_API_KEY             Optional Riot production key; live collection stays off when omitted.
  RIOT_MATCH_DETAIL_BUDGET Optional per-run detail budget (1-250); configure as a Worker variable.
  CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID may be used instead of wrangler login.
`);
}

function fail(message) {
  console.error(`\n[ranked-meta setup] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: options.input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    input: options.input,
    encoding: "utf8",
    shell: false,
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`Command failed with exit code ${result.status ?? "unknown"}.`);
}

function runWrangler(args, options) {
  run(packageManager, ["exec", "wrangler", ...args], options);
}

function readActiveWranglerConfig() {
  const source = readFileSync(WRANGLER_CONFIG, "utf8");
  const withoutFullLineComments = source
    .split(/\r?\n/u)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  try {
    return JSON.parse(withoutFullLineComments);
  } catch (error) {
    fail(`Could not parse wrangler.jsonc: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hasD1Binding() {
  const config = readActiveWranglerConfig();
  return Array.isArray(config.d1_databases)
    && config.d1_databases.some((database) => database?.binding === "DB");
}

async function readHidden(prompt) {
  const fromEnvironment = process.env.META_BETA_PASSWORD?.trim();
  if (fromEnvironment) return fromEnvironment;
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    fail("Set META_BETA_PASSWORD in the environment when running non-interactively.");
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    const restore = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    const finish = () => {
      restore();
      resolve(value.trim());
    };

    const cancel = () => {
      restore();
      reject(new Error("Setup cancelled."));
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cancel();
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          process.stdout.write("•");
        }
      }
    };

    process.stdin.on("data", onData);
  });
}

function putSecret(name, value) {
  if (!value?.trim()) fail(`${name} is empty.`);
  runWrangler(["secret", "put", name], { input: `${value.trim()}\n` });
}

async function main() {
  if (flags.has("--help") || flags.has("-h")) {
    printHelp();
    return;
  }

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isFinite(nodeMajor) || nodeMajor < 22) {
    fail(`Node.js 22 or newer is required. Current version: ${process.version}`);
  }

  console.log("Valorandomizer ranked-meta Cloudflare setup");
  console.log("This creates/binds D1, applies migrations, and optionally configures Worker secrets.");
  console.log("Wrangler authentication or CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID is required.");

  runWrangler(["whoami"]);

  if (hasD1Binding()) {
    console.log("\nD1 binding DB is already present in wrangler.jsonc; skipping database creation.");
  } else {
    runWrangler([
      "d1",
      "create",
      "valorandomizer",
      "--binding",
      "DB",
      "--location",
      "apac",
      "--update-config",
    ]);
    if (!hasD1Binding()) fail("Wrangler completed, but the DB binding was not found in wrangler.jsonc.");
    console.log("\nD1 binding added to wrangler.jsonc. Review and commit this generated database ID.");
  }

  runWrangler(["d1", "migrations", "apply", "valorandomizer", "--remote"]);

  if (!skipSecrets) {
    console.log("\nCloudflare secret updates create a new Worker version. Local code is deployed only when --deploy is supplied.");
    const password = await readHidden("Shared beta password (12+ characters): ");
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      fail(`The shared password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
    }

    const authSecret = process.env.META_BETA_AUTH_SECRET?.trim()
      || randomBytes(48).toString("base64url");
    putSecret("META_BETA_PASSWORD", password);
    putSecret("META_BETA_AUTH_SECRET", authSecret);

    const riotApiKey = process.env.RIOT_API_KEY?.trim();
    if (riotApiKey) {
      putSecret("RIOT_API_KEY", riotApiKey);
    } else {
      console.log("\nRIOT_API_KEY was not set. The private beta can run, but live global Riot collection remains disabled.");
    }
  } else {
    console.log("\nSkipping Worker secrets because --skip-secrets was supplied.");
  }

  if (deployAfterSetup) {
    run(packageManager, ["deploy"]);
  } else {
    console.log("\nSetup completed without deploying local code.");
    console.log("Review `git diff -- wrangler.jsonc`, commit the D1 ID, then run `pnpm deploy`.");
  }

  console.log("Participant URL after deployment: https://valo-randomizer.com/ja/ai-composition");
  console.log("Direct operator login: https://valo-randomizer.com/ja/meta-beta");
  console.log("Live global collection requires Riot production access and the RIOT_API_KEY secret.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
