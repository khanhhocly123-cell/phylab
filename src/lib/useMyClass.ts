/**
 * useMyClass.ts — Hook client tải dữ liệu "Lớp của tôi" của học sinh.
 *
 * Dùng ở page.tsx (để biết có đề Lab giáo viên giao → override đề seeded)
 * và MyClassTab (hiển thị lớp + bài tập). refresh() gọi lại sau khi join/nộp bài.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { MyClassData } from "./classTypes";
import { getStudentId } from "./activity";

export interface UseMyClassResult {
  myClass: MyClassData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useMyClass(enabled: boolean): UseMyClassResult {
  const [myClass, setMyClass] = useState<MyClassData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const studentId = getStudentId();
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/class/my?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      setMyClass(res.ok ? (data.myClass ?? null) : null);
    } catch {
      // Offline/lỗi mạng: giữ dữ liệu cũ, không phá UX.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    // Data-fetch khi mount — setState chạy trong callback async, không sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { myClass, loading, refresh };
}
