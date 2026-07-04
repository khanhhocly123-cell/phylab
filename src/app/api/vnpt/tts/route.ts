import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { sanitizeText, LIMITS } from "@/lib/security";

const ENGLISH_PHONETICS: Record<string, string> = {
  setup: "thiết lập",
  reset: "re sét",
  error: "lỗi",
  port: "cổng",
  connect: "kết nối",
  button: "nút bấm",
  graph: "đồ thị",
  data: "dữ liệu",
  run: "chạy",
  save: "lưu",
  export: "xuất",
  menu: "danh mục",
  select: "chọn",
  sensor: "cảm biến",
  multimeter: "đồng hồ vạn năng",
  voltmeter: "vôn kế",
  ammeter: "ampe kế",
  adapter: "bộ đổi nguồn",
  usb: "u ét bê",
  plug: "cắm",
  cable: "dây cáp",
  rag: "tri thức",
  bot: "trợ lý",
  chatbot: "trợ lý",
  playlist: "danh sách phát",
  audio: "âm thanh",
  link: "đường dẫn",
  test: "kiểm tra",
  mode: "chế độ",
  on: "on",
  off: "off",
  lcd: "màn hình",
  photogate: "cổng quang điện",
  electromagnet: "nam châm điện",
  phylab: "phai láp",
  realphylab: "rin phai láp",
  feedback: "phản hồi",
  history: "lịch sử",
  theory: "lý thuyết",
  formula: "công thức",
  step: "bước",
  result: "kết quả",
  calibration: "hiệu chuẩn",
  calibrate: "hiệu chuẩn",
};

