"use client";

import { useCallback, useRef, useState } from "react";

export interface TTSController {
  /** Đọc một câu chỉ dẫn (no-op nếu đang tắt tiếng). */
  speak: (text: string) => void;
  /** Dừng ngay mọi âm đang phát (dùng khi rời lab / unmount). */
  stop: () => void;
  /** Có đang tắt tiếng trợ lý không. */
  muted: boolean;
  /** Bật/tắt tiếng trợ lý. Khi tắt sẽ dừng luôn âm đang phát. */
  toggleMute: () => void;
}

/**
 * useTTS — Đọc chỉ dẫn trợ lý CHỈ bằng giọng VNPT SmartVoice (/api/vnpt/tts).
 *
 * KHÔNG dùng Web Speech Synthesis của trình duyệt: giọng máy đó là nguồn gây
 * hiện tượng "tiếng rè/méo lạ" khi lẫn với giọng VNPT — nếu VNPT lỗi/không có
 * audio, im lặng (không đọc) thay vì phát giọng máy.
 *
 * Mỗi lần speak() được gọi: abort request cũ (AbortController), dừng audio cũ,
 * rồi mới fetch mới — tránh race condition 2 audio chạy song song (hiện tượng
 * giọng chồng khi tip.text đổi nhanh liên tiếp).
 */
export function useTTS(): TTSController {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAbortRef = useRef<AbortController | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const stop = useCallback(() => {
    // Huỷ fetch đang chờ response
    if (pendingAbortRef.current) {
      pendingAbortRef.current.abort();
      pendingAbortRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = "";
      activeAudioRef.current = null;
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text || mutedRef.current) return;

    // Dừng/huỷ tất cả âm/fetch đang chạy TRƯỚC khi bắt đầu cái mới
    stop();

    // Tạo AbortController mới cho lần fetch này
    const abortCtrl = new AbortController();
    pendingAbortRef.current = abortCtrl;

    try {
      const res = await fetch("/api/vnpt/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abortCtrl.signal,
      });

      // Kiểm tra lại sau await (người dùng có thể đã tắt tiếng hoặc speak() khác đã cancel)
      if (abortCtrl.signal.aborted || mutedRef.current) return;

      if (!res.ok) return; // im lặng — không rơi về giọng máy

      const data = await res.json();
      if (abortCtrl.signal.aborted || mutedRef.current) return;
      if (!data.audioLink) return; // VNPT không cấu hình/lỗi -> im lặng

      const audio = new Audio(data.audioLink);
      activeAudioRef.current = audio;
      audio.onended = () => {
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
      };
      audio.onerror = () => {
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // bình thường — bị cancel chủ động
      // Lỗi mạng/khác -> im lặng, không rơi về giọng máy
    } finally {
      if (pendingAbortRef.current === abortCtrl) {
        pendingAbortRef.current = null;
      }
    }
  }, [stop]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      if (next) stop();
      return next;
    });
  }, [stop]);

  return { speak, stop, muted, toggleMute };
}
