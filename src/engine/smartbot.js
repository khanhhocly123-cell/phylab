/**
 * smartbot.js — Trợ lý AI cho engine φLab (tách khỏi UI, giống physics.js).
 *
 * GỒM 2 phần:
 *  1) guide(state)  — Rule-engine hướng dẫn CHỦ ĐỘNG theo trạng thái thí nghiệm.
 *                     Chạy cục bộ, tức thì, offline. Dùng cho panel "Trợ lý" + TTS.
 *  2) ask(text)     — Hỏi đáp tự do. Ở bản RealPhyLab này, ask() gọi thẳng API
 *                     `/api/vnpt/chat` (VNPT Smartbot) của app; nếu lỗi/không có
 *                     mạng thì rơi về FAQ cục bộ localAnswer().
 *
 * Lưu ý khác bản Vite gốc: bỏ đọc import.meta.env; điểm vào chat là API route của
 * Next thay cho client gọi thẳng VNPT (đúng yêu cầu "giữ Hỏi đáp của RealPhyLab").
 */

/* ============================================================================
   1) RULE-ENGINE HƯỚNG DẪN
   guide(state) -> { id, text, tone }   tone: welcome|nudge|ok|success|done
   ========================================================================== */
export const LINES = {
  welcome6:
    "Chào em, chị là trợ lý Phylab. Ở bài này em sẽ tự tay lắp máng nghiêng, cổng quang và đồng hồ đo thời gian để đo vận tốc trung bình và vận tốc tức thời của viên bi. Em chọn tab Vận tốc trung bình hay Vận tốc tức thời ở góc trên tùy phần muốn làm nhé. Chị sẽ đi cùng em từng bước và nhắc ngay khi thấy thao tác chưa ổn. Bắt đầu bằng cách kéo các dụng cụ ở khay bên trái vào ô sáng có dấu cộng trên bàn nào.",
  welcome11:
    "Chào em, chị là trợ lý Phylab. Bài này mình cùng khảo sát chuyển động rơi tự do. Thả trụ thép cho rơi qua cổng quang, rồi từ quãng đường và thời gian đo được để tính ra gia tốc rơi tự do. Em cứ kéo dụng cụ từ khay bên trái vào ô sáng để lắp giàn thí nghiệm nhé. Lắp xong chị sẽ hướng dẫn nối dây và đo.",
  welcomeInst:
    "Chào em, chị là trợ lý Phylab. Phần này mình đo vận tốc tức thời của viên bi ngay tại một cổng quang. Cho bi che cổng, đo thời gian che rồi tính vận tốc bằng đường kính bi chia cho thời gian. Em chỉ cần lắp một cổng quang thôi và để đồng hồ ở chế độ đo một cổng A. Bắt đầu bằng cách kéo các dụng cụ ở khay bên trái vào ô sáng trên bàn nhé.",
  assembleMid6:
    "Em lắp đúng thứ tự rồi đó, cứ tiếp tục kéo dụng cụ đang sáng vào bàn nhé. Lưu ý là giá đỡ và ray lắp trước, sau đó tới nam châm, hai cổng quang rồi mới đến đồng hồ đo.",
  assembleMid11:
    "Em đang lắp rất tốt. Nhớ lắp giá đỡ ba chân và máng đứng trước cho chắc, rồi tới nam châm ở đỉnh, công tắc kép, cổng quang và cuối cùng là đồng hồ nhé.",
  plumb:
    "Trước khi đo, mình phải cân bằng giá đỡ đã. Em nhìn dây dọi xem máng đã thẳng đứng chưa, rồi bấm vào con vít vàng ở chân đế để siết cân bằng. Nếu máng còn lệch thì trụ thép có thể chạm thành máng và số liệu sẽ bị sai lệch đó.",
  powerOff:
    "Đồng hồ đo chưa có điện nên chưa đếm được đâu. Em bấm vào nút Xem mặt sau trên đồng hồ rồi gạt công tắc nguồn sang vị trí bật để khởi động nhé.",
  wireBad:
    "Đường tín hiệu chưa thông nên đồng hồ chưa nhận được cổng quang. Em lật ra mặt sau đồng hồ, kéo đầu dây cổng E cắm vào ổ A và đầu dây cổng F cắm vào ổ B cho đúng sơ đồ. Nếu cắm nhầm thì bấm vào ổ để rút ra rồi cắm lại.",
  wireBad11:
    "Đường tín hiệu chưa thông rồi. Em kéo dây của công tắc kép cắm vào ổ A để đồng hồ bắt đầu đếm ngay khi thả trụ thép, và kéo dây cổng quang cắm vào ổ B để đồng hồ dừng khi trụ đi qua cổng nhé.",
  modeAvg:
    "Đo vận tốc trung bình thì mình cần thời gian bi đi từ cổng E sang cổng F. Em bấm vào núm MODE trên mặt trước đồng hồ để xoay về nấc đo A B giúp chị nhé.",
  modeInst:
    "Đo vận tốc tức thời thì chỉ đo thời gian bi che đúng một cổng thôi. Em bấm núm MODE xoay về nấc đo một cổng A ứng với cổng đang cắm nhé, đừng để ở đo hai cổng A B kẻo đo nhầm.",
  mode11:
    "Với rơi tự do mình đo khoảng thời gian giữa lúc thả và lúc trụ cắt cổng quang. Em bấm núm MODE xoay về nấc đo A B giúp chị nhé.",
  reset:
    "Nhớ bấm nút Reset màu đỏ trên đồng hồ để đưa số về không trước mỗi lần đo. Nếu quên reset thì số của lần này sẽ cộng dồn vào lần trước và kết quả sẽ bị sai đó.",
  recordAvg:
    "Tốt lắm. Em đọc số thời gian trên đồng hồ rồi bấm nút Ghi số liệu để lưu lại. Ghi xong hãy đổi góc nghiêng hoặc khoảng cách hai cổng rồi đo câu tiếp theo nhé.",
  recordInst:
    "Được rồi đó. Em bấm Ghi số liệu để lưu thời gian vừa đo. Lát nữa ở phần báo cáo em tự tính vận tốc tức thời bằng cách lấy đường kính bi chia cho thời gian nhé.",
  record11:
    "Chuẩn rồi. Em bấm Ghi số liệu để lưu cặp quãng rơi và thời gian. Từ đó tính được gia tốc rơi tự do. Ghi xong hãy kéo cổng quang sang vị trí quãng đường khác để đo tiếp nhé.",
  ballBack:
    "Viên bi đã lăn tới cuối máng rồi. Em kéo bi trở lại nam châm ở đầu cao, hoặc bấm vào nam châm để giữ bi, để chuẩn bị cho lần đo sau nhé.",
  cylinderBack:
    "Trụ thép đã rơi hẳn xuống chân đế rồi. Em kéo trụ thép lên gắn trở lại vào nam châm điện ở đỉnh máng, khi nam châm hút giữ được thì mình đo lần tiếp theo nhé.",
  ready:
    "Mọi thứ sẵn sàng rồi. Em nhớ Reset đồng hồ rồi bấm nút đỏ trên nam châm để thả bi. Với mỗi câu trong đề, em kéo giá phải để chỉnh góc nghiêng và kéo cổng F để đổi khoảng cách cho đúng yêu cầu nhé.",
  readyInst:
    "Sẵn sàng đo vận tốc tức thời rồi. Em nhớ Reset đồng hồ rồi bấm nút đỏ trên nam châm để thả bi qua cổng quang. Phần này chỉ cần đổi góc nghiêng theo từng câu thôi, không phải chỉnh khoảng cách cổng đâu nhé.",
  ready11:
    "Sẵn sàng rồi. Em Reset đồng hồ rồi bấm vào hộp công tắc kép để ngắt nam châm cho trụ thép rơi tự do. Trước mỗi lần đo, kéo cổng quang dọc máng để đặt quãng rơi theo từng vị trí trong đề nhé.",
  doneAvg:
    "Tuyệt vời, em đã đo xong phần vận tốc trung bình. Bấm Xuất sang Note rồi sang trang báo cáo để xử lý số liệu và tính sai số nhé.",
  doneInst:
    "Hoàn thành phần vận tốc tức thời rồi. Em bấm Xuất sang Note để lập báo cáo và so sánh vận tốc ở các câu nhé.",
  done11:
    "Xuất sắc, em đã đo đủ các vị trí. Bấm Xuất sang Note rồi sang báo cáo để tính gia tốc trung bình và sai số, so với gia tốc chuẩn xem lệch bao nhiêu nhé.",
};

