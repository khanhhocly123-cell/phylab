/**
 * vnpt-smartbot.ts — Client SERVER-SIDE gọi VNPT SmartBot (dùng làm LLM).
 *
 * Dùng endpoint STANDARD (một JSON, không SSE) cho ổn định:
 *   POST https://api.idg.vnpt.vn/assistant-service/v1/standard/sb
 * Steering bot qua settings.system_prompt / advance_prompt (cần bật "tri thức nâng
 * cao" trên bot). Trả lời nằm ở object.sb.card_data[].text.
 *
 * Tham chiếu: API_document/API_CHEATSHEET.md mục 2, và tài liệu tích hợp Smartbot.
 */

export interface SmartBotButton {
  title: string;
  payload: string;
  type: string;
}

export interface SmartBotResult {
  ok: boolean;
  text: string;
  buttons: SmartBotButton[];
  raw?: unknown;
  error?: string;
  /** Chiến lược đã thành công: "settings" | "embedded" (chỉ có ở askSmartBotResilient). */
  strategy?: string;
}

/**
 * SmartBot đôi khi trả HTTP 200 kèm câu xin lỗi mặc định ("Xin lỗi tôi chưa có đủ
 * thông tin…") — về mặt API là "ok" nhưng với người dùng là câu trả lời rỗng.
 * Nguyên nhân phổ biến (theo tài liệu tích hợp): settings.system_prompt/advance_prompt
 * chỉ có tác dụng khi bot BẬT "tri thức nâng cao"; nếu chưa bật, bot chỉ thấy `text`
 * ngắn không khớp intent nào → trả câu xin lỗi.
 */
export function isNonAnswer(text: string): boolean {
  const t = text.toLowerCase();
  return (
    (t.includes("xin lỗi") && (t.includes("chưa có đủ thông tin") || t.includes("không có thông tin") || t.includes("chưa hiểu"))) ||
    t.includes("vui lòng đặt câu hỏi ngắn gọn") ||
    t.includes("tôi chưa được huấn luyện") ||
    t.includes("nằm ngoài phạm vi")
  );
}

const STANDARD_URL = "https://api.idg.vnpt.vn/assistant-service/v1/standard/sb";

export interface SmartBotConfig {
  token: string;
  tokenId: string;
  tokenKey: string;
  botId: string;
}

/** Đọc cấu hình SmartBot từ env; isConfigured=false nếu thiếu (kể cả bot_id placeholder). */
export function getSmartBotConfig(): { cfg: SmartBotConfig; isConfigured: boolean } {
  const token = process.env.VNPT_BOT_ACCESS_TOKEN || "";
  const tokenId = process.env.VNPT_BOT_TOKEN_ID || "";
  const tokenKey = process.env.VNPT_BOT_TOKEN_KEY || "";
  const botId = process.env.SMARTBOT_BOT_ID || "";
  // bot_id phải là UUID thật do platform cấp — placeholder "phylab-*" coi như chưa cấu hình.
  const looksReal = !!botId && !/^phylab[-_]/i.test(botId) && botId.length >= 8;
  const isConfigured = !!(token && tokenId && tokenKey && looksReal);
  return { cfg: { token, tokenId, tokenKey, botId }, isConfigured };
}

function bearer(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

/** Gom mọi card text/quickreply thành một chuỗi trả lời + thu nút bấm. */
function parseCardData(data: unknown): { text: string; buttons: SmartBotButton[] } {
  const texts: string[] = [];
  const buttons: SmartBotButton[] = [];
  const obj = data as {
    object?: { sb?: { card_data?: Array<Record<string, unknown>> } };
  };
  const cards = obj?.object?.sb?.card_data;
  if (Array.isArray(cards)) {
    for (const card of cards) {
      const type = String(card.type ?? "");
      if ((type === "text" || type === "quickreply") && typeof card.text === "string" && card.text.trim()) {
        texts.push(card.text.trim());
      }
      const btns = card.buttons as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(btns)) {
        for (const b of btns) {
          if (b && typeof b.title === "string") {
            buttons.push({ title: b.title, payload: String(b.payload ?? ""), type: String(b.type ?? "postback") });
          }
        }
      }
    }
  }
  return { text: texts.join("\n\n"), buttons };
}

/**
 * Gọi SmartBot 1 lượt.
 * @param text nội dung gửi bot (đã kèm ngữ cảnh nếu cần)
 * @param opts system_prompt / advance_prompt / senderId / sessionId
 */
