/**
 * circuit.js — Giải mạch điện một chiều bằng phương pháp điện thế nút.
 *
 * Mọi linh kiện quy về ĐIỆN DẪN g = 1/R giữa hai nút, còn nguồn quy về NGUỒN DÒNG
 * (mô hình Norton): pin (E, r) = nguồn dòng E/r song song điện dẫn 1/r. Nhờ vậy học sinh
 * mắc mạch kiểu gì thì số đo cũng ra đúng như ngoài đời — kể cả khi mắc sai.
 *
 * Nút `ground` giữ 0 V; mỗi nút có thêm điện dẫn rất nhỏ xuống đất để nút "lơ lửng"
 * (chưa nối vào đâu) không làm ma trận suy biến.
 */

/**
 * @param {{
 *   nodeCount: number,
 *   conductances: Array<{ a: number, b: number, g: number }>,
 *   sources?: Array<{ from: number, to: number, i: number }>,  // dòng i chảy qua nguồn từ `from` sang `to`
 *   ground?: number,
 *   gmin?: number,
 * }} circuit
 * @returns {Float64Array} điện thế từng nút (V)
 */
export function solveDC({ nodeCount, conductances, sources = [], ground = 0, gmin = 1e-9 }) {
  const n = nodeCount;
  const G = Array.from({ length: n }, () => new Float64Array(n));
  const J = new Float64Array(n);
  for (let k = 0; k < n; k++) G[k][k] += gmin;
  for (const { a, b, g } of conductances) {
    if (a === b || !(g > 0)) continue;
    G[a][a] += g; G[b][b] += g;
    G[a][b] -= g; G[b][a] -= g;
  }
  for (const { from, to, i } of sources) {
    J[to] += i;
    J[from] -= i;
  }
  // Nút gốc: thay phương trình bằng V[ground] = 0.
  G[ground].fill(0);
  G[ground][ground] = 1;
  J[ground] = 0;

  // Khử Gauss có chọn phần tử trội.
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(G[row][col]) > Math.abs(G[pivot][col])) pivot = row;
    if (Math.abs(G[pivot][col]) < 1e-18) continue;
    if (pivot !== col) {
      [G[pivot], G[col]] = [G[col], G[pivot]];
      [J[pivot], J[col]] = [J[col], J[pivot]];
    }
    for (let row = col + 1; row < n; row++) {
      const f = G[row][col] / G[col][col];
      if (!f) continue;
      for (let k = col; k < n; k++) G[row][k] -= f * G[col][k];
      J[row] -= f * J[col];
    }
  }
  const V = new Float64Array(n);
  for (let row = n - 1; row >= 0; row--) {
    let sum = J[row];
    for (let k = row + 1; k < n; k++) sum -= G[row][k] * V[k];
    V[row] = Math.abs(G[row][row]) < 1e-18 ? 0 : sum / G[row][row];
  }
  return V;
}

/** Hợp nhất tập (union–find) — gom các nút nối với nhau bằng dây/mạng thành một "nút điện". */
export function makeUnionFind(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  return { find, union };
}
