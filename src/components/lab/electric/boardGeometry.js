/**
 * boardGeometry.js — hình học THẬT của bảng lắp mạch 216 nút (lấy từ metadata toạ độ nút
 * trong public/lab/electric/circuit-board.svg): 6 cột × 4 hàng mạng, mỗi mạng 3 × 3 nút.
 * Mọi toạ độ ở đây là toạ độ cục bộ của ảnh bảng (994 × 684).
 */

export const BOARD_SIZE = { w: 994, h: 684 };
const BOARD_COLS = [[43, 140], [199.4, 296], [355.2, 452], [511.8, 609.2], [669.4, 767.8], [828.8, 928.6]];
const BOARD_ROWS = [[61, 154.6], [212.2, 307.2], [364.8, 460.8], [519.6, 617]];

/** Lưới nút toàn bảng: X = 0..17 (trái → phải), Y = 0..11 (trên → dưới). */
export const GRID = { cols: 18, rows: 12, moduleCols: 6, moduleRows: 4 };

/** Khung bao một mạng 9 nút (hàng, cột mạng). */
export function boardModuleRect(row, col, pad = 22) {
  const [x1, x2] = BOARD_COLS[col];
  const [y1, y2] = BOARD_ROWS[row];
  return { x: x1 - pad, y: y1 - pad, w: x2 - x1 + pad * 2, h: y2 - y1 + pad * 2 };
}

/** Toạ độ một nút (hàng/cột cục bộ 0..2) trong mạng (row, col). */
export function boardNode(row, col, localRow, localCol) {
  const [x1, x2] = BOARD_COLS[col];
  const [y1, y2] = BOARD_ROWS[row];
  return { x: x1 + ((x2 - x1) * localCol) / 2, y: y1 + ((y2 - y1) * localRow) / 2 };
}

/** Toạ độ nút (X, Y) của lưới toàn bảng. */
export const nodePos = (X, Y) => boardNode(Math.floor(Y / 3), Math.floor(X / 3), Y % 3, X % 3);

/** Chỉ số mạng (0..23, đánh theo hàng) chứa nút (X, Y). */
export const moduleOf = (X, Y) => Math.floor(Y / 3) * GRID.moduleCols + Math.floor(X / 3);

/** Hàng/cột mạng từ chỉ số mạng. */
export const moduleRC = (m) => ({ row: Math.floor(m / GRID.moduleCols), col: m % GRID.moduleCols });

/** Các nút (X, Y) của một mạng. */
export function moduleNodes(m) {
  const { row, col } = moduleRC(m);
  const out = [];
  for (let ly = 0; ly < 3; ly++) for (let lx = 0; lx < 3; lx++) out.push({ X: col * 3 + lx, Y: row * 3 + ly });
  return out;
}

/** Mạng chứa điểm (x, y) toạ độ bảng — null nếu ở khe giữa các mạng. */
export function moduleAtPoint(x, y, pad = 26) {
  for (let row = 0; row < GRID.moduleRows; row++) {
    for (let col = 0; col < GRID.moduleCols; col++) {
      const r = boardModuleRect(row, col, pad);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return row * GRID.moduleCols + col;
    }
  }
  return null;
}

/** Nút gần điểm (x, y) nhất (toạ độ bảng, có thể là số thập phân) — dùng để "hít" linh kiện. */
export function nearestNode(x, y) {
  let best = { X: 0, Y: 0, d: Infinity };
  for (let Y = 0; Y < GRID.rows; Y++) {
    for (let X = 0; X < GRID.cols; X++) {
      const p = nodePos(X, Y);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < best.d) best = { X, Y, d };
    }
  }
  return best;
}
