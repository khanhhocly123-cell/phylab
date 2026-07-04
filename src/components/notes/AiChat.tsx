"use client";

import React, { useRef, useState, useEffect } from "react";
import { Sparkles, Send } from "lucide-react";
import { MathText } from "../Latex";

interface Msg { role: "user" | "ai"; text: string; source?: string }

/**
 * AiChat — ô hỏi đáp AI (Trợ lý Phylab / VNPT SmartBot) để hỏi bài.
 * Gọi /api/vnpt/chat (task chat). Dùng trong Notes.
 */
export default function AiChat({ lessonTitle }: { lessonTitle?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: `Chào em! Anh là Trợ lý Phylab. Em hỏi anh bất cứ điều gì về ${lessonTitle || "bài thực hành"} nhé — công thức, cách đo, cách tính sai số…`, source: "local" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/vnpt/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "ai", text: data.message || "Anh chưa trả lời được, em thử lại nhé.", source: data.source }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Mất kết nối tới trợ lý. Em thử lại sau nhé.", source: "local" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2DFD8] rounded-2xl flex flex-col h-[420px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E2DFD8]">
        <div className="w-7 h-7 rounded-lg bg-[#C85A17] text-white grid place-items-center font-black">φ</div>
        <div className="flex-1">
          <p className="text-xs font-black text-[#321E12]">Hỏi Trợ lý AI</p>
          <p className="text-[9px] font-bold text-[#605248]/70">Hỏi bài về thí nghiệm &amp; lý thuyết</p>
        </div>
        <Sparkles className="w-4 h-4 text-[#C85A17]" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] font-semibold leading-relaxed ${
              m.role === "user"
                ? "bg-[#C85A17] text-white rounded-br-sm"
                : "bg-[#FAF6F0] text-[#321E12] border border-[#E2DFD8] rounded-bl-sm"
            }`}>
              <MathText text={m.text} />
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-[#FAF6F0] border border-[#E2DFD8] px-3 py-2 rounded-2xl rounded-bl-sm text-[11px] text-[#605248] font-bold">
              Trợ lý đang trả lời…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 p-3 border-t border-[#E2DFD8]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          className="flex-1 min-w-0 border border-[#E2DFD8] focus:border-[#C85A17] outline-none rounded-xl px-3 py-2 text-xs font-semibold text-[#321E12]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-3.5 py-2 bg-[#C85A17] disabled:opacity-40 text-white rounded-xl cursor-pointer flex items-center gap-1 text-xs font-black"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
