/**
 * VNPT API configuration — read from environment variables.
 *
 * The app falls back to mock mode when credentials are missing.
 */

export interface VnptConfig {
  apiBaseUrl: string;
  smartbotBaseUrl: string;
  accessToken: string;
  tokenId: string;
  tokenKey: string;
  macAddress: string;
  smartbotBotId: string;
  smartbotSenderId: string;
  isMock: boolean;
}

function env(...keys: string[]): string {
  if (typeof process === "undefined" || !process.env) return "";
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
}

let cached: VnptConfig | null = null;

export function getVnptConfig(): VnptConfig {
  if (cached) return cached;

  const accessToken = env("VNPT_ACCESS_TOKEN", "VNPT_OCR_TOKEN", "VNPT_IE_TOKEN", "SMARTBOT_TOKEN");
  const tokenId = env("VNPT_TOKEN_ID");
  const tokenKey = env("VNPT_TOKEN_KEY");
  const apiBaseUrl = env("VNPT_API_BASE_URL", "VNPT_OCR_URL", "VNPT_IE_URL", "SMARTBOT_URL", "https://api.idg.vnpt.vn");
  const smartbotBaseUrl = env("SMARTBOT_BASE_URL", "SMARTBOT_URL", "https://assistant-stream.vnpt.vn");

  cached = {
    apiBaseUrl,
    smartbotBaseUrl,
    accessToken,
    tokenId,
    tokenKey,
    macAddress: env("VNPT_MAC_ADDRESS", "TEST1"),
    smartbotBotId: env("SMARTBOT_BOT_ID"),
    smartbotSenderId: env("SMARTBOT_SENDER_ID", "phylab-student"),
    isMock: !accessToken || !tokenId || !tokenKey,
  };

  return cached;
}

export function vnptHeaders(extra?: Record<string, string>): Record<string, string> {
  const cfg = getVnptConfig();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.accessToken}`,
    "Token-id": cfg.tokenId,
    "Token-key": cfg.tokenKey,
    "mac-address": cfg.macAddress,
    ...extra,
  };
}
export function hasVnptCredentials() {
  return !getVnptConfig().isMock;
}
