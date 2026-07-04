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
  "Trả lời ngắn gọn, chính xác, thân thiện, xưng 'chị' gọi học sinh là 'em'. " +
  "Chỉ dùng kiến thức trong phạm vi hai bài này và ngữ cảnh được cung cấp.";

async function handleChat(userQuery: string) {
  const ragContext = buildRagContext(userQuery, 3);
  const advance = ragContext
    ? `Dựa vào các tài liệu sau để trả lời câu hỏi của học sinh. Nếu tài liệu không đủ, nói em hỏi cụ thể hơn.\n\n${ragContext}\n\nCâu hỏi: ${userQuery}`
    : `Câu hỏi của học sinh: ${userQuery}`;

  const bot = await askSmartBotResilient(userQuery, {
    systemPrompt: SYSTEM_PROMPT,
    advancePrompt: advance,
  });

  if (bot.ok) {
    return NextResponse.json({ message: bot.text, buttons: bot.buttons, source: "smartbot", strategy: bot.strategy });
  }
  const botError = bot.error || "SMARTBOT_NON_ANSWER";

  // Fallback THẬT: câu trả lời rút từ kho tri thức (RAG), không phải câu mẫu rỗng.
  const rag = retrieveAnswer(userQuery);
  if (rag) {
    return NextResponse.json({ message: rag, source: "rag", warning: botError });
  }
  return NextResponse.json({
    message:
      "Chị chưa tìm thấy nội dung khớp trong hai bài thực hành. Em thử hỏi cụ thể hơn nhé, ví dụ: " +
      "cách tính g, vận tốc tức thời/trung bình, chế độ MODE của MC964, cách nối dây, hay cách tính sai số.",
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
  const labKind = sanitizeText(body.labKind, 40);
  const templatePrompt = sanitizeText(body.prompt, LIMITS.problemPrompt);
  const targets = body.targets ?? [];

  const advance =
    `Học sinh sắp làm phần "${labKind}". Hãy VIẾT LẠI đề bài dưới đây thành một đoạn ngắn, ` +
    `thân thiện, giữ NGUYÊN các con số mục tiêu (θ, sEF, s), không thêm số mới. ` +
    `Mục tiêu (JSON): ${JSON.stringify(targets)}\n\nĐề gốc: ${templatePrompt}`;

  const bot = await askSmartBotResilient(templatePrompt, {
    systemPrompt: SYSTEM_PROMPT + " Bây giờ em đóng vai giáo viên giao đề đo cho học sinh.",
    advancePrompt: advance,
  });

  if (bot.ok) {
    // Bot có thể diễn đạt lại nhưng đánh rơi số mục tiêu → đề vô dụng, phải dùng đề gốc.
    if (keepsTargetNumbers(bot.text, targets)) {
      return NextResponse.json({ message: bot.text, source: "smartbot", strategy: bot.strategy });
    }
    return NextResponse.json({ message: templatePrompt, source: "template", warning: "SMARTBOT_LOST_TARGETS" });
  }
  // Fallback: dùng đúng câu đề template (đã chứa số mục tiêu).
  return NextResponse.json({ message: templatePrompt, source: "template", warning: bot.error || "SMARTBOT_NON_ANSWER" });
}

async function handleGrade(body: Record<string, unknown>) {
  const summary = sanitizeText(body.summary, LIMITS.chat);
  const advance =
    "Dưới đây là BẢNG ĐIỂM đã tính bằng máy (deterministic). Hãy viết NHẬN XÉT ngắn gọn 3–4 câu cho " +
    "học sinh: điểm mạnh, chỗ cần cải thiện (trình tự/sai số), và một lời khuyên. TUYỆT ĐỐI không đổi điểm số.\n\n" +
    summary;

  const bot = await askSmartBotResilient("Nhận xét bài thực hành giúp em.", {
    systemPrompt: SYSTEM_PROMPT + " Em đóng vai giáo viên chấm bài, nhận xét khách quan.",
    advancePrompt: advance,
  });

  if (bot.ok) {
    return NextResponse.json({ message: bot.text, source: "smartbot", strategy: bot.strategy });
  }
  return NextResponse.json({ message: templateGradeComment(body), source: "template", warning: bot.error || "SMARTBOT_NON_ANSWER" });
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
    return await handleChat(userQuery);
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
