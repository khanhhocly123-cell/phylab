/**
 * password.ts — Băm và kiểm mật khẩu tài khoản PhyLab bằng PBKDF2-SHA256 (WebCrypto: chạy được cả trên
 * Cloudflare Workers lẫn Node, không cần thư viện).
 *
 * Chuỗi lưu trong DB: "pbkdf2-sha256$<số vòng lặp>$<salt base64>$<hash base64>". Ghi kèm số vòng lặp để
 * sau này tăng độ khó mà mật khẩu cũ vẫn kiểm được. Workers giới hạn PBKDF2 tối đa 100 000 vòng.
 *
 * File không import gì — test Node (scripts/test.mjs) nạp thẳng được.
 */

export const PASSWORD_ITERATIONS = 100_000;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(text: string): Uint8Array | null {
  try {
    const bin = atob(text);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** So sánh hai dãy byte mà thời gian không phụ thuộc vào vị trí khác nhau đầu tiên. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** So sánh hai chuỗi bí mật (vd mật khẩu trong biến môi trường) qua SHA-256 để độ dài không lộ ra. */
export async function secretEquals(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a.normalize("NFC"))),
    crypto.subtle.digest("SHA-256", encoder.encode(b.normalize("NFC"))),
  ]);
  return timingSafeEqual(new Uint8Array(da), new Uint8Array(db));
}

export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, saltText, hashText] = stored.split("$");
  const iterations = Number(iter);
  const salt = fromBase64(saltText ?? "");
  const expected = fromBase64(hashText ?? "");
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 1 || iterations > 100_000) return false;
  if (!salt || !expected || expected.length !== 32) return false;
  return timingSafeEqual(await derive(password, salt, iterations), expected);
}

/**
 * Băm giả: email chưa đăng ký vẫn chạy đủ PBKDF2 như khi sai mật khẩu, nên đo thời gian phản hồi
 * cũng không biết được email nào đã có tài khoản.
 */
export const DUMMY_PASSWORD_HASH = `pbkdf2-sha256$${PASSWORD_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

/** Lỗi của mật khẩu mới (null = dùng được). */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.`;
  if (password.length > PASSWORD_MAX) return `Mật khẩu dài tối đa ${PASSWORD_MAX} ký tự.`;
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Mật khẩu cần có cả chữ và số.";
  return null;
}

/** Mật khẩu tạm admin cấp cho học sinh quên mật khẩu: 10 ký tự dễ đọc (bỏ 0/O/1/l/I), luôn có chữ và số. */
export function temporaryPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const chars = Array.from(bytes, (b) => all[b % all.length]);
  chars[bytes[0] % 5] = letters[bytes[1] % letters.length];
  chars[5 + (bytes[2] % 5)] = digits[bytes[3] % digits.length];
  return chars.join("");
}
