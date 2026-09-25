/**
 * calcDrillData.ts — Các phép tính gốc học sinh phải làm đúng trước khi vào Phòng Lab điện.
 * Mỗi câu có đáp số, dung sai, và các lỗi hay gặp (quên đổi mA → A, đảo công thức…) để
 * nhận xét trúng chỗ sai thay vì chỉ báo "sai". Số liệu cố ý khác sơ đồ mạch và khác Lab
 * để không lộ kết quả đo.
 */

export interface CalcField {
  key: string;
  /** Kí hiệu trước ô nhập, vd "I", "R", "E". */
  label: string;
  unit: string;
  answer: number;
  /** Dung sai tương đối (mặc định 1,5%). */
  tol?: number;
}

export interface CalcMistake {
  field: string;
  value: number;
  hint: string;
}

export interface CalcQuestion {
  id: string;
  title: string;
  /** Công thức gốc (LaTeX, không kèm $). */
  formula: string;
  /** Đề bài (MathText: $...$ và **đậm**). */
  prompt: string;
  fields: CalcField[];
  mistakes: CalcMistake[];
  /** Gợi ý chung khi sai mà không khớp lỗi quen thuộc nào. */
  hint: string;
  /** Lời giải (MathText). */
  solution: string;
}

export const CALC_DRILLS: Record<"ohm" | "emf", CalcQuestion[]> = {
  ohm: [
    {
      id: "ohm-i",
      title: "Định luật Ohm",
      formula: "I = \\dfrac{U}{R}",
      prompt: "Đặt hiệu điện thế $U = 4{,}5\\ \\text{V}$ vào hai đầu vật dẫn có $R = 180\\ \\Omega$. Ampe kế chỉ bao nhiêu?",
      fields: [{ key: "I", label: "I", unit: "mA", answer: 25 }],
      mistakes: [
        { field: "I", value: 0.025, hint: "Em đang để đơn vị ampe. Đổi sang mA: nhân với 1000." },
        { field: "I", value: 810, hint: "Đó là tích U·R. Định luật Ohm: I = U/R." },
        { field: "I", value: 40, hint: "Em lấy R/U rồi. Định luật Ohm: I = U/R." },
      ],
      hint: "Chia U cho R được I (đơn vị A), rồi đổi ra mA: 1 A = 1000 mA.",
      solution: "$I = \\dfrac{U}{R} = \\dfrac{4{,}5}{180} = 0{,}025\\ \\text{A} = 25\\ \\text{mA}$",
    },
    {
      id: "ohm-r",
      title: "Tính R từ số đo",
      formula: "R = \\dfrac{U}{I}",
      prompt: "Vôn kế chỉ $4{,}50\\ \\text{V}$, ampe kế chỉ $18{,}0\\ \\text{mA}$. Điện trở của vật dẫn bằng bao nhiêu?",
      fields: [{ key: "R", label: "R", unit: "Ω", answer: 250 }],
      mistakes: [
        { field: "R", value: 0.25, hint: "Em chưa đổi 18,0 mA = 0,0180 A trước khi chia." },
        { field: "R", value: 81, hint: "Đó là tích U·I. Điện trở R = U/I." },
        { field: "R", value: 4, hint: "Em lấy I/U rồi. Điện trở R = U/I." },
        { field: "R", value: 0.004, hint: "Em lấy I/U rồi. Điện trở R = U/I." },
      ],
      hint: "R = U/I, nhớ đổi I ra ampe (1 mA = 0,001 A).",
      solution: "$R = \\dfrac{U}{I} = \\dfrac{4{,}50}{0{,}0180} = 250\\ \\Omega$",
    },
    {
      id: "ohm-graph",
      title: "Đọc đồ thị I–U",
      formula: "k = \\dfrac{I}{U} = \\dfrac{1}{R}",
      prompt: "Đồ thị I–U của một vật dẫn là đường thẳng đi qua gốc toạ độ và điểm $(8{,}0\\ \\text{V};\\ 50\\ \\text{mA})$. Điện trở của vật dẫn là bao nhiêu?",
      fields: [{ key: "R", label: "R", unit: "Ω", answer: 160 }],
      mistakes: [
        { field: "R", value: 6.25, hint: "6,25 là hệ số góc k = I/U (tính theo mA/V). Điện trở R = 1/k, nhớ đổi mA ra A." },
        { field: "R", value: 0.00625, hint: "0,00625 A/V là hệ số góc k. Điện trở R = 1/k." },
        { field: "R", value: 0.16, hint: "Đổi 50 mA = 0,050 A rồi mới chia." },
      ],
      hint: "Đường I–U đi qua gốc toạ độ có hệ số góc k = I/U = 1/R.",
      solution: "$k = \\dfrac{0{,}050}{8{,}0} = 0{,}00625\\ \\text{A/V} \\Rightarrow R = \\dfrac{1}{k} = 160\\ \\Omega$",
    },
  ],
  emf: [
    {
      id: "emf-i",
      title: "Dòng điện trong mạch",
      formula: "I = \\dfrac{\\mathcal{E}}{R + R_0 + r}",
      prompt: "Pin có $\\mathcal{E} = 1{,}50\\ \\text{V}$, $r = 0{,}50\\ \\Omega$, mắc nối tiếp với $R_0 = 10\\ \\Omega$ và biến trở đặt ở $R = 14{,}5\\ \\Omega$. Ampe kế (lí tưởng) chỉ bao nhiêu?",
      fields: [{ key: "I", label: "I", unit: "mA", answer: 60 }],
      mistakes: [
        { field: "I", value: 0.06, hint: "Em đang để đơn vị ampe. Đổi sang mA: nhân với 1000." },
        { field: "I", value: 142.9, hint: "Em quên biến trở R — dòng điện đi qua cả R, R₀ và r." },
        { field: "I", value: 103.4, hint: "Mạch nối tiếp: phải cộng cả R₀ và r vào điện trở toàn mạch." },
        { field: "I", value: 61.2, hint: "Nhớ cộng cả điện trở trong r của pin." },
        { field: "I", value: 100, hint: "Em quên điện trở bảo vệ R₀ — dòng điện đi qua cả R, R₀ và r." },
      ],
      hint: "Định luật Ohm cho toàn mạch: I = E / (R + R₀ + r), rồi đổi ra mA.",
      solution: "$I = \\dfrac{1{,}50}{14{,}5 + 10 + 0{,}50} = \\dfrac{1{,}50}{25} = 0{,}060\\ \\text{A} = 60\\ \\text{mA}$",
    },
    {
      id: "emf-u",
      title: "Số chỉ vôn kế",
      formula: "U = \\mathcal{E} - I\\,r",
      prompt: "Vôn kế mắc giữa hai cực của pin ở câu 1. Khi ampe kế chỉ $60\\ \\text{mA}$, vôn kế chỉ bao nhiêu?",
      fields: [{ key: "U", label: "U", unit: "V", answer: 1.47, tol: 0.004 }],
      mistakes: [
        { field: "U", value: 1.5, hint: "1,50 V là suất điện động — chỉ đo được khi mạch hở. Có dòng điện thì U = E − I·r." },
        { field: "U", value: 0.87, hint: "Vôn kế ở hai cực pin nên chỉ trừ phần sụt áp trên r, không trừ R₀." },
        { field: "U", value: 1.53, hint: "Dấu trừ: pin đang phát điện nên U = E − I·r nhỏ hơn E." },
        { field: "U", value: 1.44, hint: "Em lấy r = 1 Ω? Pin ở câu 1 có r = 0,50 Ω." },
      ],
      hint: "U = E − I·r, nhớ đổi I ra ampe.",
      solution: "$U = 1{,}50 - 0{,}060 \\cdot 0{,}50 = 1{,}47\\ \\text{V}$",
    },
    {
      id: "emf-er",
      title: "Tìm E và r từ hai lần đo",
      formula: "r = -\\dfrac{U_2 - U_1}{I_2 - I_1}",
      prompt: "Hai lần đo: $I_1 = 20\\ \\text{mA}$, $U_1 = 1{,}46\\ \\text{V}$; $I_2 = 60\\ \\text{mA}$, $U_2 = 1{,}38\\ \\text{V}$. Tính điện trở trong và suất điện động của pin.",
      fields: [
        { key: "r", label: "r", unit: "Ω", answer: 2, tol: 0.02 },
        { key: "E", label: "E", unit: "V", answer: 1.5, tol: 0.004 },
      ],
      mistakes: [
        { field: "r", value: 0.002, hint: "Đổi mA ra A trước khi chia: ΔI = 0,040 A." },
        { field: "r", value: -2, hint: "Lấy độ lớn: U giảm khi I tăng nên r = −ΔU/ΔI là số dương." },
        { field: "E", value: 1.42, hint: "Suất điện động E = U + I·r (cộng lại phần sụt áp trên r)." },
        { field: "E", value: 1.46, hint: "Đó là U₁. Cộng thêm I₁·r mới ra E." },
        { field: "E", value: 1.26, hint: "Đó là U₂ − I₂·r. Suất điện động E = U + I·r." },
      ],
      hint: "Hai điểm cùng nằm trên đường U = E − I·r: tính r từ độ dốc, rồi E = U₁ + I₁·r.",
      solution: "$r = -\\dfrac{1{,}38 - 1{,}46}{0{,}060 - 0{,}020} = 2{,}0\\ \\Omega$; $\\ \\mathcal{E} = 1{,}46 + 0{,}020 \\cdot 2{,}0 = 1{,}50\\ \\text{V}$",
    },
  ],
};

/** Đọc số kiểu Việt Nam: "1,45" hay "1.45", bỏ khoảng trắng và đơn vị gõ kèm. */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(/\s+/g, "").replace(/[^\d,.\-−]/g, "").replace("−", "-").replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const near = (value: number, target: number, tol: number) => Math.abs(value - target) <= Math.max(Math.abs(target) * tol, 1e-9);

export function isCorrect(field: CalcField, value: number | null): boolean {
  return value !== null && near(value, field.answer, field.tol ?? 0.015);
}

/** Nhận xét cho một ô sai: trúng lỗi quen thuộc thì nói đúng lỗi đó, không thì gợi ý chung. */
export function diagnose(question: CalcQuestion, field: CalcField, value: number | null): string {
  if (value === null) return "Em chưa nhập số (dùng dấu phẩy hoặc dấu chấm đều được).";
  const hit = question.mistakes.find((m) => m.field === field.key && near(value, m.value, 0.02));
  return hit ? hit.hint : question.hint;
}
