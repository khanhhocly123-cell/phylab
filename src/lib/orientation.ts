/**
 * orientation.ts — Tự xoay ngang khi vào Phòng Lab trên điện thoại.
 *
 * Trình duyệt chỉ cho khoá hướng màn hình khi đang toàn màn hình (Android Chrome) và phải gọi ngay trong
 * thao tác bấm của người dùng. iPhone (Safari) không hỗ trợ khoá hướng → LabRoom hiện màn nhắc xoay ngang.
 */

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

const orientationApi = () => (typeof screen !== "undefined" ? (screen.orientation as LockableOrientation | undefined) : undefined);

/** Điện thoại: màn hình cảm ứng, cạnh ngắn dưới 600 px. */
export function isPhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return coarse && Math.min(window.screen.width, window.screen.height) < 600;
}

export function isPortraitNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches;
}

/** Khoá được hướng ngang không (cần API toàn màn hình + screen.orientation.lock). */
export function canLockLandscape(): boolean {
  if (typeof document === "undefined") return false;
  const api = orientationApi();
  return Boolean(document.fullscreenEnabled && api && typeof api.lock === "function");
}

/** Vào toàn màn hình rồi khoá ngang. Gọi trong sự kiện bấm; trả về true nếu khoá được. */
export async function enterLandscape(): Promise<boolean> {
  if (!isPhoneDevice() || !canLockLandscape()) return false;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    await orientationApi()!.lock!("landscape");
    return true;
  } catch {
    return false;
  }
}

/** Trả lại hướng tự do và thoát toàn màn hình (khi rời Phòng Lab). */
export function leaveLandscape(): void {
  try {
    orientationApi()?.unlock?.();
  } catch {
    // Trình duyệt không hỗ trợ — bỏ qua.
  }
  if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

/** Theo dõi xoay máy / đổi cỡ (dùng với useSyncExternalStore). */
export function subscribeOrientation(callback: () => void): () => void {
  const mq = window.matchMedia("(orientation: portrait)");
  mq.addEventListener("change", callback);
  window.addEventListener("resize", callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
}
