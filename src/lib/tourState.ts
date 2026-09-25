/**
 * tourState.ts — Nhớ ai đã xem hướng dẫn nào / đã có huy hiệu gì (theo từng người dùng trên thiết
 * bị), để lần đầu vào app, vào Phòng Lab thì tự mở hướng dẫn, những lần sau thì không. Hỏng
 * localStorage (chế độ ẩn danh…) cũng không sao: hướng dẫn chỉ hiện lại, không làm hỏng app.
 */

/** Nhóm dụng cụ an toàn theo chủ đề bài (xem SafetyDeck.safetyKindOf). */
export type SafetyKind = "mech" | "elec" | "optic" | "heat";
export type TourId = "app" | "lab" | "notes" | "teacher" | "badge-safety";

const KEY = "phylab.tours.v1";
const EVENT = "phylab:tours";

type Store = Record<string, Partial<Record<TourId, number>>>;

const userKey = (user: string | null | undefined) => (user || "_").trim().toLowerCase();

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

export function hasSeenTour(user: string | null | undefined, id: TourId): boolean {
  return Boolean(read()[userKey(user)]?.[id]);
}

export function markTourSeen(user: string | null | undefined, ...ids: TourId[]): void {
  try {
    const store = read();
    const key = userKey(user);
    const entry = { ...(store[key] ?? {}) };
    for (const id of ids) entry[id] = Date.now();
    store[key] = entry;
    localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Không lưu được thì thôi — lần sau hướng dẫn hiện lại.
  }
}

/** Các mốc đã xem của một người, dạng chuỗi JSON (ổn định cho useSyncExternalStore) — để đồng bộ tài khoản. */
export function tourEntryJson(user: string | null | undefined): string {
  return JSON.stringify(read()[userKey(user)] ?? {});
}

/** Ghi đè các mốc của một người bằng bản đã gộp với tài khoản (lib/cloudSync.ts). */
export function setTourEntry(user: string | null | undefined, entry: Partial<Record<TourId, number>>): void {
  try {
    const store = read();
    store[userKey(user)] = { ...entry };
    localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Không lưu được thì thôi — tài khoản vẫn giữ bản đồng bộ.
  }
}

/** Đang có hướng dẫn nào mở không — mỗi lúc chỉ một tour (tour trang và tour bàn thí nghiệm không chồng nhau). */
export function isTourOpen(): boolean {
  return typeof document !== "undefined" && document.querySelector("[data-guided-tour]") !== null;
}

/** Theo dõi thay đổi (cùng tab qua sự kiện riêng, tab khác qua "storage") — dùng với useSyncExternalStore. */
export function subscribeTours(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
