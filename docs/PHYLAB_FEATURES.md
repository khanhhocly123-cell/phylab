# PhyLab — Tài liệu tính năng toàn diện

> **PhyLab** (Phylab) — Phòng thí nghiệm Vật lí ảo tương tác cho học sinh THPT Việt Nam.
> Web app Next.js 16 dự thi **Vietnamese Student HackAIthon**, tích hợp trọn bộ AI của **VNPT**
> (SmartBot, SmartReader OCR, eKYC, SmartVoice TTS). Hiện có **2 bài thực hành** Vật lí 10 (SGK
> Kết nối tri thức): **Bài 6 — Đo tốc độ** và **Bài 11 — Đo gia tốc rơi tự do**.
>
> Tài liệu này mô tả CHI TIẾT mọi tính năng, kiến trúc và ràng buộc của dự án. Cập nhật 2026-07-20.
>
> **Mới (2026-07-20):** đã triển khai **tính năng Lớp học cho giáo viên** (mục 20) — tạo lớp bằng mã
> tham gia, giao bài Lab với đề tự đặt, quiz form Bộ GD 2025, quiz chống gian lận, dashboard theo dõi
> HS, heatmap lỗi sai, xuất bảng điểm CSV. Kế hoạch **3 bài lab mới** ở mục 21.

---

## Mục lục

