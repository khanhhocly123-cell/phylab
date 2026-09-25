# `src/engine/` + `src/components/lab/` — Engine phòng thí nghiệm φLab

Tài liệu cho dev sau: engine vật lý và 4 bàn thí nghiệm tương tác. Engine ban đầu port từ bản
Vite/JSX của φLab sang app Next.js này (RealPhyLab), thay cho `Bench.tsx` cũ. Hướng dẫn thêm bài mới
đầy đủ ở `README.md` gốc (mục *Thêm bài thí nghiệm mới*).

## Nguyên tắc
- **Engine thuần** (`src/engine/`): không phụ thuộc React, test được bằng Node (`scripts/test.mjs`).
- **Bàn thí nghiệm** viết bằng JSX + inline-style + token màu riêng (`tokens.js`), bọc `"use client"`.
  Shell của app vẫn dùng Tailwind.
- **Số đo không bịa**: mọi số sinh từ mô hình vật lý + nhiễu `noise.js` (ổn định nhưng không trùng lặp).
  Sai lệch lớn chỉ đến từ thao tác sai, và bàn phải nói rõ nguyên nhân.
- **Dụng cụ là component SVG** (`lab/mech/`, `lab/electric/`), không dùng `filter` (làm tụt FPS khi có
  animation), bóng đổ bằng hình lệch bán trong suốt, id gradient từ `useId()`.

## Cây thư mục
```
src/engine/                     ← lõi thuần JS/TS, KHÔNG phụ thuộc UI
  tokens.js                     C (bảng màu) + FONT dùng cho bàn thí nghiệm
  noise.js                      gauss (cắt ±2,5σ), jitter, quantize — nhiễu đo dùng chung
  physics.js                    Bài 6: a = (5/7)·g·sinθ, rollRun(), computeTime(), ballDiameterMm()
  physicsFreeFall.js            Bài 11: s = ½gt², computeFallTime(), fitFreeFall()
  physicsElectric.ts            Bài 23: vật dẫn X/Y, sụt áp ampe kế, heatedResistance(), stepHeat()
  circuit.js                    solveDC() (điện thế nút) + makeUnionFind() — Bài 26
  smartbot.js                   guide() thoại hướng dẫn rule-based + ask() → /api/vnpt/chat

src/components/lab/
  LabHub.tsx                    Danh sách bài (đọc data/labCatalog.ts) + 3 chặng mỗi bài
  LabRoom.tsx                   Chọn bàn theo spec.id, cấp TTS, gom số liệu xuất Sổ Báo Cáo
  LabBench.jsx                  Bài 6 — máng nghiêng, 2 cổng quang, MC964, thả bi
  FreeFallBench.jsx             Bài 11 — máng đứng, nam châm điện, cổng quang trượt, trụ thép rơi
  ElectricalBench.jsx           Bài 23 — nguồn DC, 2 đồng hồ đa năng, vật dẫn X/Y, nhiệt
  EmfBench.jsx                  Bài 26 — bảng mạch 216 nút, dây nối tự do, đồ thị U–I
  LabChrome.jsx                 Khung chung: LabTopBar, NextStepCard, ChecklistCard, LabDialog,
                                LabToast (icon theo loại), NudgeSlider, style nút/thẻ dùng chung
  LiveGraph.jsx                 Đồ thị nhỏ trong Bài 6/11/23 + niceRange() (Sổ Báo Cáo dùng lại)
  animStore.js                  Store animation ngoài React (useSyncExternalStore) — tránh render lại cả bàn
  labSound.js                   Âm thanh thao tác
  useTTS.ts                     /api/vnpt/tts (VNPT SmartVoice) + fallback Web Speech
  mech/MechParts.jsx            Dụng cụ cơ học SVG: Rail6, Stand*6, Photogate6/11, Magnet6/11,
                                SteelBall, SteelCylinder, Plumb6/11, FallRail11, SwitchBox11,
                                MC964Face (dùng chung với Prelab), MechIcon (khay + bóng kéo)
  electric/ElectricParts.jsx    Đồng hồ đa năng (V, mA, µA, Ω — ohmDisplay), nguồn
  electric/BoardParts.jsx       Linh kiện cắm bảng: pin, khoá K, R₀, biến trở
  electric/boardGeometry.js     Toạ độ lưới 216 nút, moduleOf(), nodePos()
  electric/emfBoard.js          solveBoard() (gồm ôm kế), analyzeBoard() gợi ý chỗ nối tiếp theo
  electric/EmfGraph.jsx         Đồ thị U–I trực tiếp của Bài 26
```

## Luồng tích hợp (trong `src/app/page.tsx`)
1. HS chọn bài ở LabHub, Trang chủ hoặc màn Quét → `handleLessonSelect(id)`.
2. Prelab chạy trước (chặng 1, nhớ theo bài trong `localStorage.prelabPassed`); Bài 6 lấy đường kính bi
   (mm) từ thước kẹp → `measuredD`.
3. `<LabRoom spec measuredD studentName assignedSets onExportNote onReplayPrelab onExitLab />` render bàn
   tương ứng; `assignedSets` là đề giáo viên giao (nếu có) thay cho đề sinh theo tên.
4. Trợ lý đọc chỉ dẫn qua `speak()` (TTS).
5. HS bấm **Lưu vào Sổ Báo Cáo** → `onExportNote({ lab, measuredD?, trials })` → `page.tsx` dựng
   `ExperimentReport` → sang tab **Sổ Báo Cáo**.

## Hợp đồng dữ liệu (trial khi xuất sang Sổ Báo Cáo)
- Bài 6:  `{ id, lab: "average"|"instant", theta, sEF|null, mode, t, v, balanced }`
- Bài 11: `{ id, lab: "freefall", s, t, g, balanced }`
- Bài 23: `{ lab: "ohm-x"|"ohm-y", s: U, t: I, voltage, current, resistance, material, config: số trên núm nguồn, expected: R thật }`
- Bài 26: `{ lab: "emf", cell: "new"|"old", s: E từ đồ thị, t: 1, voltage, current, resistance, emf, internalR, config: R biến trở, expected: E thật }`

Bài điện vẫn điền `s`, `t` (và `balanced: true`) để các chỗ đọc trial kiểu cũ không vỡ; số liệu thật nằm
ở các trường riêng.
Loại trial mới phải thêm vào `RichTrial["lab"]` (`lib/types.ts`) và `LabKind` (`lib/grading.ts`).

## Hiệu năng
- Không dùng `filter` SVG trong cảnh có animation (Bài 26 từng tụt còn ~22 FPS vì `feDropShadow`).
- Tách cảnh thành các lớp `React.memo`; phần đổi liên tục (số LED, dây đang kéo, dòng điện chạy) để
  thành lớp riêng. Handler truyền xuống giữ ổn định qua ref cập nhật trong `useLayoutEffect`.
- Đo FPS bằng vòng `requestAnimationFrame` trong trình duyệt trước và sau khi sửa.

## Legacy — có thể dọn khi chắc chắn không còn dùng
Các file dưới đây không còn được import ở đâu (phần lớn từng phục vụ `Bench.tsx` cũ):
- `src/components/Bench.tsx`, `src/components/DataBook.tsx`, `src/components/HomeworkSection.tsx`
- `src/components/dungcuthinghiem/*`, `src/instruments/*`
- `src/engine/physics/inclinedPlane.ts`, `src/engine/physics/freeFall.ts`
  (trùng tên cơ sở với `src/engine/physics.js` — engine hiện tại KHÔNG dùng thư mục `physics/`)
