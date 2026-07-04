import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { retrieveAnswer, buildRagContext } from "@/lib/labKnowledge";
import { askSmartBotResilient, getSmartBotConfig } from "@/lib/vnpt-smartbot";
import { sanitizeText, LIMITS } from "@/lib/security";

/**
 * /api/vnpt/chat — Cổng LLM (VNPT SmartBot) + RAG cho PhyLab.
 *
 * 3 tác vụ (field `task`, mặc định "chat"):
 *  - "chat":    Hỏi–đáp thí nghiệm. RAG (labKnowledge) → nhồi ngữ cảnh vào SmartBot.
 *               Không có bot_id thật → trả lời bằng RAG THẬT (source "rag"), không canned fake.
 *  - "problem": Trợ lý ra đề. SmartBot diễn đạt lại đề từ các mục tiêu số; fallback template.
 *  - "grade":   Trợ lý viết NHẬN XÉT từ bảng điểm deterministic; fallback template.
 */

const SYSTEM_PROMPT =
  "Bạn là Trợ lý Phylab — trợ giảng vật lí lớp 10 (SGK Kết nối tri thức) cho hai bài thực hành: " +
  "Bài 6 (đo tốc độ tức thời/trung bình trên máng nghiêng) và Bài 11 (đo gia tốc rơi tự do). " +
  "Chỉ dùng kiến thức trong phạm vi hai bài này và ngữ cảnh được cung cấp.";

type AssistantSettings = {
  pronoun?: "anh" | "chị";
  answerStyle?: "short" | "detailed";
};

type QuickAction = {
  title: string;
  payload: string;
  type: "lab_action";
};

function normalizeAssistantSettings(input: unknown): Required<AssistantSettings> {
  const raw = (input && typeof input === "object" ? input : {}) as AssistantSettings;
  return {
    pronoun: raw.pronoun === "anh" ? "anh" : "chị",
    answerStyle: raw.answerStyle === "detailed" ? "detailed" : "short",
  };
}

function personaPrompt(settings: Required<AssistantSettings>): string {
  const voice =
    settings.answerStyle === "detailed"
      ? "Trả lời chi tiết theo từng bước, nhưng vẫn gọn và có thể thao tác ngay."
      : "Trả lời ngắn gọn trong 2–3 câu, ưu tiên chỉ ra thao tác tiếp theo.";
  return ` Xưng '${settings.pronoun}' và gọi học sinh là 'em'. ${voice}`;
}

