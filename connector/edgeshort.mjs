// macOS / Node.js 20+. Standalone, no npm install required.
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { hostname } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const service = "EdgeShort MCP";
const keyShape = /^esk_[0-9a-f]{16}\.[A-Za-z0-9_-]{43}$/;

function checkedOrigin(input) {
  const u = new URL(input);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (
    (u.protocol !== "https:" && !(u.protocol === "http:" && loopback)) ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  ) {
    throw Error("Use an HTTPS platform origin, or HTTP on loopback.");
  }
  return u.origin;
}

function vault(origin, keychain) {
  if (process.platform !== "darwin") throw Error("This connector uses macOS Keychain.");
  const args = keychain ? [resolve(keychain)] : [];
  if (args.some((v) => !/^[/ A-Za-z0-9_.-]+$/.test(v))) throw Error("Invalid keychain path.");
  function read() {
    try {
      const key = execFileSync(
        "/usr/bin/security",
        ["find-generic-password", "-s", service, "-a", origin, "-w", ...args],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      if (keyShape.test(key)) return key;
    } catch {
      /* Do not expose subprocess output. */
    }
    throw Error("Cannot read the device credential. Run pair or unlock the keychain.");
  }
  return {
    read,
    save(key) {
      if (!keyShape.test(key)) throw Error("Invalid server credential.");
      // Interactive security reads the command from stdin. The key is never an argv item.
      const line = ["add-generic-password", "-U", "-s", service, "-a", origin, "-w", key, ...args]
        .map((s) => '"' + s + '"')
        .join(" ");
      try {
        execFileSync("/usr/bin/security", ["-i"], {
          input: line + "\n",
          stdio: ["pipe", "ignore", "ignore"],
        });
      } catch {
        throw Error("Could not save the device credential to Keychain.");
      }
      if (read() !== key) throw Error("Keychain verification failed.");
    },
  };
}

async function post(url, body, headers = {}) {
  return fetch(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export async function pair(input, name, save, display) {
  const origin = checkedOrigin(input);
  const start = await post(origin + "/api/device/start", { clientName: name });
  if (!start.ok) throw Error("Pairing unavailable (HTTP " + start.status + ").");
  const grant = await start.json();
  if (typeof grant.device_code !== "string" || !/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(grant.user_code))
    throw Error("Invalid pairing response.");
  const until = Date.now() + Math.min(300, grant.expires_in) * 1000;
  let seconds = Math.max(5, Number(grant.interval) || 5);
  display({ code: grant.user_code, url: origin + "/admin/?connect=device" });
  while (Date.now() < until) {
    await delay(seconds * 1000);
    if (Date.now() >= until) break;
    const r = await post(origin + "/api/device/exchange", { device_code: grant.device_code });
    const result = await r.json();
    if (r.ok) {
      if (!keyShape.test(result.access_token)) throw Error("Invalid pairing response.");
      try {
        await save(result.access_token);
      } catch {
        throw Error("Credential storage failed. Disconnect this device in EdgeShort and pair again.");
      }
      return;
    }
    if (result.error === "authorization_pending") continue;
    if (result.error === "slow_down") {
      seconds += 5;
      continue;
    }
    if (result.error === "access_denied") throw Error("Pairing denied.");
    throw Error("Pairing expired or already consumed. Start a new pairing.");
  }
  throw Error("Pairing expired.");
}

// Bridge MCP's newline-delimited stdio transport to EdgeShort's stateless HTTP endpoint.
export async function serve(input, key, stdin = process.stdin, stdout = process.stdout) {
  const endpoint = checkedOrigin(input) + "/api/mcp";
  let version;
  for await (const line of createInterface({ input: stdin, crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    let rpc;
    try {
      rpc = JSON.parse(line);
      const headers = { Authorization: "Bearer " + key };
      if (version) headers["MCP-Protocol-Version"] = version;
      const r = await post(endpoint, rpc, headers);
      if (r.status === 202) continue;
      if (!r.ok) throw Error("EdgeShort returned HTTP " + r.status);
      const reply = await r.json();
      if (reply.jsonrpc !== "2.0" || reply.id !== rpc.id) throw Error("Invalid MCP response");
      if (rpc.method === "initialize") version = reply.result?.protocolVersion;
      stdout.write(JSON.stringify(reply) + "\n");
    } catch (error) {
      if (!rpc || Object.hasOwn(rpc, "id"))
        stdout.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: rpc?.id ?? null,
            error: {
              code: -32000,
              message: error.message.startsWith("EdgeShort returned HTTP ")
                ? error.message
                : "EdgeShort connection failed",
            },
          }) + "\n",
        );
    }
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const origin = checkedOrigin(option("--origin") || "https://vyu.cc");
  if (!["pair", "serve"].includes(command))
    throw Error("Usage: node edgeshort.mjs pair|serve [--origin URL] [--name DEVICE]");
  const keys = vault(origin, option("--keychain"));
  if (command === "serve") return serve(origin, keys.read());
  await pair(
    origin,
    option("--name") || ("Codex · " + hostname()).slice(0, 64),
    keys.save,
    ({ code, url }) => {
      console.log("EdgeShort 配对码（5 分钟有效）: " + code + "\n在 " + url + " 核对并允许连接。");
    },
  );
  console.log("设备凭据已保存到 macOS 钥匙串。");
}
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || ""))
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
