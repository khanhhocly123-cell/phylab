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

async function testTts() {
  const env = readEnvLocal();
  const token = env.VNPT_VOICE_ACCESS_TOKEN;
  const tokenId = env.VNPT_VOICE_TOKEN_ID;
  const tokenKey = env.VNPT_VOICE_TOKEN_KEY;

  console.log("Testing VNPT SmartVoice (TTS) credentials:");
  console.log("Token ID:", tokenId);
  console.log("Token length:", token?.length);

  try {
    const res = await fetch("https://api.idg.vnpt.vn/tts-service/v2/grpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        "Token-id": tokenId,
        "Token-key": tokenKey,
      },
      body: JSON.stringify({
        text: "Xin chào học sinh Phylab",
        text_split: true,
        region: "female_north",
        audio_format: "mp3",
        sample_rate: 22050,
        speed: 1.0,
      }),
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testTts();