function applyGuidePersona(text, pronoun = "chị") {
  if (!text || pronoun !== "anh") return text;
  return text
    .replace(/(^|[\s"'([{])Chị(?=$|[\s,.!?;:)\]}])/g, "$1Anh")
    .replace(/(^|[\s"'([{])chị(?=$|[\s,.!?;:)\]}])/g, "$1anh");
}

/**
 * @param {object} s trạng thái thí nghiệm (UI-agnostic)
 *  { labId, lab, assembled, activeGroupNames, placedCount, requiredCount,
 *    balanced, power, wiredOK, modeOK, isReset, rolling,
 *    ballAtEnd, justMeasured, trialsCount, targetCount }
 */
export function guide(s = {}) {
  const inst = s.lab === "instant";
  const b11 = s.labId === "b11";
  const pronoun = s.assistantSettings?.pronoun === "anh" ? "anh" : "chị";
  const G = (id, text, tone) => ({ id, text: applyGuidePersona(text, pronoun), tone });

  if (s.trialsCount >= s.targetCount && s.targetCount > 0)
    return G("done", b11 ? LINES.done11 : inst ? LINES.doneInst : LINES.doneAvg, "done");

  if (!s.assembled) {
    if (s.placedCount === 0)
      return G("welcome", b11 ? LINES.welcome11 : inst ? LINES.welcomeInst : LINES.welcome6, "welcome");
    const next = (s.activeGroupNames || []).join(" / ");
    const cleanedNext = next.replace(/\+/g, "và").replace(/\//g, "hoặc");
    const left = Math.max(0, (s.requiredCount || 0) - (s.placedCount || 0));
    const hint = b11 ? LINES.assembleMid11 : LINES.assembleMid6;
    return G("assemble",
      `Em đã lắp được ${s.placedCount} trên tổng số ${s.requiredCount} dụng cụ. Giờ lắp tiếp: ${cleanedNext}. Kéo dụng cụ vào ô sáng có dấu cộng trên bàn, thả trúng là nó tự vào vị trí, còn ${left} món nữa thôi. ${hint}`,
      "nudge");
  }

  if (!s.balanced) return G("balance", LINES.plumb, "nudge");
  if (!s.power) return G("power", LINES.powerOff, "nudge");
  if (!s.wiredOK) return G("wire", b11 ? LINES.wireBad11 : LINES.wireBad, "nudge");
  if (!s.modeOK) return G("mode", b11 ? LINES.mode11 : inst ? LINES.modeInst : LINES.modeAvg, "nudge");
  if (s.justMeasured) return G("record", b11 ? LINES.record11 : inst ? LINES.recordInst : LINES.recordAvg, "success");
  if (s.ballAtEnd) return G("ballback", b11 ? LINES.cylinderBack : LINES.ballBack, "nudge");
  if (!s.isReset) return G("reset", LINES.reset, "nudge");

  // Sẵn sàng đo. Nếu đã đo được vài lần thì động viên đo tiếp cho đủ đề.
  const readyLine = b11 ? LINES.ready11 : inst ? LINES.readyInst : LINES.ready;
  if (s.trialsCount > 0 && s.targetCount > 0 && s.trialsCount < s.targetCount) {
    const left = s.targetCount - s.trialsCount;
    return G("ready",
      `Em đã ghi ${s.trialsCount}/${s.targetCount} lần đo rồi, cố thêm ${left} lần nữa cho đủ đề nhé! ${readyLine}`,
      "ok");
  }
  return G("ready", readyLine, "ok");
}

/* ============================================================================
   2) HỎI ĐÁP TỰ DO — gọi API /api/vnpt/chat của RealPhyLab, fallback FAQ cục bộ
   ========================================================================== */
export const smartbotReady = () => true; // luôn có API route; ask() tự fallback nếu lỗi

const FAQ = [
  { k: ["vận tốc tức thời", "tuc thoi", "instant"],
    a: "Vận tốc tức thời là vận tốc tại một thời điểm. Trong bài này ta lấy gần đúng: cho bi (đường kính d) che một cổng quang, đo thời gian che t rồi tính v = d / t." },
  { k: ["vận tốc trung bình", "trung binh", "average"],
    a: "Vận tốc trung bình trên đoạn giữa hai cổng E–F: v_tb = s_EF / t, với t là thời gian bi đi từ E đến F (chế độ A↔B)." },
  { k: ["a↔b", "a<->b", "che do do", "chế độ", "mode"],
    a: "Chọn A↔B để đo thời gian đi từ cổng A đến B (vận tốc trung bình); chọn A (hoặc B) để đo thời gian che một cổng (vận tốc tức thời); A+B đo tổng thời gian che hai cổng." },
  { k: ["gia tốc", "5/7", "lăn không trượt", "rolling"],
    a: "Bi đặc lăn không trượt trên máng nghiêng góc θ có gia tốc a = (5/7)·g·sinθ. Vận tốc tại quãng s tính từ điểm thả: v = √(2·a·s)." },
  { k: ["rơi tự do", "roi tu do", "g = 2s", "2s/t"],
    a: "Rơi tự do không vận tốc đầu: s = ½·g·t² ⇒ g = 2s / t². Đo quãng rơi s và thời gian t rồi tự tính g." },
  { k: ["reset", "trạng thái ban đầu"],
    a: "Nhấn nút Reset trên đồng hồ để đưa số đo về 0 trước mỗi lần thả bi, tránh cộng dồn số liệu lần trước." },
  { k: ["sai số", "±1", "error"],
    a: "Mỗi lần đo có sai số ngẫu nhiên ~±1%. Nên đo lặp nhiều lần và lấy trung bình để giảm sai số." },
  { k: ["dây dọi", "thẳng đứng", "cân bằng", "plumb"],
    a: "Dây dọi luôn chỉ phương thẳng đứng. Dùng nó để căn chỉnh độ nghiêng của máng; khi ổn thì siết vít cố định giá đỡ." },
  { k: ["thang đo", "9.999", "99.99"],
    a: "Đồng hồ MC964 có 2 thang: 9.999 s (ĐCNN 0.001 s) và 99.99 s (ĐCNN 0.01 s). Chọn thang phù hợp với khoảng thời gian cần đo." },
];

export function localAnswer(q) {
  const s = (q || "").toLowerCase();
  for (const item of FAQ) if (item.k.some((kw) => s.includes(kw))) return item.a;
  return "Mình hỗ trợ trong phạm vi bài thí nghiệm này. Bạn thử hỏi về: vận tốc tức thời / trung bình, rơi tự do, chế độ đo, gia tốc lăn không trượt, cách reset đồng hồ, hoặc sai số nhé.";
}

/**
 * ask(text, {onToken, assistantSettings, labContext}) — điểm vào chung cho ô hỏi đáp.
 * Ưu tiên API /api/vnpt/chat (VNPT Smartbot của RealPhyLab); lỗi → FAQ cục bộ.
 * Trả về { text, source: "smartbot" | "local" }.
 */
export async function ask(text, { onToken, signal, assistantSettings, labContext } = {}) {
  try {
    const res = await fetch("/api/vnpt/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: text }], assistantSettings, labContext }),
      signal,
    });
    if (!res.ok) throw new Error(`CHAT_HTTP_${res.status}`);
    const data = await res.json();
    const out = data.message || data.text || data.answer || "";
    if (out) {
      onToken?.(out);
      return { text: out, source: data.source || "smartbot", buttons: data.buttons || [] };
    }
    throw new Error("CHAT_EMPTY");
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    const a = localAnswer(text);
    onToken?.(a);
    return { text: a, source: "local" };
  }
}
