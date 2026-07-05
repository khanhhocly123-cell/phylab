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
  "Bạn là Trợ lý Phylab — trợ giảng vật lí phổ thông. " +
  "Ưu tiên hỗ trợ thao tác trong phòng lab ảo, nhưng vẫn trả lời được các câu hỏi vật lí phổ thông ngoài phạm vi bài đang thí nghiệm.";

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
  const voice = settings.answerStyle === "detailed" ? "Trả lời chi tiết." : "Trả lời ngắn gọn trong 2 dòng.";
  return ` Xưng là ${settings.pronoun}, gọi học sinh là em. ${voice}`;
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

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function quickActionsFor(query: string, labContext: string): QuickAction[] {
  const q = query.toLowerCase();
  const ctx = labContext.toLowerCase();
  const assembled = ctx.includes('"assembled":true');
  const labId = ctx.includes('"labid":"b11"') ? "b11" : "b6";
  const actions: QuickAction[] = [];
  const add = (title: string, payload: string) => {
    if (!actions.some((a) => a.payload === payload)) actions.push({ title, payload, type: "lab_action" });
  };

  const isStuck = hasAny(q, [
    /không|khong|ko|k\s|chưa|chua|lỗi|loi|khó|kho|kẹt|ket|không được|khong duoc|không biết|khong biet|vướng|vuong|sai|fail|giúp|giup|hỗ trợ|ho tro/,
  ]);
  const asksForAutomation = /tự động|tu dong|auto|làm giúp|lam giup|kéo giúp|keo giup|lắp giúp|lap giup|nối giúp|noi giup/.test(q);
  const needsHelp = isStuck || asksForAutomation;

  if (!needsHelp) return actions;

  const assemblyProblem = /kéo thả|keo tha|kéo|keo|thả|tha|lắp|lap|đặt|dat|bấm|bam|dụng cụ|dung cu|vật nặng|vat nang|bi|trụ|tru|nam châm|nam cham/.test(q);
  const wireProblem = /dây|day|nối|noi|cắm|cam|jack|ổ|o cam|cổng|cong/.test(q);
  const screwProblem = /vít|vit|cố định|co dinh|siết|siet|cân bằng|can bang|dây dọi|day doi/.test(q);
  const powerProblem = /nguồn|nguon|bật|bat|không lên|khong len|đồng hồ|dong ho/.test(q);
  const modeProblem = /mode|chế độ|che do|a↔b|a<->b/.test(q);
  const resetProblem = /reset|về 0|ve 0|0\.000|số đo cũ|so do cu/.test(q);

  if (wireProblem) {
    add("Tự động nối dây", "auto_wire");
  }
  if (screwProblem) {
    add("Tự động cố định vít", "auto_fix_screw");
  }
  if (assemblyProblem) {
    if (assembled) {
      add(labId === "b11" ? "Tự động gắn lại trụ thép" : "Tự động đặt lại bi", "auto_reset_object");
    } else {
      add("Tự động lắp bước này", "auto_place_next");
    }
  }
  if (powerProblem) {
    add("Bật nguồn đồng hồ", "auto_power");
  }
  if (modeProblem) {
    add("Chọn đúng MODE", "auto_mode");
  }
  if (resetProblem) {
    add("Reset số đo", "auto_reset");
  }
  return actions.slice(0, 3);
}

function actionFallbackMessage(settings: Required<AssistantSettings>, actions: QuickAction[]): string {
  const self = settings.pronoun === "anh" ? "Anh" : "Chị";
  if (!actions.length) return "";
  const first = actions[0];
  if (first.payload === "auto_wire") {
    return `${self} thấy em đang kẹt ở bước nối dây. Em kiểm tra đã lắp đủ đồng hồ và cổng quang/công tắc chưa, rồi chạm vào đầu dây hoặc bấm "${first.title.toLowerCase()}" bên dưới để Trợ lý Phylab nối giúp.`;
  }
  if (first.payload === "auto_reset_object") {
    return `${self} thấy vật thả đang khó kéo về vị trí ban đầu. Em có thể thử chạm/kéo vật về phía nam châm, hoặc bấm "${first.title.toLowerCase()}" để Trợ lý Phylab đặt lại giúp.`;
  }
  if (first.payload === "auto_place_next") {
    return `${self} thấy em đang kẹt ở bước lắp dụng cụ. Em kéo biểu tượng bàn tay của dụng cụ đang sáng vào ô sáng trên bàn, hoặc bấm "${first.title.toLowerCase()}" để Trợ lý Phylab lắp giúp bước này.`;
  }
  if (first.payload === "auto_fix_screw") {
    return `${self} thấy phần cân bằng/cố định vít chưa ổn. Em zoom vùng máng hoặc bấm "${first.title.toLowerCase()}" để Trợ lý Phylab cố định vít giúp.`;
  }
  return `${self} thấy đây là lỗi thao tác trong Lab. Em có thể bấm "${first.title.toLowerCase()}" bên dưới để Trợ lý Phylab xử lý bước đó, hoặc tiếp tục tự thao tác trên bàn thí nghiệm.`;
}