function applyAssistantPersona(text: string, settings: Required<AssistantSettings>): string {
  if (!text) return text;
  const selfUpper = settings.pronoun === "anh" ? "Anh" : "Chị";
  const self = settings.pronoun;
  let out = text
    .replace(/(^|[\s"'([{])Chúng tôi(?=$|[\s,.!?;:)\]}])/g, `$1${selfUpper}`)
    .replace(/(^|[\s"'([{])chúng tôi(?=$|[\s,.!?;:)\]}])/g, `$1${self}`)
    .replace(/(^|[\s"'([{])Tôi(?=$|[\s,.!?;:)\]}])/g, `$1${selfUpper}`)
    .replace(/(^|[\s"'([{])tôi(?=$|[\s,.!?;:)\]}])/g, `$1${self}`)
    .replace(/(^|[\s"'([{])Bạn(?=$|[\s,.!?;:)\]}])/g, "$1Em")
    .replace(/(^|[\s"'([{])bạn(?=$|[\s,.!?;:)\]}])/g, "$1em");
  if (settings.pronoun === "anh") {
    return out
      .replace(/(^|[\s"'([{])Chị(?=$|[\s,.!?;:)\]}])/g, "$1Anh")
      .replace(/(^|[\s"'([{])chị(?=$|[\s,.!?;:)\]}])/g, "$1anh");
  }
  return out
    .replace(/(^|[\s"'([{])Anh(?=$|[\s,.!?;:)\]}])/g, "$1Chị")
    .replace(/(^|[\s"'([{])anh(?=$|[\s,.!?;:)\]}])/g, "$1chị");
}

function buildLabContext(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  return sanitizeText(JSON.stringify(input), 1200);
}

function quickActionsFor(query: string, labContext: string): QuickAction[] {
  const q = query.toLowerCase();
  const ctx = labContext.toLowerCase();
  const actions: QuickAction[] = [];
  const add = (title: string, payload: string) => {
    if (!actions.some((a) => a.payload === payload)) actions.push({ title, payload, type: "lab_action" });
  };

  if (/không lắp|khong lap|khó lắp|kho lap|không kéo|khong keo|kéo không|keo khong|drag|thả không|tha khong/.test(q)) {
    add("Tự động lắp bước này", "auto_place_next");
  }
  if (/dây|day|nối|noi|cắm|cam|jack|ổ/.test(q) || ctx.includes('"wiredok":false')) {
    add("Tự động nối dây", "auto_wire");
  }
  if (/vít|vit|cố định|co dinh|siết|siet|cân bằng|can bang|dây dọi|day doi/.test(q) || ctx.includes('"balanced":false')) {
    add("Tự động cố định vít", "auto_fix_screw");
  }
  if (/nguồn|nguon|bật|bat|không lên|khong len|đồng hồ|dong ho/.test(q) || ctx.includes('"power":false')) {
    add("Bật nguồn đồng hồ", "auto_power");
  }
  if (/mode|chế độ|che do|a↔b|a<->b/.test(q) || ctx.includes('"modeok":false')) {
    add("Chọn đúng MODE", "auto_mode");
  }
  if (/reset|về 0|ve 0|0.000|số đo cũ|so do cu/.test(q) || ctx.includes('"isreset":false')) {
    add("Reset số đo", "auto_reset");
  }
  return actions.slice(0, 3);
}

function actionFallbackMessage(settings: Required<AssistantSettings>, actions: QuickAction[]): string {
  const self = settings.pronoun === "anh" ? "Anh" : "Chị";
  if (!actions.length) return "";
  const first = actions[0].title.toLowerCase();
  return `${self} thấy đây là lỗi thao tác trong Lab. Em có thể bấm nút "${first}" bên dưới để Trợ lý Phylab tự xử lý bước đó, hoặc tiếp tục tự thao tác trên bàn thí nghiệm.`;
}

async function handleChat(userQuery: string, body: Record<string, unknown>) {
  const settings = normalizeAssistantSettings(body.assistantSettings);
  const labContext = buildLabContext(body.labContext);
  const ragContext = buildRagContext(userQuery, 3);
  const contextLine = labContext ? `\n\nNgữ cảnh thao tác hiện tại trong Lab (JSON): ${labContext}` : "";
  const actionHint =
    "Nếu học sinh gặp lỗi thao tác/kỹ thuật, hãy trả lời lý do ngắn gọn và gợi ý dùng nút thao tác nhanh nếu có.";
  const advance = ragContext
    ? `Dựa vào các tài liệu sau để trả lời câu hỏi của học sinh. Nếu tài liệu không đủ, nói em hỏi cụ thể hơn.${contextLine}\n\n${ragContext}\n\n${actionHint}\n\nCâu hỏi: ${userQuery}`
    : `Câu hỏi của học sinh: ${userQuery}${contextLine}\n\n${actionHint}`;
  const quickActions = quickActionsFor(userQuery, labContext);

  const bot = await askSmartBotResilient(userQuery, {
    systemPrompt: SYSTEM_PROMPT + personaPrompt(settings),
    advancePrompt: advance,
  });

  if (bot.ok) {
    const rawMessage =
      quickActions.length && /không thể|chưa thể|không hỗ trợ|không trả lời|khong the|khong ho tro/i.test(bot.text)
        ? actionFallbackMessage(settings, quickActions)
        : bot.text;
    return NextResponse.json({
      message: applyAssistantPersona(rawMessage, settings),
      buttons: quickActions.length ? quickActions : bot.buttons,
      source: "smartbot",
      strategy: bot.strategy,
    });
  }
  const botError = bot.error || "SMARTBOT_NON_ANSWER";

  // Fallback THẬT: câu trả lời rút từ kho tri thức (RAG), không phải câu mẫu rỗng.
  const rag = retrieveAnswer(userQuery);
  if (rag) {
    return NextResponse.json({ message: applyAssistantPersona(rag, settings), buttons: quickActions, source: "rag", warning: botError });
  }
  return NextResponse.json({
    message: applyAssistantPersona(
      "Chị chưa tìm thấy nội dung khớp trong hai bài thực hành. Em thử hỏi cụ thể hơn nhé, ví dụ: " +
      "cách tính g, vận tốc tức thời/trung bình, chế độ MODE của MC964, cách nối dây, hay cách tính sai số.",
      settings
    ),
    buttons: quickActions,
    source: "rag",
    warning: botError,
  });
}

/** Rút mọi giá trị số trong targets (đệ quy) để kiểm chứng đề bot viết lại không làm mất số. */
function numbersOf(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => numbersOf(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => numbersOf(v, out));
  return out;
}

/** Đề hợp lệ khi mọi con số mục tiêu còn nguyên trong text (chấp nhận cả 0.5 lẫn 0,5). */
function keepsTargetNumbers(text: string, targets: unknown): boolean {
  return numbersOf(targets).every((n) => {
    const dot = String(n);
    const comma = dot.replace(".", ",");
    return text.includes(dot) || text.includes(comma);
  });
}

async function handleProblem(body: Record<string, unknown>) {
  const settings = normalizeAssistantSettings(body.assistantSettings);
  const labKind = sanitizeText(body.labKind, 40);
  const templatePrompt = sanitizeText(body.prompt, LIMITS.problemPrompt);
  const targets = body.targets ?? [];

  const advance =
    `Học sinh sắp làm phần "${labKind}". Hãy VIẾT LẠI đề bài dưới đây thành một đoạn ngắn, ` +
    `thân thiện, giữ NGUYÊN các con số mục tiêu (θ, sEF, s), không thêm số mới. ` +
    `Mục tiêu (JSON): ${JSON.stringify(targets)}\n\nĐề gốc: ${templatePrompt}`;

  const bot = await askSmartBotResilient(templatePrompt, {
    systemPrompt: SYSTEM_PROMPT + personaPrompt(settings) + " Bây giờ em đóng vai giáo viên giao đề đo cho học sinh.",
    advancePrompt: advance,
  });

  if (bot.ok) {
    // Bot có thể diễn đạt lại nhưng đánh rơi số mục tiêu → đề vô dụng, phải dùng đề gốc.
    if (keepsTargetNumbers(bot.text, targets)) {
      return NextResponse.json({ message: applyAssistantPersona(bot.text, settings), source: "smartbot", strategy: bot.strategy });
    }
    return NextResponse.json({ message: templatePrompt, source: "template", warning: "SMARTBOT_LOST_TARGETS" });
  }
  // Fallback: dùng đúng câu đề template (đã chứa số mục tiêu).
  return NextResponse.json({ message: templatePrompt, source: "template", warning: bot.error || "SMARTBOT_NON_ANSWER" });
}

async function handleGrade(body: Record<string, unknown>) {
  const settings = normalizeAssistantSettings(body.assistantSettings);
  const summary = sanitizeText(body.summary, LIMITS.chat);
  const advance =
    "Dưới đây là BẢNG ĐIỂM đã tính bằng máy (deterministic). Hãy viết NHẬN XÉT ngắn gọn 3–4 câu cho " +
    "học sinh: điểm mạnh, chỗ cần cải thiện (trình tự/sai số), và một lời khuyên. TUYỆT ĐỐI không đổi điểm số.\n\n" +
    summary;

  const bot = await askSmartBotResilient("Nhận xét bài thực hành giúp em.", {
    systemPrompt: SYSTEM_PROMPT + personaPrompt(settings) + " Em đóng vai giáo viên chấm bài, nhận xét khách quan.",
    advancePrompt: advance,
  });

  if (bot.ok) {
    return NextResponse.json({ message: applyAssistantPersona(bot.text, settings), source: "smartbot", strategy: bot.strategy });
  }
  return NextResponse.json({ message: applyAssistantPersona(templateGradeComment(body), settings), source: "template", warning: bot.error || "SMARTBOT_NON_ANSWER" });
}

/** Nhận xét mẫu (deterministic) khi chưa có SmartBot — vẫn bám số liệu thật. */
function templateGradeComment(body: Record<string, unknown>): string {
  const total = Number(body.totalScore ?? 0);
  const dataC = Number(body.dataCloseness ?? 0);
  const physC = Number(body.physicalCloseness ?? 0);
  const bad = Number(body.badSetupCount ?? 0);
  const lines: string[] = [];
  lines.push(`Kết quả chung: ${total.toFixed(1)}/10.`);
  if (dataC >= 90) lines.push("Phần tự tính số liệu của em rất chính xác, áp dụng công thức tốt.");
  else if (dataC >= 80) lines.push("Phần tự tính số liệu khá ổn nhưng còn vài chỗ lệch, em kiểm tra lại phép tính.");
  else lines.push("Một số kết quả tự tính chưa khớp công thức — em rà lại cách thay số và làm tròn.");
  if (physC >= 90) lines.push("Số đo bám sát giá trị lý thuyết, thao tác đo ổn định.");
  else lines.push("Số đo còn sai lệch so với lý thuyết, nên đo lặp nhiều lần và lấy trung bình.");
  if (bad > 0) lines.push(`Em có ${bad} lần đo khi máng chưa cân bằng — nhớ căn dây dọi trước khi đo để tránh sai số hệ thống.`);
  else lines.push("Trình tự thí nghiệm đúng: cân bằng máng trước khi đo. Tốt lắm!");
  return lines.join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = body.task || "chat";

    if (task === "problem") return await handleProblem(body);
    if (task === "grade") return await handleGrade(body);

    // task = chat
    const { messages } = body;
    let userQuery = "";
    if (Array.isArray(messages) && messages.length) {
      userQuery = messages[messages.length - 1]?.content || "";
    } else if (typeof body.text === "string") {
      userQuery = body.text;
    }
    // Bảo mật: làm sạch + kẹp độ dài trước khi nhồi vào prompt SmartBot.
    userQuery = sanitizeText(userQuery, LIMITS.chat);
    if (!userQuery) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }
    return await handleChat(userQuery, body);
  } catch (err) {
    console.error("[Chat Route ERROR]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat query failed" },
      { status: 500 }
    );
  }
}

/** GET tiện kiểm tra cấu hình SmartBot (không lộ token). */
export async function GET() {
  const { isConfigured } = getSmartBotConfig();
  return NextResponse.json({ smartbotConfigured: isConfigured });
}
