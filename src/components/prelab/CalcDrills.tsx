"use client";

import { Check, CircleHelp, TriangleAlert } from "lucide-react";
import Latex, { MathText } from "../Latex";
import { diagnose, isCorrect, parseNumber, type CalcQuestion } from "./calcDrillData";

export interface QuestionState {
  values: Record<string, string>;
  status: "idle" | "ok" | "wrong";
  tries: number;
  /** Nhận xét cho từng ô sai. */
  notes: Record<string, string>;
  reveal: boolean;
}
export type DrillState = Record<string, QuestionState>;

const EMPTY: QuestionState = { values: {}, status: "idle", tries: 0, notes: {}, reveal: false };

export const drillsDone = (drills: CalcQuestion[], state: DrillState) => drills.every((q) => state[q.id]?.status === "ok");

/**
 * CalcDrills — các phép tính gốc của bài (Prelab điện). Mỗi câu một thẻ: công thức, đề, ô nhập có
 * đơn vị, nút Kiểm tra. Sai thì chỉ đúng lỗi hay gặp; sai 2 lần thì cho xem lời giải.
 */
export default function CalcDrills({ drills, state, onChange }: { drills: CalcQuestion[]; state: DrillState; onChange: (next: DrillState) => void }) {
  const update = (id: string, patch: Partial<QuestionState>) => onChange({ ...state, [id]: { ...EMPTY, ...state[id], ...patch } });

  const check = (q: CalcQuestion) => {
    const s = state[q.id] ?? EMPTY;
    const notes: Record<string, string> = {};
    let allOk = true;
    for (const f of q.fields) {
      const value = parseNumber(s.values[f.key] ?? "");
      if (!isCorrect(f, value)) {
        allOk = false;
        notes[f.key] = diagnose(q, f, value);
      }
    }
    update(q.id, allOk ? { status: "ok", notes: {} } : { status: "wrong", notes, tries: s.tries + 1 });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3 items-start">
      {drills.map((q, index) => {
        const s = state[q.id] ?? EMPTY;
        const ok = s.status === "ok";
        const filled = q.fields.some((f) => (s.values[f.key] ?? "").trim());
        return (
          <section key={q.id} className={`rounded-2xl border bg-white p-3.5 flex flex-col gap-2.5 ${ok ? "border-emerald-300" : "border-[#E6DCC8]"}`}>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-lg grid place-items-center text-[11px] font-black text-white flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-[#C85A17]"}`}>
                {ok ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <h4 className="text-[13px] font-black text-[#321E12] leading-tight">{q.title}</h4>
            </div>
            <div className="rounded-xl bg-[#FFF6EC] border border-[#F2DFC6] px-2 py-1.5 text-center text-[13px] text-[#3E2718] overflow-x-auto">
              <Latex math={q.formula} />
            </div>
            <p className="text-[12px] font-semibold text-[#4A3A2E] leading-relaxed"><MathText text={q.prompt} /></p>
            <div className="flex flex-col gap-1.5">
              {q.fields.map((f) => {
                const wrong = s.status === "wrong" && Boolean(s.notes[f.key]);
                return (
                  <label key={f.key} className="flex items-center gap-2">
                    <span className="w-6 text-right text-[13px] font-black italic text-[#3E2718]">{f.label}</span>
                    <span className="text-[13px] font-black text-[#3E2718]">=</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      readOnly={ok}
                      value={s.values[f.key] ?? ""}
                      onChange={(event) => update(q.id, { values: { ...s.values, [f.key]: event.target.value }, status: s.status === "wrong" ? "idle" : s.status })}
                      onKeyDown={(event) => { if (event.key === "Enter") check(q); }}
                      aria-label={`${q.title}: ${f.label} (${f.unit})`}
                      className={`min-w-0 flex-1 h-9 rounded-xl border px-2.5 text-[13px] font-black tabular-nums text-[#321E12] outline-none transition-colors ${
                        ok ? "border-emerald-300 bg-emerald-50" : wrong ? "border-amber-400 bg-amber-50" : "border-[#E2DFD8] bg-white focus:border-[#C85A17]"
                      }`}
                    />
                    <span className="w-7 text-[12px] font-black text-[#8C7B6B]">{f.unit}</span>
                  </label>
                );
              })}
            </div>
            {!ok && (
              <button
                type="button"
                onClick={() => check(q)}
                disabled={!filled}
                className="h-9 rounded-xl bg-[#C85A17] hover:bg-[#B24A0C] disabled:bg-[#EDE7DF] disabled:text-[#9A8F84] disabled:cursor-not-allowed text-white text-[12px] font-black cursor-pointer transition-colors"
              >
                Kiểm tra
              </button>
            )}
            {ok && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[12px] font-semibold text-emerald-900 leading-relaxed">
                <b className="text-emerald-700">Chính xác.</b> <MathText text={q.solution} />
              </div>
            )}
            {s.status === "wrong" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] font-semibold text-amber-950 leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    {q.fields.filter((f) => s.notes[f.key]).map((f) => (
                      <p key={f.key}>{q.fields.length > 1 ? <b>{f.label}: </b> : null}{s.notes[f.key]}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!ok && s.tries >= 2 && (
              s.reveal ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] font-semibold text-slate-700 leading-relaxed">
                  <b>Lời giải:</b> <MathText text={q.solution} />
                </div>
              ) : (
                <button type="button" onClick={() => update(q.id, { reveal: true })} className="self-start inline-flex items-center gap-1 text-[11.5px] font-black text-[#C85A17] hover:underline cursor-pointer">
                  <CircleHelp className="w-3.5 h-3.5" /> Xem lời giải
                </button>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}