function isPromptEcho(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("bạn là trợ lý phylab") ||
    t.includes("câu hỏi của học sinh") ||
    t.includes("ngữ cảnh thao tác") ||
    t.includes("dựa vào các tài liệu sau") ||
    t.includes("system_prompt") ||
    t.includes("advance_prompt")
  );
}

function generalPhysicsFallback(query: string, settings: Required<AssistantSettings>): string {
  const self = settings.pronoun === "anh" ? "Anh" : "Chị";
  const q = query.toLowerCase();
  if (/vận tốc|van toc|velocity/.test(q)) {
    return `${self} trả lời ngắn nhé: vận tốc là đại lượng cho biết vật chuyển động nhanh hay chậm và theo hướng nào. Công thức thường dùng là v = s/t hoặc v = Δx/Δt tùy bài toán.`;
  }
  if (/tốc độ|toc do|speed/.test(q)) {
    return `${self} trả lời ngắn nhé: tốc độ cho biết mức nhanh chậm của chuyển động, không xét hướng. Công thức cơ bản là tốc độ = quãng đường / thời gian.`;
  }
  return `${self} chưa nhận được câu trả lời ổn từ SmartBot. Em hỏi lại cụ thể hơn một chút, ${settings.pronoun} sẽ giải thích theo kiến thức vật lí phổ thông nhé.`;
}

async function handleChat(userQuery: string, body: Record<string, unknown>) {
  const settings = normalizeAssistantSettings(body.assistantSettings);
  const labContext = buildLabContext(body.labContext);
  const ragContext = buildRagContext(userQuery, 3);
  const contextLine = labContext ? `\n\nNgữ cảnh thao tác hiện tại trong Lab (JSON): ${labContext}` : "";
  const actionHint =
    "Nếu học sinh gặp lỗi thao tác/kỹ thuật, hãy trả lời lý do ngắn gọn và gợi ý dùng nút thao tác nhanh nếu có.";
  const styleLine = personaPrompt(settings);
  const advance = ragContext
    ? `${styleLine}\nDựa vào các tài liệu sau để trả lời câu hỏi của học sinh. Nếu tài liệu không đủ, nói em hỏi cụ thể hơn.${contextLine}\n\n${ragContext}\n\n${actionHint}\n\nCâu hỏi: ${userQuery}`
    : `${styleLine}\nCâu hỏi của học sinh: ${userQuery}${contextLine}\n\n${actionHint}`;
  const quickActions = quickActionsFor(userQuery, labContext);
  const requestText = `${styleLine}\n${userQuery}`;

  const bot = await askSmartBotResilient(requestText, {
    systemPrompt: SYSTEM_PROMPT + personaPrompt(settings),
    advancePrompt: advance,
  });

  if (bot.ok) {
    const rawMessage =
      quickActions.length
        ? actionFallbackMessage(settings, quickActions)
        : bot.text;
    if (isPromptEcho(rawMessage)) {
      const rag = retrieveAnswer(userQuery);
      return NextResponse.json({
        message: applyAssistantPersona(rag || generalPhysicsFallback(userQuery, settings), settings),
        buttons: quickActions,
        source: rag ? "rag" : "local",
        warning: "SMARTBOT_PROMPT_ECHO",
      });
    }
    return NextResponse.json({
      message: applyAssistantPersona(rawMessage, settings),
      buttons: quickActions,
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
  const fallbackText =
    "Chị chưa tìm thấy nội dung khớp trong hai bài thực hành. Em thử hỏi cụ thể hơn nhé, ví dụ: " +
    "cách tính g, vận tốc tức thời/trung bình, chế độ MODE của MC964, cách nối dây, hay cách tính sai số.";
  return NextResponse.json({
    message: applyAssistantPersona(
      fallbackText,
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