function sanitizeTtsText(text: string): string {
  if (!text) return "";
  let s = text;

  // Replace HTML entities for quotes first to prevent them from turning into "vàquot"
  s = s.replace(/&quot;/gi, "");
  s = s.replace(/&apos;/gi, "");
  s = s.replace(/&#39;/g, "");
  s = s.replace(/&amp;/g, " và ");
  s = s.replace(/&/g, " và ");

  // Alphanumeric device models
  s = s.replace(/(?<!\p{L})EMC964(?!\p{L})/gui, "E M C 9 6 4");
  s = s.replace(/(?<!\p{L})MC964(?!\p{L})/gui, "M C 9 6 4");

  // Decimals (e.g., 3.5 -> 3 phẩy 5)
  s = s.replace(/(\d+)\.(\d+)/g, "$1 phẩy $2");

  // Replace units first before single variable letters
  s = s.replace(/(?<!\p{L})(\d+)\s*m\/s²(?!\p{L})/gu, "$1 mét trên giây bình phương");
  s = s.replace(/(?<!\p{L})(\d+)\s*m\/s(?!\p{L})/gu, "$1 mét trên giây");
  s = s.replace(/(?<!\p{L})(\d+)\s*mm(?!\p{L})/gu, "$1 mili mét");
  s = s.replace(/(?<!\p{L})(\d+)\s*cm(?!\p{L})/gu, "$1 xăng ti mét");
  s = s.replace(/(?<!\p{L})(\d+)\s*m(?!\p{L})/gu, "$1 mét");
  s = s.replace(/(?<!\p{L})(\d+)\s*s(?!\p{L})/gu, "$1 giây");
  s = s.replace(/(?<!\p{L})(\d+)%(?!\p{L})/gu, "$1 phần trăm");

  // Common formulas & math physics variables
  s = s.replace(/(?<!\p{L})2s(?!\p{L})/gu, "hai ét");
  s = s.replace(/(?<!\p{L})v_tb(?!\p{L})/gui, "vận tốc trung bình");
  s = s.replace(/(?<!\p{L})s_EF(?!\p{L})/gui, "quãng đường s E F");
  s = s.replace(/(?<!\p{L})sEF(?!\p{L})/gui, "s E F");

  // Standalone physics variables in Vietnamese contexts (using Unicode lookarounds instead of \b)
  s = s.replace(/(?<!\p{L})s(?!\p{L})/gu, "ét");
  s = s.replace(/(?<!\p{L})t(?!\p{L})/gu, "tê");
  s = s.replace(/(?<!\p{L})g(?!\p{L})/gu, "gờ");
  s = s.replace(/(?<!\p{L})d(?!\p{L})/gu, "dê");
  s = s.replace(/(?<!\p{L})v(?!\p{L})/gu, "vê");
  s = s.replace(/(?<!\p{L})a(?!\p{L})/gu, "gia tốc a");

  // Port names and labels
  s = s.replace(/(?<!\p{L})E–F(?!\p{L})/gu, "E sang F");
  s = s.replace(/(?<!\p{L})E-F(?!\p{L})/gu, "E sang F");
  s = s.replace(/(?<!\p{L})E(?!\p{L})/gu, "E");
  s = s.replace(/(?<!\p{L})F(?!\p{L})/gu, "Ép");
  s = s.replace(/(?<!\p{L})A(?!\p{L})/gu, "A");
  s = s.replace(/(?<!\p{L})B(?!\p{L})/gu, "Bê");

  // Translate common English words
  for (const [eng, vi] of Object.entries(ENGLISH_PHONETICS)) {
    const rx = new RegExp(`(?<!\\p{L})${eng}(?!\\p{L})`, "gui");
    s = s.replace(rx, vi);
  }

  // Greek letters, math symbols and arrows
  s = s.replace(/=/g, " bằng ");
  s = s.replace(/±/g, " cộng trừ ");
  s = s.replace(/\+\/-|\+-\b/g, " cộng trừ ");
  s = s.replace(/[≈~]/g, " xấp xỉ ");
  s = s.replace(/·/g, " nhân ");
  s = s.replace(/²/g, " bình phương");
  s = s.replace(/³/g, " mũ ba");
  s = s.replace(/½/g, " một phần hai");
  s = s.replace(/√/g, " căn bậc hai của ");
  s = s.replace(/θ/g, "thê ta");
  s = s.replace(/Δ/g, "sai số ");

  // Slashes replacement (fraction slashes with numbers -> "trên", text separators -> "hoặc", math -> "chia")
  s = s.replace(/(\d+)\/(\d+)/g, "$1 trên $2");
  s = s.replace(/\s+\/\s+/g, " hoặc ");
  s = s.replace(/\//g, " chia ");

  // Arrows and modes
  s = s.replace(/A↔B/g, "A sang B");
  s = s.replace(/A<->B/g, "A sang B");
  s = s.replace(/A\s*↔\s*B/g, "A sang B");

  // Special dashes and formatting symbols
  s = s.replace(/—/g, ", ");
  s = s.replace(/–/g, ", ");

  // Strip all kinds of quotes (ASCII & Unicode smart/curly quotes)
  s = s.replace(/[“”‘’«»„"']/g, "");
  s = s.replace(/\*/g, ""); // remove bold markers **
  s = s.replace(/[\$\`]/g, ""); // remove math LaTeX signs like $ or `

  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Bảo mật: làm sạch + kẹp độ dài (SmartVoice tối đa 5000 ký tự).
    let text = sanitizeText(body?.text, LIMITS.tts);
    text = sanitizeTtsText(text);

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const voiceBaseUrl = process.env.VNPT_VOICE_BASE_URL || "https://api.idg.vnpt.vn";
    const voiceAccessToken = process.env.VNPT_VOICE_ACCESS_TOKEN;
    const voiceTokenId = process.env.VNPT_VOICE_TOKEN_ID;
    const voiceTokenKey = process.env.VNPT_VOICE_TOKEN_KEY;

    // Check if voice credentials are set
    const isConfigured = !!(voiceAccessToken && voiceTokenId && voiceTokenKey);

    if (!isConfigured) {
      console.log("[TTS Route] VNPT SmartVoice not configured. Client will fallback to SpeechSynthesis.");
      return NextResponse.json({ isMock: true });
    }

    console.log(`[TTS Route] Querying VNPT SmartVoice for text: "${text.substring(0, 30)}..."`);

    const res = await fetch(`${voiceBaseUrl.replace(/\/$/, "")}/tts-service/v2/grpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: voiceAccessToken.startsWith("Bearer ") ? voiceAccessToken : `Bearer ${voiceAccessToken}`,
        "Token-id": voiceTokenId || "",
        "Token-key": voiceTokenKey || "",
      },
      body: JSON.stringify({
        text: text,
        text_split: false,
        region: "female_north",
        audio_format: "mp3",
        sample_rate: 22050,
        speed: 1.0,
      }),
    });

    if (!res.ok) {
      throw new Error(`VNPT TTS service failed with status ${res.status}`);
    }

    const data = await res.json();

    // According to cheatsheet:
    // { message, object: { playlist: [{ audio_link }] } }
    const playlist = data?.object?.playlist || [];

    if (playlist.length === 0) {
      console.warn("[TTS Route] No playlist returned from VNPT TTS:", data);
      return NextResponse.json({ isMock: true, warning: "Empty playlist" });
    }

    // Fetch all playlist items and concatenate them to handle long text
    try {
      const buffers = await Promise.all(
        playlist.map(async (item: any, idx: number) => {
          const audioLink = item?.audio_link || "";
          if (!audioLink) throw new Error(`Empty audio_link at index ${idx}`);
          const audioRes = await fetch(audioLink);
          if (!audioRes.ok) throw new Error(`AUDIO_FETCH_${audioRes.status} at index ${idx}`);
          return Buffer.from(await audioRes.arrayBuffer());
        })
      );

      const combinedBuffer = Buffer.concat(buffers);
      const contentType = "audio/mp3";
      const base64 = combinedBuffer.toString("base64");

      return NextResponse.json({
        audioLink: `data:${contentType};base64,${base64}`,
        isMock: false,
      });
    } catch (audioErr) {
      console.warn("[TTS Route] Failed to fetch/encode VNPT audio playlist, falling back:", audioErr);
      return NextResponse.json({ isMock: true, warning: "Audio playlist fetch failed" });
    }
  } catch (err) {
    console.error("[TTS Route ERROR]:", err);
    // Fallback to mock on error to maintain high availability
    return NextResponse.json({
      isMock: true,
      error: err instanceof Error ? err.message : "TTS failed",
    });
  }
}