export async function askSmartBot(
  text: string,
  opts: {
    systemPrompt?: string;
    advancePrompt?: string;
    senderId?: string;
    sessionId?: string;
    timeoutMs?: number;
  } = {}
): Promise<SmartBotResult> {
  const { cfg, isConfigured } = getSmartBotConfig();
  if (!isConfigured) {
    return { ok: false, text: "", buttons: [], error: "SMARTBOT_NOT_CONFIGURED" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await fetch(STANDARD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer(cfg.token),
        "Token-id": cfg.tokenId,
        "Token-key": cfg.tokenKey,
      },
      body: JSON.stringify({
        bot_id: cfg.botId,
        sender_id: opts.senderId || "phylab-student",
        text,
        input_channel: "api",
        session_id: opts.sessionId || `phylab-${Date.now()}`,
        metadata: {},
        settings: {
          system_prompt: opts.systemPrompt || "",
          advance_prompt: opts.advancePrompt || "",
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, text: "", buttons: [], error: `SMARTBOT_HTTP_${res.status}` };
    }
    const data = await res.json();
    const { text: reply, buttons } = parseCardData(data);
    if (!reply) {
      return { ok: false, text: "", buttons, raw: data, error: "SMARTBOT_EMPTY" };
    }
    return { ok: true, text: reply, buttons, raw: data };
  } catch (err) {
    return {
      ok: false, text: "", buttons: [],
      error: err instanceof Error ? err.message : "SMARTBOT_FETCH_FAILED",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Lỗi tạm thời (mạng/5xx/timeout) — đáng thử lại; lỗi cấu hình thì không. */
function isTransientError(error?: string): boolean {
  if (!error) return false;
  return /^SMARTBOT_HTTP_5|aborted|abort|fetch failed|SMARTBOT_FETCH_FAILED|ETIMEDOUT|ECONNRESET/i.test(error);
}

/**
 * askSmartBotResilient — gọi SmartBot với 2 chiến lược trước khi chịu thua:
 *
 *  1. "settings":  text ngắn + system_prompt/advance_prompt trong settings (như tài liệu).
 *     → Chỉ hoạt động khi bot bật "tri thức nâng cao". Retry 1 lần nếu lỗi tạm thời.
 *  2. "embedded":  nhồi TOÀN BỘ chỉ dẫn + ngữ cảnh vào thẳng `text`.
 *     → Không phụ thuộc cài đặt platform; bot LLM/tri-thức nào cũng nhìn thấy đủ ngữ cảnh.
 *
 * Trả về kết quả đầu tiên KHÔNG phải câu xin lỗi mặc định (isNonAnswer). Caller vẫn phải
 * giữ fallback cuối (RAG/template) khi cả hai chiến lược thất bại.
 */
export async function askSmartBotResilient(
  text: string,
  opts: {
    systemPrompt?: string;
    advancePrompt?: string;
    senderId?: string;
    sessionId?: string;
    timeoutMs?: number;
  } = {}
): Promise<SmartBotResult> {
  // 1) settings prompts
  let first = await askSmartBot(text, opts);
  if (!first.ok && isTransientError(first.error)) {
    first = await askSmartBot(text, opts); // retry 1 lần cho lỗi tạm thời
  }
  if (first.ok && !isNonAnswer(first.text)) {
    return { ...first, strategy: "settings" };
  }

  // 2) embedded — chỉ đáng thử khi có advance_prompt chứa ngữ cảnh đầy đủ
  if (opts.advancePrompt && opts.advancePrompt.trim()) {
    const embeddedText = `${opts.systemPrompt ? opts.systemPrompt + "\n\n" : ""}${opts.advancePrompt}`;
    const second = await askSmartBot(embeddedText, {
      senderId: opts.senderId,
      sessionId: opts.sessionId ? `${opts.sessionId}-emb` : undefined,
      timeoutMs: opts.timeoutMs,
    });
    if (second.ok && !isNonAnswer(second.text)) {
      return { ...second, strategy: "embedded" };
    }
  }

  // Cả hai đều thất bại — trả kết quả đầu (kèm lý do) để caller fallback template/RAG.
  const error = first.ok ? "SMARTBOT_NON_ANSWER" : first.error;
  return { ...first, ok: false, error };
}
