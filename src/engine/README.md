# `src/engine/` + `src/components/lab/` — Engine phòng thí nghiệm φLab

Tài liệu cho dev sau. Giải thích engine vật lý + phòng Lab tương tác đã **di cư** từ
bản Vite/JSX của φLab sang app Next.js này (RealPhyLab), thay cho engine `Bench.tsx` cũ.

## Ý tưởng di cư
- **Giữ nguyên UI shell của RealPhyLab** (login, sidebar, header, HomeScreen, ScanScreen,
  Prelab, Notes) — không đổi.
- **Thay riêng phần Engine + kéo-thả-nối-dây**: bỏ `components/Bench.tsx` cũ (auto-assemble,
  vật lý thô), dùng engine SVG kéo trực tiếp + vật lý thật port từ φLab.
- Engine viết bằng **JSX + inline-style + token màu riêng** (`tokens.js`), bọc `"use client"`.
  Không viết lại sang Tailwind để giữ đúng 1:1 giao diện đã tinh chỉnh. Shell vẫn dùng Tailwind.

## Cây thư mục
```
src/engine/                     ← lõi thuần JS, KHÔNG phụ thuộc UI
  tokens.js                     C (bảng màu) + FONT dùng cho engine
  physics.js                    Lab 6 (máng nghiêng): a = (5/7)·g·sinθ, nhiễu ±1%, computeTime()
  physicsFreeFall.js            Lab 11 (rơi tự do): s = ½gt² ⇒ g = 2s/t², computeFallTime()
  smartbot.js                   guide() rule-engine hướng dẫn theo bước + ask() → /api/vnpt/chat
  README.md                     (file này)

src/components/lab/             ← engine tương tác (SVG) + khung tích hợp
  LabRoom.tsx                   Bọc: chọn engine theo spec, cấp TTS, gom số liệu xuất Note
  LabBench.jsx                  Lab 6 — kéo dụng cụ, đổi góc, nối dây, thả bi, MC964
  FreeFallBench.jsx             Lab 11 — máng đứng, cổng quang trượt, công tắc kép, trụ thép rơi
  useTTS.ts                     Hook TTS: /api/vnpt/tts (VNPT SmartVoice) + fallback Web Speech

public/lab/bai6, public/lab/bai11   ← ảnh/SVG dụng cụ (engine tham chiếu bằng đường dẫn string)
```

## Luồng tích hợp (trong `src/app/page.tsx`)
1. HS chọn bài ở tab **Phòng Lab** (bộ chọn lab) hoặc quét/HomeScreen → `handleLessonSelect(id)`.
2. Prelab (giữ của RealPhyLab) chạy trước; Lab 6 lấy đường kính bi (mm) từ thước kẹp → `measuredD`.
3. `<LabRoom spec measuredD onExportNote onReplayPrelab />` render engine tương ứng:
   - `do-toc-do-vat-chuyen-dong` → `LabBench` (đổi mm↔m tự động).
   - `do-gia-toc-roi-tu-do` → `FreeFallBench`.
4. Trợ lý đọc chỉ dẫn qua `speak()` (TTS); hỏi đáp tự do qua `/api/vnpt/chat`.
5. HS bấm **Xuất sang Note** → `onExportNote({ lab, measuredD?, trials })` →
   `page.tsx` dựng `ExperimentReport` (đã tính g/v + nhận xét) → sang tab **Notes**.

## Thêm bài mới (bất biến kiến trúc)
- Thêm `ExperimentSpec` vào `experiments/specs.ts`.
- Nếu mô hình vật lý mới: thêm file trong `src/engine/` (kiểu `physics*.js`).
- Nếu cần scene tương tác riêng: thêm `*Bench.jsx` trong `components/lab/` và nối vào `LabRoom.tsx`.
- Đặt asset trong `public/lab/<bài>/` và tham chiếu bằng đường dẫn string.

## Hợp đồng dữ liệu (schema trial khi xuất Note)
- Lab 6:  `{ id, lab: "average"|"instant", theta, sEF|null, mode, t, v, balanced }`
- Lab 11: `{ id, lab: "freefall", s, t, g, balanced }`
`page.tsx#handleExportNote` quy đổi các trial này thành `measures: [{ s, t }]` để dựng báo cáo.

## ⚠️ Legacy — có thể dọn khi chắc chắn không còn dùng
Các file dưới đây phục vụ `Bench.tsx` cũ (đã **không** còn được `page.tsx` import). Giữ lại tạm
để không vỡ build nếu có chỗ khác tham chiếu; có thể xoá sau khi grep xác nhận:
- `src/components/Bench.tsx`, `src/components/DataBook.tsx`
- `src/components/dungcuthinghiem/*`, `src/instruments/*`
- `src/engine/physics/inclinedPlane.ts`, `src/engine/physics/freeFall.ts`
  (lưu ý: trùng tên cơ sở với `src/engine/physics.js` mới — engine mới KHÔNG dùng thư mục `physics/`)
