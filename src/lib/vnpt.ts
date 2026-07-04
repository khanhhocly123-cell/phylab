import { getVnptConfig, vnptHeaders } from "./vnpt-config";

export type OCRResult = {
  text: string;
  confidence?: number;
  raw?: unknown;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  message: string;
  raw?: unknown;
};

function buildUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function readJsonSafe(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function uploadFile(file: File, title = file.name, description = "") {
  const cfg = getVnptConfig();
  if (cfg.isMock) {
    return { hash: `mock-${Date.now()}`, raw: { mock: true } };
  }

  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("description", description);

  const res = await fetch(buildUrl(cfg.apiBaseUrl, "/file-service/v1/addFile"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Token-id": cfg.tokenId,
      "Token-key": cfg.tokenKey,
      "mac-address": cfg.macAddress,
    },
    body: form,
  });

  if (!res.ok) throw new Error(`uploadFile failed: ${res.status}`);
  const data = await readJsonSafe(res);
  return { hash: data?.hash || data?.object?.hash || "", raw: data };
}

export async function ocrSmartReader(fileHash: string): Promise<OCRResult> {
  const cfg = getVnptConfig();
  if (cfg.isMock) {
    return { text: "Mã mô phỏng OCR: Bài 6 / Bài 11", confidence: 0.92, raw: { mock: true } };
  }

  const res = await fetch(buildUrl(cfg.apiBaseUrl, "/rpa-service/aidigdoc/v1/ocr/scan"), {
    method: "POST",
    headers: vnptHeaders({ "mac-address": "EGOV-DIGDOC-WEB-API" }),
    body: JSON.stringify({ file_hash: fileHash, details: true, client_session: "phylab" }),
  });

  if (!res.ok) throw new Error(`ocrSmartReader failed: ${res.status}`);
  const data = await readJsonSafe(res);
  return { text: typeof data === "string" ? data : JSON.stringify(data), raw: data };
}

export async function smartBotChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const cfg = getVnptConfig();
  if (cfg.isMock) {
    return { message: messages[messages.length - 1]?.content ? `Gợi ý: ${messages[messages.length - 1].content}` : "Chào bạn!" };
  }

  const res = await fetch(buildUrl(cfg.smartbotBaseUrl, "/assistant-service/v1/standard/sb"), {
    method: "POST",
    headers: vnptHeaders(),
    body: JSON.stringify({
      bot_id: cfg.smartbotBotId,
      sender_id: cfg.smartbotSenderId,
      text: messages[messages.length - 1]?.content || "",
      input_channel: "web",
      session_id: `phylab-${Date.now()}`,
    }),
  });

  if (!res.ok) throw new Error(`smartBotChat failed: ${res.status}`);
  const data = await readJsonSafe(res);
  return { message: data?.message || data?.object?.message || "", raw: data };
}