1. [Tổng quan & triết lý thiết kế](#1-tổng-quan--triết-lý-thiết-kế)
2. [Công nghệ & kiến trúc](#2-công-nghệ--kiến-trúc)
3. [Xác thực & đăng nhập (3 phương thức)](#3-xác-thực--đăng-nhập)
4. [Điều hướng & bố cục ứng dụng](#4-điều-hướng--bố-cục-ứng-dụng)
5. [Trang chủ (Home)](#5-trang-chủ-home)
6. [Quét tài liệu SGK (OCR)](#6-quét-tài-liệu-sgk-ocr)
7. [Prelab — làm quen dụng cụ](#7-prelab--làm-quen-dụng-cụ)
8. [Phòng Lab — bàn thí nghiệm tương tác](#8-phòng-lab--bàn-thí-nghiệm-tương-tác)
9. [Lõi vật lý (physics engine)](#9-lõi-vật-lý-physics-engine)
10. [Notes — chấm điểm, đồ thị, báo cáo, ôn tập](#10-notes--chấm-điểm-đồ-thị-báo-cáo-ôn-tập)
11. [Hệ thống chấm điểm deterministic](#11-hệ-thống-chấm-điểm-deterministic)
12. [Trợ lý AI (VNPT SmartBot) & RAG](#12-trợ-lý-ai-vnpt-smartbot--rag)
13. [Ra đề theo từng học sinh](#13-ra-đề-theo-từng-học-sinh)
14. [Text-to-Speech (SmartVoice)](#14-text-to-speech-smartvoice)
15. [Hiển thị công thức & định dạng chữ](#15-hiển-thị-công-thức--định-dạng-chữ)
16. [Bảo mật thông tin](#16-bảo-mật-thông-tin)
17. [Bản đồ mã nguồn](#17-bản-đồ-mã-nguồn)
18. [Kiểm thử](#18-kiểm-thử)
19. [Biến môi trường](#19-biến-môi-trường)
20. [Tính năng Lớp học — Giáo viên ↔ Học sinh](#20-tính-năng-lớp-học--giáo-viên--học-sinh)
21. [Định hướng phát triển tiếp theo](#21-định-hướng-phát-triển-tiếp-theo)

---

## 1. Tổng quan & triết lý thiết kế

PhyLab mô phỏng **toàn bộ vòng đời một buổi thực hành vật lí**: từ nhận diện bài (quét SGK) →
làm quen dụng cụ (Prelab) → lắp ráp & đo đạc trên bàn thí nghiệm ảo (Lab) → tự tính số liệu, vẽ
đồ thị, được chấm điểm và xuất báo cáo (Notes) → ôn tập kiến thức.

**Nguyên tắc cốt lõi:**
- **Số liệu THẬT, vật lý THẬT.** Mọi thời gian/vận tốc/gia tốc sinh ra từ mô hình vật lý đúng
  (a = 5/7·g·sinθ cho bi lăn, g = 2s/t² cho rơi tự do), có nhiễu ngẫu nhiên ~±1% như phép đo thật.
- **Chấm điểm DETERMINISTIC.** Máy tính điểm bằng công thức cố định (không nhờ LLM), nên điểm ổn
  định, công bằng, tái lập được. AI chỉ VIẾT NHẬN XÉT.
- **Chỉ dùng AI của VNPT.** Ràng buộc BTC: KHÔNG dùng LLM ngoài (OpenAI/Gemini/Anthropic).
- **Trung thực khi lỗi.** OCR không đọc được → báo "không nhận diện được", không bịa kết quả.
  SmartBot không trả lời được → fallback tri thức nội bộ (RAG), không câu mẫu rỗng.

---

## 2. Công nghệ & kiến trúc

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 16.2** (App Router, Turbopack), React 19 |
| Ngôn ngữ | TypeScript 5 (một số engine để .js/.jsx thuần) |
| Style | Tailwind CSS v4 (theme màu retro cam-nâu), font Nunito + Play |
| Toán học | KaTeX (render LaTeX) |
| Đồ hoạ/animation | SVG tùy biến, Framer Motion, Recharts |
| Icon | lucide-react |
| AI/Dịch vụ | VNPT SmartBot, SmartReader, eKYC, SmartVoice (gọi phía server) |
| Lưu trạng thái | React state + `localStorage` (tên HS) |

- **API routes** (`src/app/api/vnpt/*`) là proxy phía server — mọi token VNPT chỉ nằm ở server,
  KHÔNG lộ ra client.
- Cấu hình Turbopack ghim `root` vào thư mục app để tránh nhầm workspace với repo cha.

---

## 3. Xác thực & đăng nhập

Màn hình `LoginScreen.tsx` có **3 phương thức** (segmented tabs), responsive desktop (split
2 cột) và mobile (carousel 2 slide onboarding + form):

1. **Mật khẩu** — tài khoản demo `phylabhackaithon@gmail.com` / `khanhdeptrai`; có toggle hiện/ẩn
   mật khẩu, "ghi nhớ đăng nhập", hiệu ứng gõ chữ typewriter cho lời chào.
2. **Thẻ học sinh (eKYC OCR)** — quét thẻ HS → gọi `/api/vnpt/ekyc` (action `ocr`) → VNPT OCR
   trích xuất họ tên, mã, ngày sinh… điền sẵn.
3. **Face ID (eKYC liveness/compare)** — so khớp khuôn mặt qua `/api/vnpt/ekyc` (action `compare`).

- Có hiệu ứng "beam" quét, trạng thái thành công, thông báo lỗi rõ ràng.
- Tên HS lưu `localStorage` để giữ đăng nhập giữa các phiên; **Đăng xuất** xoá sạch.
- Nếu VNPT eKYC chưa cấu hình → route trả **mock** (Khánh, CCCD mẫu) để demo mượt.

---

## 4. Điều hướng & bố cục ứng dụng

`page.tsx` là shell chính với 5 khu vực chức năng:

- **Sidebar trái (desktop)** — thu gọn/mở rộng kiểu Notion; nút "Quét tài liệu" nổi bật, menu:
  Trang chủ · Phòng Lab · Quét tài liệu · Notes · Prelab; badge "Bạn đang ở bản cao nhất".
- **Header** — breadcrumb, chuông thông báo (dropdown), hồ sơ HS (lớp 10A1, trường, mã HS, đăng xuất).
- **Bottom nav (mobile)** — Trang chủ · Phòng Lab · nút camera nổi giữa · Notes · Prelab.
- Khi vào tab **Phòng Lab/Prelab** luôn quay về **bộ chọn 2 thí nghiệm**, không nhảy thẳng vào bài cũ.

---

## 5. Trang chủ (Home)

`HomeScreen.tsx`: lời chào theo giờ, thẻ hành động nhanh (Quét/Lab/Notes/Prelab), danh sách
**thí nghiệm gần đây** (kèm điểm & lần làm), khám phá **theo chủ đề** (Cơ học có bài; chủ đề khác
báo "chưa có"), và danh sách **tất cả bài thực hành**. Nhấn 1 bài → vào thẳng luồng bài đó.

---

## 6. Quét tài liệu SGK (OCR)

`ScanScreen.tsx` + `/api/vnpt/ocr` (VNPT SmartReader):

- HS chụp/tải ảnh 1 trang SGK → server upload lấy `hash` → gọi `ocr/scan` → trích text từ
  `object.phrases[].cells[].text`, độ tin cậy thật từ `confidence_score`.
- `lessonMatch.ts` (`classifyLesson`) đối chiếu text với từ khóa 2 bài → trả **bài khớp + %
  confidence THẬT**. Không khớp → `recognized:false` ("không nhận diện được").
- **KHÔNG mock**: chưa cấu hình/API lỗi đều báo trung thực lý do.
- Bảo mật: chỉ nhận ảnh hợp lệ (png/jpg/webp/heic) ≤ 8MB.

---

## 7. Prelab — làm quen dụng cụ

`Prelab.tsx` — slideshow 4 trang **bắt buộc hoàn thành trước khi vào Lab** (chặn 1 lần/phiên/bài):

1. **Bìa** — giới thiệu bài & 3 thiết bị.
2. **Cổng quang điện hồng ngoại** (`PhotogatePrelab`) — nguyên lý che tia.
3. **Đồng hồ hiện số MC964** (`MC964Prelab`) — các MODE (A, B, A+B, A↔B, T), 2 thang đo, nút Reset.
4. **Tùy bài:**
   - Bài 6: **Thước kẹp du xích 0,05 mm** (`CaliperZoom`) — HS phải kéo thước và **ghi nhận đường
     kính bi thép**; giá trị này được dùng thật trong Lab.
   - Bài 11: **Cân bằng giá đỡ 3 chân dây dọi** (`PlumbBasePrelab`) — phải xoay & khóa 2 vít thăng bằng.

Nút "Vào phòng Lab" chỉ mở khi hoàn thành thao tác bắt buộc. Có chế độ **chỉ xem** (tab Prelab) và
**xem lại dạng overlay** khi đang ở trong Lab.

---

## 8. Phòng Lab — bàn thí nghiệm tương tác

`LabRoom.tsx` điều phối 2 engine bàn (port từ φLab): `LabBench.jsx` (Bài 6) và `FreeFallBench.jsx`
(Bài 11). Tính năng:

- **Kéo–thả–lắp ráp** dụng cụ lên bàn (giá đỡ, máng nghiêng, cổng quang, đồng hồ MC964, nam châm,
  bi/trụ thép, thước) — các dụng cụ SVG chi tiết trong `components/dungcuthinghiem/` & `instruments/`.
- **Nối dây tín hiệu** cổng quang → ổ A/B của MC964 (kiểm tra nối đúng).
- **Cân bằng máng** bằng dây dọi; **bật nguồn**; **chọn MODE** đồng hồ đúng phép đo.
- **Thả bi / nhả nam châm** → vật chuyển động theo vật lý thật, đồng hồ hiện thời gian đo (có nhiễu).
- **Điều chỉnh góc nghiêng θ, khoảng cách cổng** theo đề được giao.
- Trợ lý Phylab thoại hướng dẫn theo trạng thái (`engine/smartbot.js` — rule-based, đúng thoại
  từng bước & từng bài), đọc bằng TTS.
- Xuất số liệu đo sang Notes ("Xuất sang Note").

---

## 9. Lõi vật lý (physics engine)

**Bài 6** (`engine/physics.js`, `physics/inclinedPlane.ts`):
- Bi lăn không trượt trên máng nghiêng: **a = (5/7)·g·sinθ**, g = 9,8.
- Vận tốc tại quãng s kể từ điểm thả: **v(s) = √(2·a·s)**.
- Vận tốc trung bình đoạn EF = (v_E + v_F)/2; tức thời tại cổng = v tại cổng đó.
- Nhiễu ±1%/lần đo; lệch hệ thống 0,03–0,05 s khi máng chưa cân bằng.
- 2 thang đồng hồ: 9,999 s (0,001 s) và 99,99 s (0,01 s).

**Bài 11** (`engine/physicsFreeFall.js`, `physics/freeFall.ts`):
- Rơi tự do: **s = ½·g·t²** ⟹ **g = 2s/t²**; thời gian rơi t = √(2s/g) kèm nhiễu.

Các hằng số hình học/bộ số liệu gợi ý (`SUGGESTED`) đặt trong engine, chỉnh dễ dàng.

---

## 10. Notes — chấm điểm, đồ thị, báo cáo, ôn tập

`NoteSection.tsx` — 4 tab, chọn bài qua dropdown:

- **Số liệu** — bảng từng lần đo (s, t, θ, cân bằng); HS **tự điền "Kết quả tính"**; máy đánh giá
  Đúng/Lệch (dung sai 1%). Nút "Chấm điểm & nộp báo cáo".
- **Đồ thị** (`GraphPlotter`) — HS **tự bấm vẽ** từng điểm lên lưới; máy chấm bằng độ khớp điểm số
  liệu + hồi quy tuyến tính (R²). **Bắt buộc** vẽ & chấm mới nộp được báo cáo (chiếm 30% điểm tổng).
- **Báo cáo** — trang **A4 thực thụ**: quốc hiệu/đầu trang, thông tin HS, mục đích, bảng số liệu
  đầy đủ từng lần đo, bảng điểm 70-20-10, nhận xét AI, ô chữ ký HS/GV. Nút **Xuất PDF** = `window.print()`
  với print-CSS riêng (ẩn khung app, khổ A4, bảng không cắt trang). Bảng cuộn ngang gọn trên màn nhỏ.
- **Ôn tập** — Flashcard (lật xem đáp án) + Trắc nghiệm (chấm, phân tích thí nghiệm/lý thuyết) từ
  `data/quizBank.ts`, và ô **Hỏi Trợ lý AI** (`AiChat`).

---

## 11. Hệ thống chấm điểm deterministic

`src/lib/grading.ts` — thang **KHẮT KHE**, thang 10 (chi tiết đầy đủ ở
[`grading_rubric_for_smartbot.md`](grading_rubric_for_smartbot.md)):

```
Điểm thí nghiệm (mỗi mẫu) = Số liệu×70% + Trình tự×20% + Sai số×10%
Điểm cả bài               = trung bình các mẫu   (Bài 6 có 2 mẫu, Bài 11 có 1)
Điểm TỔNG                 = Thí nghiệm×70% + Đồ thị×30%   (đồ thị BẮT BUỘC)
```

- **Băng điểm theo độ sát:** ≥98→10 · ≥95→9 · ≥90→8 · ≥80→6,5 · ≥70→5 · <70→3.
- **Số liệu** = độ khớp giữa kết quả HS tự tính và công thức (ô trống = 0% lần đó); thiếu <3 lần
  đo/mẫu trừ 2đ/lần.
- **Trình tự** = 10 − 2,5×(số lần đo khi chưa cân bằng).
- **Sai số** = độ sát giữa số đo và giá trị lý thuyết (g=9,8 hoặc v suy từ engine).
- Dung sai để 1 ô hiện "Đúng": **1%**.
- Toàn bộ điểm do MÁY tính; SmartBot chỉ viết nhận xét, **không đổi điểm**.

---

## 12. Trợ lý AI (VNPT SmartBot) & RAG

`/api/vnpt/chat` + `lib/vnpt-smartbot.ts` — 3 tác vụ:
- **chat** — hỏi đáp thí nghiệm; nhồi ngữ cảnh RAG (`lib/labKnowledge.ts`) vào prompt.
- **problem** — diễn đạt lại đề đo (giữ nguyên số mục tiêu; kiểm `keepsTargetNumbers`).
- **grade** — viết nhận xét từ bảng điểm deterministic.

**Chống fallback vô lý (`askSmartBotResilient`):** SmartBot hay trả HTTP 200 kèm câu xin lỗi mặc
định. Cơ chế xử lý:
1. Gọi kiểu `settings.system_prompt/advance_prompt`; **retry 1 lần** nếu lỗi tạm thời (mạng/5xx/timeout).
2. Nếu dính câu xin lỗi (`isNonAnswer`) → **nhồi toàn bộ prompt vào `text`** ("embedded"), không
   phụ thuộc cài đặt platform.
3. Cả hai thất bại → **fallback RAG/template THẬT** (bám số liệu, không câu rỗng).

Dữ liệu train bot: [`smartbot_training_data.md`](smartbot_training_data.md). Bot id cấu hình qua env.

---

## 13. Ra đề theo từng học sinh

`lib/problemGen.ts` + `lib/seededRandom.ts`: hạt giống = `tên HS :: mã bài :: phần` → mỗi HS nhận
bộ mục tiêu (θ, sEF, s) **khác nhau nhưng ổn định** (deterministic). Việc sinh số chạy cục bộ (chắc
chắn khác nhau giữa HS); SmartBot chỉ diễn đạt câu chữ đề.

---

## 14. Text-to-Speech (SmartVoice)

`/api/vnpt/tts` + `components/lab/useTTS.ts`: đọc thoại trợ lý bằng **VNPT SmartVoice** (giọng nữ
Bắc, mp3, 22050 Hz). Chưa cấu hình/API lỗi → **fallback Web Speech API** của trình duyệt (`isMock`),
app không bao giờ câm. Text đọc được làm sạch & kẹp ≤ 5000 ký tự.

---

## 15. Hiển thị công thức & định dạng chữ

`components/Latex.tsx` (`MathText`):
- **Công thức LaTeX**: `$...$` (inline) và `$$...$$` (block) render bằng KaTeX.
- **Bôi đậm kiểu Markdown**: `**chữ**` → **chữ** (thẻ `<strong>`), render bằng React element
  (không `dangerouslySetInnerHTML`) nên **an toàn XSS**. Dùng ở nhận xét AI, chat, báo cáo.

---

## 16. Bảo mật thông tin

Phòng thủ theo chiều sâu, phù hợp app học sinh:

- **Token VNPT chỉ ở server.** Mọi call VNPT chạy trong API route (`process.env`), không bao giờ
  trả token về client; `connect-src 'self'` nên trình duyệt chỉ nói chuyện với chính origin.
- **HTTP security headers** (`next.config.ts`, áp mọi route):
  - `Content-Security-Policy` (chặn script lạ, cho phép đúng host cần: KaTeX/Tailwind inline,
    Google Fonts, ảnh/âm thanh VNPT qua https:).
  - `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (chống clickjacking),
    `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()` — chỉ cho camera của chính
    origin (eKYC), chặn mic/định vị.
  - `Strict-Transport-Security` (ép HTTPS ở production).
- **Làm sạch & giới hạn input** (`lib/security.ts`): mọi text người dùng gửi tới SmartBot/TTS được
  `sanitizeText` (bỏ ký tự điều khiển & zero-width chống prompt-injection ẩn, kẹp độ dài) — chat
  ≤2000, đề ≤4000, TTS ≤5000 ký tự.
- **Kiểm tra file upload** (`checkImageFile`): OCR/eKYC chỉ nhận ảnh hợp lệ (png/jpg/webp/heic) và
  ≤ 8MB → chống DoS & file độc.
- **Render an toàn XSS**: `MathText` dựng bằng React element, tự escape mọi text.
- **Xoá dữ liệu khi đăng xuất**: `localStorage` tên HS bị xoá.

---

## 17. Bản đồ mã nguồn

```
src/
├─ app/
│  ├─ layout.tsx, page.tsx, globals.css      # shell + điều hướng + style (print CSS)
│  └─ api/vnpt/{chat,ocr,ekyc,tts}/route.ts  # proxy AI VNPT (server-side)
├─ components/
│  ├─ LoginScreen, HomeScreen, ScanScreen, Prelab, NoteSection, Bench, Logo…
│  ├─ lab/           # LabRoom + LabBench.jsx + FreeFallBench.jsx + useTTS
│  ├─ notes/         # GraphPlotter (vẽ đồ thị), AiChat (hỏi trợ lý)
│  ├─ prelab/        # Photogate/MC964/PlumbBase prelab
│  ├─ dungcuthinghiem/ & instruments/   # dụng cụ SVG (máng, cổng quang, MC964, bi, nam châm, thước)
│  └─ Latex.tsx      # KaTeX + **bold**
├─ engine/           # physics.js, physicsFreeFall.js, smartbot.js (thoại), tokens.js
├─ experiments/specs.ts   # đặc tả 2 bài (mục tiêu, dụng cụ, bước, homework)
├─ lib/
│  ├─ grading.ts     # chấm điểm deterministic
│  ├─ vnpt-smartbot.ts, labKnowledge.ts (RAG), lessonMatch.ts (OCR classify)
│  ├─ problemGen.ts, seededRandom.ts       # ra đề theo HS
│  ├─ security.ts    # sanitize/limits/file-check
│  └─ types.ts
└─ data/quizBank.ts  # flashcard + trắc nghiệm ôn tập
docs/                # tài liệu (file này, rubric chấm, training bot, tích hợp VNPT)
scripts/             # test.mjs, test-smartbot.mjs, test-all.mjs
```

---

## 18. Kiểm thử

- `npm run test` — unit engine vật lý + trợ lý rule-based + API shape (cần dev server cho phần API).
- `npm run test:smartbot` — 4 kiểm tra đường fallback `/api/vnpt/chat`.
- `npm run test:all` — **tổng hợp**: unit grading (thang khắt khe) + physics + API fallback +
  **chẩn đoán SmartBot trực tiếp** (đọc `.env.local`, thử 3 chiến lược, kết luận bot có bật
  "tri thức nâng cao" không). Thêm `--no-api` để chỉ chạy unit (không cần server/mạng).

---

## 19. Biến môi trường

Đặt trong `.env.local` (KHÔNG commit). Xem đầy đủ ở
[`VNPT_API_INTEGRATION.md`](VNPT_API_INTEGRATION.md) & `API_document/API_CHEATSHEET.md`:

```
# SmartBot (LLM + RAG)
VNPT_BOT_ACCESS_TOKEN=  VNPT_BOT_TOKEN_ID=  VNPT_BOT_TOKEN_KEY=  SMARTBOT_BOT_ID=
# SmartReader (OCR quét SGK)
VNPT_READER_ACCESS_TOKEN=  VNPT_READER_TOKEN_ID=  VNPT_READER_TOKEN_KEY=
# eKYC (đăng nhập thẻ/khuôn mặt)
VNPT_EKYC_ACCESS_TOKEN=  VNPT_EKYC_TOKEN_ID=  VNPT_EKYC_TOKEN_KEY=
# SmartVoice (TTS)
VNPT_VOICE_ACCESS_TOKEN=  VNPT_VOICE_TOKEN_ID=  VNPT_VOICE_TOKEN_KEY=  VNPT_VOICE_BASE_URL=
```

Thiếu cấu hình nào thì tính năng đó **fallback an toàn** (mock/RAG/Web Speech), app vẫn chạy trọn vẹn.

---

## 20. Tính năng Lớp học — Giáo viên ↔ Học sinh

Triển khai 2026-07-20. Toàn bộ endpoint gộp trong **một route** `/api/class/[action]`
(`src/app/api/class/[action]/route.ts`) — chạy **Node runtime** (có chủ đích, xem 20.7).

### 20.1. Đăng nhập giáo viên & phân quyền

- Tài khoản GV demo qua env: `TEACHER_EMAIL` / `TEACHER_PASSWORD` (mặc định
  `giaovien@phylab.vn` / `giaoviendeptrai`). Đăng nhập ở cùng `LoginScreen` → route
  `/api/auth/login` trả `{role:"teacher", token}`.
- Token HMAC-SHA256 (`src/lib/auth.ts`, `crypto.subtle`, TTL 30 ngày, secret `AUTH_SECRET`
  **bắt buộc**); mọi route GV guard bằng `requireTeacher` (Bearer). HS trả `role:"student"`.
- GV vào **shell riêng** `TeacherShell.tsx` (`src/components/teacher/`) — không render shell HS.
- Định danh HS: UUID sinh ở `localStorage.studentId` (`lib/activity.ts getStudentId`) + tên hiển
  thị; giữ nguyên khi đăng xuất để "vẫn là em đó" khi vào lại. (Spoof được — chấp nhận cho hackathon.)

### 20.2. Lớp học & mã tham gia

- GV tạo lớp → **mã 5 ký tự** (bỏ 0/O/1/I, ví dụ `XKGSC`) hiện to trên dashboard, có nút copy.
- HS mở tab **"Lớp của tôi"** (sidebar + bottom dock, `student/MyClassTab.tsx`) → nhập mã → vào lớp.
- GV xem: danh sách lớp + sĩ số (`TeacherDashboard`), chi tiết lớp (`ClassDetail`): roster với
  **lần hoạt động cuối + sparkline 7 ngày**, danh sách bài tập + % nộp + điểm TB, drill-down
  từng HS (`StudentDrilldown`): bảng số liệu từng lần đo (KQ đúng vs lý thuyết), nhận xét,
  điểm quiz, timeline hoạt động.
- **Cường độ vào app**: client ghi sự kiện `login / lab_start / lab_submit / quiz_submit`
  (fire-and-forget, `lib/activity.ts`) → bảng `activity_events`.

### 20.3. Bài Lab do giáo viên ra đề

- `teacher/LabAssignmentComposer.tsx`: GV chọn bài 6/11, tự đặt mục tiêu đo (θ, sEF, s) — thấy ngay
  **đáp án mong đợi** tính từ physics engine (`theoreticalOf`), HS không thấy.
- Khi HS trong lớp mở đúng bài lab: đề GV **thay thế** đề seeded/AI —
  `buildAssignedSet` (`lib/problemGen.ts`) override tại `LabBench.jsx` / `FreeFallBench.jsx`
  (prop `assignedSets` chảy từ `page.tsx` hook `useMyClass` → `LabRoom`). HS ngoài lớp/không có
  bài giao vẫn nhận đề seeded như cũ.
- **Nộp bài tự động**: HS chấm điểm ở Sổ Báo Cáo như bình thường → `page.tsx handleReportGraded`
  POST `submit-lab`; server **re-verify điểm bằng `gradeLesson`** (không tin điểm client),
  UPSERT giữ bản mới nhất + đếm số lần nộp.

### 20.4. Quiz theo form đề Bộ GD&ĐT 2025

`src/lib/moeQuiz.ts` — 3 phần đúng cấu trúc đề minh hoạ 2025:

| Phần | Dạng | Điểm |
|---|---|---|
| I | Trắc nghiệm 4 phương án | 0,25đ/câu |
| II | Đúng/Sai 4 ý a-b-c-d | 1 ý=0,1 · 2 ý=0,25 · 3 ý=0,5 · 4 ý=1,0 |
| III | Trả lời ngắn (số, ≤4 ký tự, có dung sai) | 0,25đ/câu |

- Điểm quy về thang 10. GV soạn bằng `QuizComposer` (kèm nút **import câu hỏi từ ngân hàng ôn
  tập** `quizBank.ts`); HS làm bằng `student/QuizPlayer.tsx` (render KaTeX, review từng câu sau nộp).
- **Chống lộ đáp án**: đề gửi xuống client đã qua `stripAnswers`; bài làm **chấm trên server**
  (`gradeMoeQuiz` trong action `submit-quiz`) — đáp án không bao giờ rời server.

### 20.5. Quiz CHỐNG GIAN LẬN từ số liệu của chính học sinh

`src/lib/antiCheatQuiz.ts` — `generatePersonalQuiz(trials, seed)`:

- GV chọn 1 bài Lab đã giao làm nguồn (kind `personal_quiz`). Khi HS mở quiz, server đọc bài Lab
  **em đó đã nộp** → sinh đề từ chính (s, t, θ, balanced) của em: tính lại g/v từ số liệu của mình
  (trả lời ngắn, dung sai 2%), lần đo lệch lý thuyết nhất (trắc nghiệm), 4 ý Đúng/Sai bám dữ liệu
  thật (trung bình, cân bằng, t max, độ lệch).
- **Deterministic**: seed = `assignmentId::studentId` (`seededRandom.makeRng`) → khi nộp, server
  **tái sinh đúng đề đó để chấm**. Mỗi HS số liệu khác → đề khác → chép đáp án của bạn vô nghĩa.
- Chưa nộp bài Lab nguồn → báo "cần nộp bài Lab trước" (HTTP 409, `needLab`).

### 20.6. Heatmap lỗi sai & bảng điểm CSV

- **Bản đồ lỗi sai** (`MistakeHeatmap.tsx`, action `heatmap`): câu quiz cả lớp sai nhiều nhất
  (thanh nhiệt %), % lần đo khi **chưa cân bằng** dụng cụ, % ô "Kết quả tính" lệch quá dung sai 1%,
  điểm Lab trung bình — GV biết ngay cần giảng lại phần nào.
- **Bảng điểm CSV** (action `gradebook`): UTF-8 **BOM** (Excel tiếng Việt không lỗi font), cột =
  tên HS · điểm từng bài tập · điểm TB · số sự kiện 7 ngày · lần cuối vào app.

### 20.7. Lưu trữ dữ liệu (3 adapter qua `getDb()` — `src/lib/db.ts`)

```
1. Cloudflare D1   — deploy Pages/Workers (binding DB; schema migrations/0001_init.sql)
2. File JSON       — Node local: .data/phylab-db.json (npm run dev / start / demo qua tunnel)
                     → dữ liệu SỐNG qua restart; demo GV↔HS nhiều thiết bị qua localtunnel chạy thật
3. In-memory       — fallback cuối (edge sandbox không có fs)
```

- Route `/api/class/[action]` chạy **Node runtime** có chủ đích: (a) sandbox edge của `next dev`
  tạo mới mỗi request nên không giữ được state → cần fs; (b) `@cloudflare/next-on-pages` không hỗ
  trợ Next 16 nên đường edge trên Pages không còn ràng buộc.
- Setup D1 (khi cần production đa thiết bị trên Cloudflare): xem hướng dẫn trong `wrangler.toml`
  (`wrangler d1 create` → điền id → `npm run db:migrate` / `db:migrate:remote` → gắn binding `DB`
  + env trên dashboard). Bảng: classes, memberships, assignments, submissions, quiz_results,
  activity_events.
- Env mới: `TEACHER_EMAIL`, `TEACHER_PASSWORD`, `AUTH_SECRET` (đã thêm `.env.example`,
  `cloudflare-env.txt`).
- Kiểm thử: `scripts/test-class.mjs` (26 test — thang Đúng/Sai Bộ GD, dung sai trả lời ngắn,
  determinism anti-cheat, buildAssignedSet) — gộp trong `npm run test:all`.

---

## 21. Định hướng phát triển tiếp theo

> Mục này ghi lại **kế hoạch**, không phải tính năng đã có trong code. Cập nhật khi bắt đầu triển khai.

### 21.1. 3 bài lab mới

Hiện chỉ có 2 bài (`do-toc-do-vat-chuyen-dong` — Bài 6, `do-gia-toc-roi-tu-do` — Bài 11) khai báo
trong `src/experiments/specs.ts`. Khung sẵn có cho phép thêm bài mới theo từng bước, mỗi bài cần:

1. **`ExperimentSpec` mới** trong `src/experiments/specs.ts` — `theory`, `instruments`, `steps`,
   `dataBook`, `homework` (theo đúng cấu trúc 2 bài hiện tại).
2. **Physics engine riêng** trong `src/engine/` (mẫu: `physics.js` cho Bài 6, `physicsFreeFall.js`
   cho Bài 11) + file `.ts` tương ứng trong `src/engine/physics/` — số liệu phải sinh từ mô hình vật
   lý đúng, có nhiễu ±1% (nguyên tắc cốt lõi ở mục 1, không được bịa số).
3. **Dụng cụ SVG mới** trong `components/dungcuthinghiem/` & `instruments/` nếu bài dùng thiết bị
   khác 2 bài hiện tại; cập nhật `LabRoom.tsx` để điều phối bench mới (như `LabBench.jsx` /
   `FreeFallBench.jsx`).
4. **Prelab riêng** (`components/prelab/`) nếu có dụng cụ HS cần làm quen trước — theo mẫu
   `PhotogatePrelab`, `MC964Prelab`, `CaliperZoom`/`PlumbBasePrelab` (mục 7).
5. **Cập nhật RAG** (`lib/labKnowledge.ts`) và dữ liệu train (`smartbot_training_data.md`) để
   SmartBot trả lời đúng ngữ cảnh bài mới (mục 12).
6. **Cập nhật `lessonMatch.ts`** — thêm từ khóa để OCR quét SGK (mục 6) nhận diện được bài mới.
7. **Bổ sung Ôn tập** (`data/quizBank.ts`) cho bài mới nếu cần flashcard/trắc nghiệm (mục 10).
8. **Kiểm thử**: thêm test vật lý cho bài mới vào `scripts/test.mjs` (theo mẫu 5 kịch bản mục 18).

Chưa chốt nội dung SGK/chủ đề cụ thể cho 3 bài mới — cập nhật mục này khi có quyết định.
Lưu ý thêm sau khi có tính năng Lớp học (mục 20): bài mới cần khai báo thêm trong
`LabAssignmentComposer.tsx` (để GV ra đề được) và mở rộng `LabAssignmentPayload`/`antiCheatQuiz.ts`
nếu bài dùng đại lượng đo khác (θ, sEF, s).

---

*Tài liệu này mô tả trạng thái dự án tại 2026-07-20. Điểm số & vật lý là deterministic; AI của VNPT
lo phần ngôn ngữ (nhận xét, hỏi đáp, đọc thoại, OCR, eKYC).*
