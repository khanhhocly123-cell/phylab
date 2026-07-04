import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function testEkyc() {
  const env = readEnvLocal();
  const token = env.VNPT_EKYC_ACCESS_TOKEN;
  const tokenId = env.VNPT_EKYC_TOKEN_ID;
  const tokenKey = env.VNPT_EKYC_TOKEN_KEY;

  console.log("Testing VNPT eKYC credentials:");
  console.log("Token ID:", tokenId);
  console.log("Token length:", token?.length);

  try {
    const res = await fetch("https://api.idg.vnpt.vn/file-service/v1/addFile", {
      method: "POST",
      headers: {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        "Token-id": tokenId,
        "Token-key": tokenKey,
        "mac-address": "TEST1",
      },
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 500));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testEkyc();
