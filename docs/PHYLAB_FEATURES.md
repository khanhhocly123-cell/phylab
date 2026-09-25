# PhyLab — Tài liệu tính năng toàn diện

> **PhyLab** (Phylab) — Phòng thí nghiệm Vật lí ảo tương tác cho học sinh THPT Việt Nam.
> Web app Next.js 16 dự thi **Vietnamese Student HackAIthon**, tích hợp trọn bộ AI của **VNPT**
> (SmartBot, SmartReader OCR, eKYC, SmartVoice TTS). Hiện có **5 bài thực hành** (SGK Kết nối tri
> thức): Vật lí 10 — **Bài 6** Đo tốc độ, **Bài 11** Đo gia tốc rơi tự do, **Bài 15** Thí nghiệm minh hoạ
> định luật 2 Newton; Vật lí 11 — **Bài 23** Điện trở, định luật Ohm, **Bài 26** Đo suất điện động pin
> điện hoá. Danh sách bài nằm ở một chỗ:
> `src/data/labCatalog.ts`.
>
> Tài liệu này mô tả CHI TIẾT mọi tính năng, kiến trúc và ràng buộc của dự án. Cập nhật 2026-09-25.
> Hướng dẫn cài đặt, quy ước giao diện và các bước **thêm bài thí nghiệm mới** ở `README.md`.
>
> **Mới (2026-09-24):** thêm 2 bài lớp 11 (mục 8, 9); đồng hồ đa năng đo được Ω; bộ dụng cụ cơ học vẽ
> lại thành component SVG dùng chung giữa Prelab và Lab (`lab/mech/MechParts.jsx`); Trang chủ, màn
> Quét, Phòng Lab và Sổ Báo Cáo đọc từ danh mục bài nên thêm bài không vỡ giao diện; Sổ Báo Cáo làm
> lại với đồ thị tự vẽ (mục 10); Bài 26 tối ưu từ ~22 lên ~95 FPS. Phần chấm điểm và chat phía học
> sinh tạm ẩn để làm lại (mục 11, 12).
>
> **Mới (2026-09-25):** Prelab điện có thêm bước **vẽ sơ đồ mạch** (chấm bằng giải mạch thật) và **tính
> toán gốc** (mục 7); **hướng dẫn cho người mới** với linh vật Photon, tour Phòng Lab, tour Sổ Báo Cáo và
> bộ **An toàn phòng thí nghiệm** theo SGK Vật lí 10 — Bài 2 (mục 4.1). Chức năng **Lớp học tạm khoá**
> bằng cờ `FEATURES.classroom` (mục 20).

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
10. [Sổ Báo Cáo — số liệu, đồ thị, báo cáo, ôn tập](#10-sổ-báo-cáo--số-liệu-đồ-thị-báo-cáo-ôn-tập)
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
đồ thị và in báo cáo (Sổ Báo Cáo) → ôn tập kiến thức.

**Nguyên tắc cốt lõi:**
- **Số liệu THẬT, vật lý THẬT.** Mọi thời gian/vận tốc/gia tốc/dòng điện sinh ra từ mô hình vật lý
  đúng (a = 5/7·g·sinθ cho bi lăn, g = 2s/t² cho rơi tự do, giải mạch theo điện thế nút cho bài điện),
  cộng nhiễu phân bố chuẩn cắt ở ±2,5σ (`engine/noise.js`): làm đúng thì các lần đo chụm lại nhưng
  không bao giờ trùng nhau; sai lệch lớn chỉ đến từ thao tác sai và bàn thí nghiệm nói rõ nguyên nhân.
- **Chấm điểm DETERMINISTIC.** Máy tính điểm bằng công thức cố định (không nhờ LLM), nên điểm ổn
  định, công bằng, tái lập được. AI chỉ VIẾT NHẬN XÉT.
- **Chỉ dùng AI của VNPT.** Ràng buộc BTC: KHÔNG dùng LLM ngoài (OpenAI/Gemini/Anthropic).
- **Trung thực khi lỗi.** OCR không đọc được → báo "không nhận diện được", không bịa kết quả.
  SmartBot không trả lời được → fallback tri thức nội bộ (RAG), không câu mẫu rỗng.

---

## 2. Công nghệ & kiến trúc

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 16.2** (App Router; dev Turbopack, build webpack), React 19.2 |
| Ngôn ngữ | TypeScript 5 (engine và bàn thí nghiệm để .js/.jsx thuần, `allowJs`) |
| Style | Tailwind CSS v4 (theme màu retro cam-nâu), font Nunito + Play |
| Toán học | KaTeX (render LaTeX) |
| Đồ hoạ/animation | SVG tự vẽ (không dùng `filter`), SMIL, Framer Motion |
| Icon | lucide-react (không dùng emoji trang trí) |
| Lint | ESLint + luật React Compiler (`set-state-in-effect`, `static-components`) |
| Deploy | Cloudflare qua OpenNext (`npm run deploy`), D1 cho dữ liệu lớp học |
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

`page.tsx` là shell chính với 5 tab: `home`, `lab`, `myclass`, `scan`, `notes`.

- **Sidebar trái (desktop)** — thu gọn/mở rộng kiểu Notion; nút "Quét tài liệu" nổi bật; menu:
  Trang chủ · Phòng Lab của tôi · Lớp của tôi · Quét tài liệu · Sổ Báo Cáo. Sidebar ẩn khi đang làm
  thí nghiệm hoặc đang quét để bàn Lab và camera dùng trọn màn hình.
- **Header** — breadcrumb (tên bài khi đang ở Lab), chuông thông báo, hồ sơ HS, đăng xuất.
- **Dock dưới (mobile)** — Trang chủ · Phòng Lab · nút camera nổi giữa · Lớp học · Sổ Báo Cáo.
- **Prelab không còn là tab riêng**: là chặng 1 của Phòng Lab (mục 7). Tab `prelab` cũ còn lưu trong
  `localStorage` tự chuyển sang `lab`.
- Bấm "Phòng Lab" luôn quay về LabHub (danh sách bài), không nhảy thẳng vào bài cũ.
- Không còn footer cuối trang, đỡ phải cuộn.
- **Điện thoại**: danh sách Phòng Lab dùng thẻ ngang gọn (ảnh trái, 2 chặng, nút vào), 3 chặng gói thành
  một dòng; Sổ Báo Cáo có hàng "Sổ tay · Báo cáo · Ôn tập" + nút "Lưu" không gãy chữ; sơ đồ mạch Prelab to
  chốt/chữ và nhận chạm gần chốt khi khung vẽ hẹp; tour neo thẻ lời dẫn sát mép trên/dưới.
- Mục **Lớp của tôi** hiện xám kèm ổ khoá khi `FEATURES.classroom = false` (bấm vào chỉ báo tạm khoá).

### 4.1. Hướng dẫn cho người mới (guided tour)

Bộ máy `components/tour/GuidedTour.tsx`: làm tối màn hình, khoét sáng đúng phần tử có `data-tour="…"`,
thẻ lời dẫn trượt tới cạnh vùng đó (tính toạ độ trực tiếp, không dùng transform nên chuyển bước không
giật; nội dung dài thêm thì thẻ dài xuống, không nhảy lên). Bước không có vùng cần chỉ hiện thành thẻ giữa
màn hình; trên điện thoại thẻ nằm sát mép trên/dưới. Màu dải đầu thẻ theo chương (Làm quen cam, Phòng
Lab xanh ngọc, An toàn vàng sọc cảnh báo, Sổ Báo Cáo xanh dương); thanh tiến độ chia chương, bấm để nhảy,
chương xong có dấu tích. Linh vật **Photon** (`Mascot.tsx`, SVG thuần) đổi nét mặt theo bước, đội mũ bảo
hộ ở phần An toàn, đeo kính trong Phòng Lab. Phím ← → chuyển bước, Esc đóng. Mỗi lúc chỉ một tour
(`isTourOpen`).

| Tour | Khi nào mở | Nội dung |
|---|---|---|
| Tham quan app | Lần đầu học sinh vào app (không chen lúc đang làm thí nghiệm / đang quét) | Màn chào → điều hướng → quét SGK → bài nên làm tiếp → danh sách Lab → nút dấu hỏi → sơ đồ 4 khu bàn thí nghiệm → chương An toàn → *Phiếu vào Phòng Lab* |
| Phòng Lab | Đúng một lần, lần đầu vào bàn thí nghiệm bất kì | Thanh công cụ, khay dụng cụ, bàn, bước tiếp theo, nút lưu |
| Sổ Báo Cáo | Lần đầu vào Sổ (sau khi đã tham quan app) | Chọn bài, 3 cách xem, thẻ kết quả, bảng số liệu, thử thách tự vẽ đồ thị, lưu & in |
| An toàn PTN | Từ nút dấu hỏi | Chương An toàn + quy tắc dụng cụ theo các nhóm bài đang mở |

**Chương An toàn** (SGK Vật lí 10 KNTT — Bài 2, lời văn viết lại, hình vẽ SVG riêng):
- *Săn nguy hiểm* (`HazardHunt.tsx`) — góc phòng thí nghiệm có 4 chỗ mất an toàn (cốc nước sát ổ điện,
  dây sờn hở lõi, hai kẹp điện chạm nhau, chai cồn cạnh mạch điện) lẫn 4 chỗ an toàn để đánh lừa; có
  gợi ý, đánh số, giải thích từng chỗ.
- Thẻ lật kí hiệu trên thiết bị (DC, AC, cực, Input/Output, nhiệt độ cao, từ trường, laser, dễ vỡ…),
  biển báo (8 loại, kèm mẹo đọc theo hình dạng/màu), 9 quy tắc, xử lí khi điện giật / cháy, hai câu hỏi
  "Em có thể" cuối bài.
- Quy tắc theo nhóm dụng cụ (`LAB_GEAR_SAFETY`: cơ học, điện, quang học, nhiệt học) — nhóm suy từ chủ đề
  bài trong `labCatalog.ts`, danh sách bài áp dụng cũng đọc từ danh mục.
- Đi hết tour tham quan → nhận **huy hiệu An toàn PTN** (`tourState`: `badge-safety`), hiện ở Trang chủ.

Trạng thái "đã xem" lưu theo từng người dùng trong `localStorage` (`lib/tourState.ts`, khoá
`phylab.tours.v1`).

---

## 5. Trang chủ (Home)

`HomeScreen.tsx` — mọi danh sách đọc từ `data/labCatalog.ts`, không viết cứng bài nào:

- **Hero** — lời chào theo giờ, số bài đang mở, thẻ gợi ý bài nên làm tiếp.
- **Phòng Lab (N bài)** — bộ lọc theo lớp (Tất cả + các lớp có bài mở, `OPEN_GRADES`), hàng thẻ cuộn
  ngang có snap và nút ◀ ▶ (tự mờ khi chạm mép), link "Xem tất cả" sang LabHub. Thẻ bài: ảnh bìa, mã
  bài, lớp, công thức, độ khó, thời lượng, trạng thái đã làm.
- **Sắp ra mắt** — dải gọn các bài `status: "soon"`.
- **Tiến độ** — vòng tròn % bài đã làm và thanh tiến độ theo chủ đề (`OPEN_SUBJECTS`).
- **Lối tắt** và **nhật ký gần đây**.
- Đã thử với 12 bài giả lập: bố cục không vỡ, hàng thẻ chỉ dài thêm theo chiều ngang.

---

## 6. Quét tài liệu SGK (OCR)

`ScanScreen.tsx` + `/api/vnpt/ocr` (VNPT SmartReader):

- **Giao diện** — nền tối cho camera/ảnh, khung ngắm, vệt quét chạy trong lúc đọc. Desktop có panel phải:
  3 bước hướng dẫn, mẹo chụp rõ và **chọn nhanh bài** từ `OPEN_LABS` (khung cuộn nội bộ, không kéo dài
  trang). Mobile: lần đầu mở hiện bảng hướng dẫn trượt từ dưới lên (nhớ bằng
  `localStorage.scanGuideSeen`).
- **Kết quả** — thẻ bài khớp (ảnh bìa, thanh độ tin cậy) và nút vào bài. **Thất bại** — thẻ lỗi với lý
  do dễ hiểu (`failReason`: token hết hạn/401, mất mạng, lỗi server…) và gợi ý chọn bài thủ công.
- **Luồng OCR** — server upload lấy `hash` → gọi `ocr/scan` → trích text từ
  `object.phrases[].cells[].text`, độ tin cậy thật từ `confidence_score`.
- `lessonMatch.ts` (`classifyLesson`) đối chiếu text với từ khoá của **4 bài** → trả bài khớp + %
  confidence THẬT. Không khớp → `recognized:false` ("không nhận diện được").
- **KHÔNG mock**: chưa cấu hình/API lỗi đều báo trung thực lý do. Hiện token SmartReader trả 401 (xem
  README, mục *Vấn đề đang biết*).
- Bảo mật: chỉ nhận ảnh hợp lệ (png/jpg/webp/heic) ≤ 8MB.

---

## 7. Prelab — làm quen dụng cụ

Prelab là **chặng 1** của mỗi bài. LabHub hiện 3 chặng *Prelab → Thực hành → Sổ Báo Cáo* kèm trạng thái
từng chặng. `Prelab.tsx` chọn nội dung theo bài; khung chung `prelab/PrelabShell.tsx` có 2 chế độ:
`gate` (bắt buộc trước khi vào Lab) và `review` (xem lại bất cứ lúc nào qua nút "Xem Prelab").
Bố cục 2 cột trên desktop (hình | thao tác và giải thích), không phải cuộn.

**Bài 6 và Bài 11** — 3 trang dụng cụ:

1. **Cổng quang điện** (`PhotogatePrelab`) — nguyên lý che tia hồng ngoại; vật đi chậm che tia lâu,
   đi nhanh che tia ngắn.
2. **Đồng hồ MC964** (`MC964Prelab`) — dùng đúng component `MC964Face` của Phòng Lab (mặt trước/mặt
   sau, núm MODE, thang đo, Reset, ổ cắm, công tắc nguồn). 5 nhiệm vụ "thử tay", vòng sáng chỉ chỗ cần
   bấm: chọn MODE A↔B, chọn MODE A, bấm Reset, lật mặt sau cắm cổng E vào ổ A, bật nguồn.
3. **Thao tác bắt buộc, tuỳ bài**:
   - Bài 6: **thước kẹp du xích 0,05 mm** (`CaliperZoom`) — kéo thước và ghi nhận đường kính bi thép;
     giá trị được dùng thật trong Lab (v = d/t).
   - Bài 11: **cân bằng giá đỡ bằng dây dọi** (`PlumbBasePrelab`) — vặn luân phiên 2 vít rồi khoá khi
     dây dọi thẳng.

**Bài 23 và Bài 26** (`ElectricalPrelab`) — 7 mục: Tổng quan · Núm xoay (V, mA, µA, Ω) · Cổng cắm (A,
mA/µA, COM, VΩ) · Nguồn DC (Bài 23) hoặc Bảng mạch (Bài 26) · **Sơ đồ mạch** · **Tính toán** · An toàn.
Phải xem hết các nấc, các cổng, vẽ đúng sơ đồ, làm đúng 3 bài tính và xác nhận an toàn mới mở khoá Lab.

- **Sơ đồ mạch** (`prelab/CircuitSketch.tsx` + `lib/schematic.ts`): kí hiệu nguồn/pin, khoá K, ampe kế,
  vôn kế, điện trở, biến trở đặt sẵn trên giấy kẻ ô; học sinh chạm (hoặc kéo) từ chốt này sang chốt kia
  để nối dây, dây tự đi vuông góc và né kí hiệu. "Kiểm tra" **giải mạch thật** (`solveDC`) nên nối
  theo thứ tự nào cũng được miễn đúng vật lí; sai thì chỉ ra đúng lỗi và tô đỏ chỗ sai: chân chưa nối,
  phần tử bị nối tắt, ampe kế song song / nối thẳng vào nguồn, vôn kế nối tiếp hoặc không song song với
  phần tử cần đo, K không nằm trên mạch chính, đồng hồ đảo cực. Đúng thì K đóng, dòng điện chạy trên
  dây và đồng hồ hiện số (Bài 23: 40,0 mA · 6,00 V; Bài 26: 50,0 mA · 1,45 V). Có Hoàn tác, Xoá hết, Gợi ý
  (sau lần kiểm tra sai đầu tiên; sai từ 2 lần thì xem được cả sơ đồ mẫu).
- **Tính toán gốc** (`prelab/CalcDrills.tsx` + `calcDrillData.ts`): Bài 23 — I = U/R, R = U/I, đọc R từ
  hệ số góc đồ thị I–U; Bài 26 — dòng toàn mạch, số chỉ vôn kế U = E − I·r, tìm E và r từ hai lần đo. Nhận
  dấu phẩy thập phân; sai thì nhắc đúng lỗi quen (quên đổi mA, đảo công thức, quên R₀ hay r…), sai 2 lần
  thì xem được lời giải. Số liệu cố ý khác sơ đồ và khác Lab để không lộ kết quả đo. Nấc Ω giải thích đúng cách đo điện trở: tự đổi thang, hở
mạch hiện OL, chỉ đo khi đoạn mạch không có nguồn, không đo được điện trở trong của pin.

**Bài 15** (`prelab/NewtonPrelab.tsx`) — 6 mục, bám SGK:

1. **Hình 15.2 chạm để khám phá** — vẽ lại đúng bố trí SGK bằng các linh kiện của Phòng Lab, 10 điểm đánh
   số (1)–(9) + "xe"; chạm vào số nào thì dụng cụ đó sáng lên kèm tên và vai trò; đếm đã khám phá x/10.
2. **Máy nén khí** (bơm khí) — bật công tắc và vặn núm lưu lượng ngay trên hình; 6 nhãn a–f (công tắc, núm
   lưu lượng, quạt thổi, ống dẫn khí, lỗ khí trên máng, đệm khí) chạm để xem vai trò; lát cắt phóng to dưới xe
   cho thấy khí phụt qua lỗ nâng đáy xe (tắt: xe cọ máng · nấc 1: đệm mỏng · nấc 2: ≈ 0,1 mm · nấc 3: dày hơn);
   3 lưu ý dùng máy (bật máy trước khi đặt xe, không bịt lỗ khí, tắt máy khi không đo).
3. **Thử đệm khí** — "Đẩy nhẹ xe" ở từng nấc: máy tắt xe dừng sau ~12 cm (μ = 0,2), nấc 1 vẫn bị hãm (μ = 0,05),
   nấc 2 xe trượt hết máng. Dẫn tới lí do phải đủ đệm khí: F phải gần như là hợp lực.
4. **Đồng hồ MODE A↔B** — dùng lại `MC964Interactive`.
5. **Vì sao sát cổng 1** (mục *Lưu ý* của SGK) — thanh trượt cho xe xuất phát lùi 0–5 cm khỏi cổng 1, chạy
   mô hình thật (`newtonRun`) để thấy a = 2s/t² lệch bao nhiêu (lùi 2 cm → sai ~+35 %); kèm cách đo khác
   của SGK: tấm chắn 1 cm, a = (v₂² − v₁²)/(2s).
6. **Tính toán** (bắt buộc, `CALC_DRILLS.newton2`) — F và M + m của hệ (bắt lỗi quên nhân g, quên quả
   treo), a = 2s/t² với t = 0,64 s (lỗi s/t, 2s/t, s/t²), tăng F mà giữ M + m (lỗi lấy thêm quả từ hộp).

Nút "Vào phòng Lab" chỉ mở khi xong thao tác bắt buộc; Prelab đã qua được nhớ theo bài.

**Thanh "Bước x / n"** của Prelab dính sát đáy màn hình: khi đang làm Prelab, trên điện thoại thanh
điều hướng dưới được ẩn (đã có nút ← về danh sách bài) và vùng cuộn không còn chừa chỗ hai lần.

---

## 8. Phòng Lab — bàn thí nghiệm tương tác

`lab/LabHub.tsx` liệt kê bài đang mở (theo `labCatalog.ts`, sắp theo lớp rồi số bài). `lab/LabRoom.tsx`
định tuyến theo `spec.id` tới 5 bàn:

| Bài | Bàn | Nội dung chính |
|---|---|---|
| 6 | `LabBench.jsx` | Giá đỡ trái/phải, máng nghiêng có thước, dây dọi đo góc, nam châm, 2 cổng quang E/F, MC964. Cân bằng máng bằng vít chân giá, nối dây cổng quang vào ổ A/B, bật nguồn, chọn MODE, thả bi; đổi θ và quãng EF theo đề. |
| 11 | `FreeFallBench.jsx` | Giá đứng có thước và vít cân bằng, nam châm điện, cổng quang trượt dọc thước, hộp công tắc, trụ thép. Cân bằng bằng dây dọi, nối hộp công tắc và cổng quang vào MC964, nhả nam châm cho trụ rơi. |
| 15 | `NewtonBench.jsx` | Đúng Hình 15.2: máng đệm khí có thước + ống thuỷ, máy nén khí (công tắc + núm lưu lượng 1–3), ròng rọc ở mép bàn, xe trượt 200 g + tấm chắn 10 cm, 2 cổng quang (kéo cổng 2 tới đúng 50 cm), đồng hồ hiện số, cân điện tử, hộp 10 quả nặng 50 g. **Nghịch như thật**: bấm vào xe là tay giữ (kéo đi đâu cũng được), chạm lần nữa / "Thả tay" là buông — xe chạy ngay theo lực thật; xe đang chạy chụp lại được; **tự kéo từng quả nặng** từ hộp lên móc treo hoặc lên xe (và kéo về); tay không giữ xe mà treo thêm quả thì xe chạy luôn. Đồng hồ chạy theo **tín hiệu cổng quang**: kéo xe bằng tay qua cổng cũng làm đồng hồ chạy/dừng, giữ xe giữa hai cổng đồng hồ vẫn đếm → phải đặt xe xong mới Reset. Đo 5 cột Bảng 15.1 (chip ①–⑤ và nút "Xe → móc" là đường tắt), xe chiếu chậm ×3, quả treo rơi xuống đệm hứng dưới sàn (dây chùng thì hết lực kéo). Hai đồ thị sống như Hình 15.3a/b. |
| 23 | `ElectricalBench.jsx` | Nguồn DC 0–10 V, 2 đồng hồ đa năng (ampe kế nấc mA/µA, vôn kế), khoá K, vật dẫn X và Y. Để K đóng lâu ở điện áp cao thì vật dẫn nóng lên (nhiệt kế hiện trên bàn), R tăng; mở K thì nguội. |
| 26 | `EmfBench.jsx` | Bảng mạch 216 nút (9 nút một mạng), pin, khoá K, R₀ = 10 Ω, biến trở A–C–B, 2 đồng hồ đa năng nối bằng dây. Lắp mạch tự do, mạch được giải thật: vôn kế mắc ngược chỉ số âm; ampe kế mắc song song với pin thì không đóng được K (sẽ cháy cầu chì). Đo đủ pin mới và pin cũ; đồ thị U–I cập nhật ngay khi ghi điểm (`electric/EmfGraph.jsx`). |

**Đồng hồ đa năng (Bài 23, 26)** — nấc V, mA, µA và Ω:

- Ω đo thật: bơm dòng thử 1 mA từ lỗ VΩ về COM rồi giải mạch; tự đổi thang Ω/kΩ/MΩ, hở mạch (≥ 20 MΩ)
  hiện OL.
- Đoạn đang đo còn nguồn (điện áp giữa hai que > 5 mV) thì số Ω sai lệch, màn hình viền vàng và nháy
  dấu cảnh báo, như đồng hồ thật khi đo điện trở trong mạch có điện.
- Các mốc khám phá (đo qua pin, đo R₀, đo biến trở, đo khoá K, đo khi mạch còn điện) hiện thông báo.

**Điện thoại: tự xoay ngang** (`lib/orientation.ts`, `lab/RotatePrompt.tsx`)

- Bấm vào bàn thí nghiệm (nút "Vào phòng Lab", hoặc "Vào phòng Lab" cuối Prelab) → xin toàn màn hình rồi
  `screen.orientation.lock("landscape")`. Việc này phải nằm ngay trong cú bấm, và chỉ Android Chrome hỗ trợ.
- Vào Lab mà máy vẫn cầm dọc (iPhone, hoặc mở lại trang giữa chừng) → màn nhắc "Xoay ngang điện thoại"
  (Android có nút "Xoay ngang tự động"; iPhone hướng dẫn tắt khoá xoay). Có nút "Vẫn dùng màn hình dọc".
- Tour Phòng Lab đợi xoay xong mới hiện. Rời Lab → mở khoá hướng và thoát toàn màn hình.

**Điện thoại xoay ngang: cột hướng dẫn + khung hình tự nới** (`LabChrome.jsx`, `lab/stageFit.js`)

- `MobileLabSheet` khi máy nằm ngang không còn là thanh kéo nổi đè lên bàn nữa mà thành **cột hướng dẫn**
  gắn cạnh phải (ô lưới `auto`, xem `mobileLabColumns`): thẻ bước tiếp theo bản gọn (chặng hiện thành một
  dòng chữ), số liệu, đồ thị. Nút » thu cột còn dải 46 px (chặng + nút chính); lựa chọn nhớ theo máy
  (`phylab.labDock.v1`) — bàn điện bè ngang nên nhiều em thích thu cột cho bàn to hơn. Cầm dọc vẫn là thanh
  kéo ở đáy như cũ.
- `fitViewBox(roi, khung, cảnh)` nới vùng cần thấy theo đúng tỉ lệ khung (`useBoxSize` đo bằng
  ResizeObserver) → không còn dải trống hai bên; nền bàn vẽ tràn (`BenchBackdrop bleed`, sàn điện kéo dài)
  nên phần nới ra vẫn liền mặt bàn.
- Kéo thả trên bàn đổi toạ độ qua ma trận màn hình của SVG (`svgPoint`, `svgScale`) — đúng cả khi viewBox
  bị nới/cắt hay có viền (trước đây Bài 6, 11 tính tay theo khung nên lệch khi phóng to trên điện thoại).

**Chung cho 5 bàn**

- Kéo–thả dụng cụ từ khay, gợi ý chỗ đặt; thông báo `LabToast` (`LabChrome.jsx`) có icon theo loại:
  đạt mốc, cảnh báo, thông tin.
- Số đo sinh từ engine vật lý (mục 9), làm tròn theo độ chia của dụng cụ.
- Đề (mục tiêu đo) sinh riêng theo tên HS (mục 13) hoặc do giáo viên giao (mục 20.3).
- Nút "Lưu vào Sổ Báo Cáo" gom số liệu các lần đo sang mục 10; thoát khi còn số đo chưa lưu thì được
  nhắc.

**Dụng cụ SVG** — component React, không còn ảnh rời:

- `lab/mech/MechParts.jsx` (cơ học): `BenchBackdrop`, `Rail6`, `StandLeft6`/`StandRight6`,
  `StandScrew6`, `Photogate6`, `Magnet6`, `SteelBall`, `Plumb6`, `FallRail11`, `Magnet11`, `Plumb11`,
  `SteelCylinder`, `Photogate11`, `SwitchBox11`, `MC964Face` (dùng chung với Prelab), `MechIcon` (icon
  cho khay dụng cụ và bóng khi kéo).
- `lab/electric/`: `ElectricParts.jsx` (đồng hồ đa năng, `ohmDisplay`), `BoardParts.jsx` (linh kiện cắm
  bảng), `boardGeometry.js` (toạ độ lưới), `emfBoard.js` (mô hình mạch Bài 26).
- Không dùng `filter` SVG; bóng đổ là hình lệch bán trong suốt; id gradient lấy từ `useId()`.

**Hiệu năng** — Bài 26 từng chỉ ~22 FPS vì `feDropShadow` trên ảnh bảng mạch bị vẽ lại mỗi khung hình
khi có animation SMIL. Sau khi bỏ filter (`public/lab/electric/circuit-board.svg` còn 24 KB), tách cảnh
thành các lớp `React.memo` (nền bảng, linh kiện, dòng điện, đồng hồ, dây, lỗ cắm) và giữ handler ổn
định qua ref, bàn chạy ~95 FPS. MC964 cũng tách: thân máy memo riêng, chỉ khối LED đổi theo thời gian.

---

## 9. Lõi vật lý (physics engine)

Nhiễu dùng chung ở `engine/noise.js`: `gauss` (Box–Muller, cắt ở ±2,5σ), `jitter`, `quantize` (làm
tròn theo độ chia dụng cụ).

**Bài 6** (`engine/physics.js`):
- Bi lăn không trượt trên máng nghiêng: **a = (5/7)·g·sinθ**, g = 9,8, θ từ 5° đến 35°.
- Bi thả ở nam châm nên vẫn tăng tốc giữa E và F: x = x₀ + ½·a·t²; cổng bị chắn khi tâm bi cách cổng
  < d/2 (d lấy từ thước kẹp Prelab, 15–22 mm, cố định theo tên HS).
- Sai số mỗi lượt: σ gia tốc 0,6%, vị trí thả 0,8 mm, trễ cổng quang 0,25 ms. Máng chưa cân bằng: gia
  tốc giảm ~3,5% và tản mạnh; thả khi máng còn rung: tản thêm.
- 2 thang MC964: 9,999 s (0,001 s) và 99,99 s (0,01 s).

**Bài 11** (`engine/physicsFreeFall.js`):
- Rơi tự do: **s = ½·g·t²** ⟹ **g = 2s/t²**.
- Từ dư của nam châm làm trụ rời chậm ~1 ms sau khi đồng hồ đếm, nên g đo được hơi nhỏ (~9,7 m/s²) như
  trên lớp. Thả khi trụ còn đung đưa hoặc giá chưa cân bằng: t lớn hơn và tản mạnh.
- `fitFreeFall`: hồi quy s theo t² qua gốc toạ độ, g = 2·hệ số góc kèm sai số chuẩn.

**Bài 15** (`engine/physicsNewton2.js`):
- Hệ vật = xe M = 200 g + quả trên xe + quả treo (mỗi quả 50 g); lực kéo SGK F = n_treo × 0,5 N (g ≈ 10).
  Chuyển động dùng g = 9,8, ròng rọc có khối lượng tương đương 3 g và lực cản đệm khí 0,004 N → a đo được
  thấp hơn F/(M + m) ~3 %, t của 5 cột khớp Bảng 15.1 trong 0,015 s (0,557 · 0,643 · 0,718 · 0,507 · 0,414 s).
- `planMotion` (bàn Lab): buông tay tại x₀ bất kì → các pha gia tốc không đổi: dây căng (trueAccel + nhiễu),
  dây chùng khi quả chạm đệm hứng (chỉ còn ma sát/lực cản), dừng ở đệm cao su cuối máng; trả `xAt`, `vAt`,
  `timeAtX` để tính đúng thời điểm tấm chắn tới từng tia (đồng hồ MC964 xử lí theo sự kiện). Buông khi dây
  chùng hay lực kéo không thắng ma sát nghỉ → xe đứng yên. Máy nén khí 4 nấc (`frictionOf`): tắt μ = 0,2/0,26,
  yếu μ = 0,05/0,07, vừa/mạnh chỉ còn lực cản đệm khí.
- `newtonRun`: xe xuất phát cách cổng 1 quãng d (0 = sát cổng); quả treo chạm đệm hứng sau quãng `drop`
  thì hết lực kéo, xe chạy đều. `countWindows` theo MODE (A↔B = từ cổng 1 tới cổng 2; A/B = thời gian tấm
  chắn che một cổng). Nhiễu: σ gia tốc 0,4 %, tay thả lệch vài chục µm, trễ cổng quang 0,2 ms.
- Làm ẩu: tắt bơm → ma sát trượt μ = 0,2 (nghỉ 0,26 — cột 3 xe không nhúc nhích); máng chưa ngang → dốc
  ngược 0,45°; d = 2 cm → a = 2s/t² lớn hơn thật ~35 %.
- `fitOrigin`: đường qua gốc cho a–F (1/k ≈ M + m) và a–1/(M + m) (k ≈ F).

**Bài 23** (`engine/physicsElectric.ts`):
- Vật dẫn X = 120 Ω, Y = 220 Ω. Nguồn có sai lệch hiệu chuẩn 0,4% và điện trở trong 0,3 Ω; ampe kế nấc
  mA có shunt 2 Ω nên U đọc trên vôn kế luôn hơi khác số trên núm nguồn.
- Nhiệt: công suất trên vật dẫn làm R tăng tối đa ~3% (τ nóng 14 s, τ nguội 8 s; `heatedResistance`,
  `stepHeat`) — định luật Ohm chỉ đúng khi nhiệt độ ổn định.

**Bài 26** (`engine/circuit.js`, `lab/electric/emfBoard.js`):
- `solveDC`: giải mạch DC theo điện thế nút (ma trận dẫn nạp + nguồn dòng, `gmin` để nút hở không làm
  suy biến).
- `solveBoard`: gộp nút cùng mạng (union-find), linh kiện cắm bảng và dây nối thành mạch rồi giải. Ampe
  kế có shunt 2 Ω (mA) / 100 Ω (µA), cầu chì 0,4 A; vôn kế 10 MΩ. `analyzeBoard` chỉ ra chỗ cần nối tiếp
  theo cho phần gợi ý.
- Ôm kế: giải lại mạch với nguồn dòng thử 1 mA (chồng chất) → R = ΔU/I; điện áp hở > 5 mV thì báo
  "đang có điện"; ≥ 20 MΩ hiện OL.
- Pin mới có E theo tên HS (`seededCellEmf`, 1,40–1,60 V), r ≈ 1,2–1,5 Ω; pin cũ E thấp hơn ~0,11 V,
  r ≈ 3,3–3,8 Ω — đồ thị pin cũ dốc hơn.

Các hằng số hình học và bộ số liệu gợi ý (`SUGGESTED`) đặt trong engine, chỉnh dễ dàng.

---

## 10. Sổ Báo Cáo — số liệu, đồ thị, báo cáo, ôn tập

`NoteSection.tsx` (làm lại 2026-09) vừa một màn hình laptop, không phải cuộn trang.

- **Thanh trên** — chọn bài (`LessonPicker`: menu chia theo lớp, chấm màu cho bài có số liệu mới hoặc
  đã lưu), trạng thái, 3 chế độ xem *Sổ · Báo cáo · Ôn tập*, nút **Lưu báo cáo** (thành **Lưu & nộp**
  khi bài thuộc một bài Lab giáo viên giao, xem 20.3). Xoá số liệu dùng thanh xác nhận ngay trong trang.
- **Sổ** — cột trái: thẻ kết quả (trung bình ± sai số, độ lệch so với giá trị tham chiếu, dải chấm các
  lần đo) và bảng số liệu gọn theo bài; HS tự điền kết quả tính từng lần (Bài 26 lấy E, r từ đồ thị).
  Cột phải: đồ thị (`notes/NotebookGraph.tsx`) và phần đọc kết quả hồi quy. Số liệu lấy theo thứ tự: vừa
  lưu từ Lab → báo cáo gần nhất → bộ số liệu mẫu (đúng vật lý, có ghi chú "số liệu mẫu").
- **Báo cáo** — trang A4 in được: I. Mục đích, II. Số liệu đo & kết quả tính, III. Đồ thị & xử lý số
  liệu, IV. Nhận xét & kết luận (ô ghi chú HS gõ, cũng được in). Nút **Xuất PDF / In** = `window.print()`
  với print-CSS riêng (ẩn khung app, khổ A4).
- **Ôn tập** — Flashcard và trắc nghiệm theo bài từ `data/quizBank.ts` (đủ 5 bài; Bài 15 lấy câu hỏi SGK).

**Đồ thị theo bài** (`notes/notebookData.ts` → `buildChart`, cột bảng ở `columnsFor`):

| Bài | Trục | Đường thẳng | Suy ra |
|---|---|---|---|
| 6 | v̄ theo sEF, mỗi góc θ một chuỗi | kéo dài tới sEF = 0 | v tại E = tung độ gốc, so với v tức thời đo ở MODE A |
| 11 | s theo t² | qua gốc toạ độ | g = 2·hệ số góc |
| 23 | I (mA) theo U, chuỗi X và Y | qua gốc toạ độ | R = 1000 / hệ số góc |
| 26 | U theo I (mA), pin mới và pin cũ | kéo dài tới I = 0 | E = tung độ gốc, r = −hệ số góc × 1000 |
| 15 | 3 đồ thị (nút chọn): a theo F khi M + m = 0,5 kg · a theo 1/(M + m) khi F = 1 N · a theo F/(M + m) mọi lần đo | qua gốc toạ độ | 1/k ≈ M + m; k ≈ F; độ dốc ≈ 1 (a = F/m). Bảng không lấy trung bình vì mỗi dòng là một cấu hình; số liệu mẫu là đúng Bảng 15.1 |

**Hai chế độ đồ thị** (`NotebookGraph`):
- *Máy vẽ* — bình phương tối thiểu (có tuỳ chọn qua gốc), R², trục chia "đẹp" (`niceRange`), giấy kẻ ô
  có vạch phụ, phương trình đặt trên hình khi chỉ có một đường, nhiều chuỗi thì chú thích và phương trình
  để ngoài hình cho khỏi đè.
- *Em tự vẽ* — HS chấm từng điểm (bắt dính theo 1/10 ô lớn, có toạ độ theo con trỏ). Điểm lệch quá 3,5%
  bề rộng trục hiện đỏ kèm vòng mờ chỉ vị trí đúng. Sau đó kéo 2 tay nắm để đặt đường thẳng (đồ thị qua gốc thì ghim đầu
  trái ở gốc), rồi bấm "So với máy" để hiện đường hồi quy và độ lệch hệ số góc. Có Hoàn tác và Vẽ lại.
- viewBox tính theo kích thước thật của khung (`ResizeObserver`) nên chữ và điểm không bị co nhỏ.

`GraphPlotter.tsx` và `AiChat.tsx` cũ vẫn còn trong `components/notes/` nhưng không còn được dùng.

---

## 11. Hệ thống chấm điểm deterministic

> **Trạng thái (2026-09-23):** phần chấm điểm đã **ẩn khỏi giao diện học sinh** để làm lại (Sổ Báo Cáo
> chỉ còn Lưu / Lưu & nộp). Logic dưới đây vẫn nguyên và vẫn chạy phía server: bài nộp cho giáo viên
> được `gradeLesson` chấm lại (mục 20.3). Bài 23/26 thêm các loại số liệu `ohm-x`, `ohm-y`, `emf`.

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

> **Trạng thái (2026-09-23):** ô chat với trợ lý đã ẩn khỏi giao diện học sinh để làm lại
> (`notes/AiChat.tsx` còn nhưng không được dùng). API và cơ chế dự phòng dưới đây giữ nguyên.

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
│  ├─ layout.tsx, page.tsx, globals.css      # shell + điều hướng + style (print CSS, keyframes)
│  ├─ gioi-thieu/page.tsx                    # trang giới thiệu (danh sách bài viết tay)
│  └─ api/
│     ├─ vnpt/{chat,ocr,ekyc,tts,status}/    # proxy AI VNPT (server-side)
│     ├─ class/[action]/route.ts             # toàn bộ API lớp học (Node runtime)
│     └─ auth/login/                         # đăng nhập HS/GV
├─ data/
│  ├─ labCatalog.ts  # DANH MỤC BÀI — nguồn duy nhất cho Home, LabHub, Quét, Sổ Báo Cáo
│  └─ quizBank.ts    # flashcard + trắc nghiệm ôn tập (4 bài)
├─ experiments/specs.ts   # đặc tả 4 bài (lý thuyết, dụng cụ, bước, sổ số liệu, homework)
├─ engine/
│  ├─ physics.js                                  # Bài 6
│  ├─ physicsFreeFall.js                          # Bài 11
│  ├─ physicsElectric.ts                          # Bài 23 (+ hằng số điện dùng chung)
│  ├─ circuit.js     # solveDC (điện thế nút) + union-find — Bài 26
│  ├─ noise.js       # gauss / jitter / quantize dùng chung
│  └─ smartbot.js (thoại hướng dẫn rule-based), tokens.js (màu, font của bàn Lab)
├─ components/
│  ├─ HomeScreen, ScanScreen, Prelab, NoteSection, LoginScreen, Logo
│  ├─ lab/
│  │  ├─ LabHub.tsx, LabRoom.tsx, LabChrome.jsx (toast, khung), LiveGraph.jsx (niceRange)
│  │  ├─ LabBench.jsx (6), FreeFallBench.jsx (11), ElectricalBench.jsx (23), EmfBench.jsx (26)
│  │  ├─ mech/MechParts.jsx       # dụng cụ cơ học SVG + MC964Face + MechIcon
│  │  ├─ electric/                # ElectricParts, BoardParts, boardGeometry, emfBoard, EmfGraph
│  │  └─ animStore.js, labSound.js, useTTS.ts
│  ├─ prelab/        # PrelabShell, PhotogatePrelab, MC964Prelab (+CaliperZoom), PlumbBasePrelab,
│  │                 # ElectricalPrelab, CircuitSketch (vẽ sơ đồ), CalcDrills + calcDrillData
│  ├─ tour/          # GuidedTour, tours (nội dung các tour), SafetyDeck, HazardHunt, Mascot, HelpMenu
│  ├─ notes/         # notebookData.ts (fitLine, buildChart, columnsFor), NotebookGraph.tsx
│  ├─ student/, teacher/   # lớp học (mục 20)
│  └─ Latex.tsx      # KaTeX + **bold**
├─ lib/
│  ├─ grading.ts     # chấm điểm deterministic (server dùng cho bài nộp)
│  ├─ vnpt-smartbot.ts, labKnowledge.ts (RAG), lessonMatch.ts (nhận diện bài từ OCR)
│  ├─ problemGen.ts, seededRandom.ts       # ra đề theo HS / đề GV giao
│  ├─ moeQuiz.ts, antiCheatQuiz.ts         # quiz form Bộ GD, quiz chống gian lận
│  ├─ db.ts (+ db-d1, db-file, db-memory), auth.ts, activity.ts, useMyClass.ts
│  ├─ schematic.ts   # sơ đồ mạch Prelab: dụng cụ, định tuyến dây, chấm bằng giải mạch
│  ├─ tourState.ts   # đã xem tour nào, huy hiệu (theo người dùng, localStorage)
│  ├─ features.ts    # cờ tính năng (classroom: tạm khoá)
│  ├─ security.ts    # sanitize/limits/file-check
│  └─ types.ts, classTypes.ts
docs/                # tài liệu (file này, rubric chấm, training bot, tích hợp VNPT)
scripts/             # test.mjs, test-class.mjs, test-all.mjs, test-smartbot.mjs, demo.js
```

**Mã cũ không còn dùng** (giữ lại, chưa xoá): `components/Bench.tsx`, `DataBook.tsx`,
`HomeworkSection.tsx`, `notes/GraphPlotter.tsx`, `notes/AiChat.tsx` (chờ làm lại chat),
`engine/physics/{inclinedPlane,freeFall}.ts`, các thư mục `components/dungcuthinghiem/` và
`src/instruments/` (bộ dụng cụ đời đầu, đã thay bằng `lab/mech/`).

---

## 18. Kiểm thử

- `npm run test:all -- --no-api` — chạy **offline** toàn bộ phần unit, không cần server hay mạng. Kết
  quả hiện tại (2026-09-25): `21 PASS · 0 FAIL · 3 cảnh báo` (3 cảnh báo là các phần API bị bỏ qua).
  - Grading (19 kiểm tra) — băng điểm, dung sai 1%, tối thiểu 3 lần đo, phạt chưa cân bằng, đo sai
    cấu hình GV giao, tỉ lệ 70/30.
  - `scripts/test.mjs` (39 kiểm tra) — cơ học (máng nghiêng, MC964, rơi tự do, nhiễu không trùng nhưng
    σ ≤ 3 ms, trụ đung đưa, máng chưa cân bằng, đường kính bi theo tên), điện (sụt áp ampe kế, vật dẫn
    nóng, `solveDC`, bảng mạch Bài 26, ôm kế: qua pin, R₀ khi K mở/đóng, chưa nối dây), Prelab điện
    (sơ đồ mẫu Bài 23/26, đổi chỗ đồng hồ, ampe kế đảo cực, K song song; bài tính nhận dấu phẩy, nhắc
    đúng lỗi quên đổi mA), RAG.
  - `scripts/test-class.mjs` (26 kiểm tra) — lớp học (mục 20.7).
- `npm test` — chỉ `scripts/test.mjs` (thêm `-- --no-api` nếu không có dev server).
- `npm run test:smartbot` — 4 kiểm tra đường fallback `/api/vnpt/chat`.
- `npm run test:all` (không cờ) — thêm API fallback và **chẩn đoán SmartBot trực tiếp** (đọc
  `.env.local`, thử 3 chiến lược, kết luận bot có bật "tri thức nâng cao" không).
- Kiểm tra tĩnh: `npx tsc --noEmit` và `npm run lint`.

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

> **Trạng thái (2026-09-25): TẠM KHOÁ** bằng `FEATURES.classroom = false` (`src/lib/features.ts`): mục
> *Lớp của tôi* hiện ổ khoá, `useMyClass` và nhật ký hoạt động không chạy, tài khoản giáo viên thấy màn
> "tạm khoá" thay cho bảng điều khiển. Code, API và test lớp học giữ nguyên; đổi cờ là mở lại.
> `components/tour/tours.tsx` có sẵn `teacherTour()` để gắn vào `TeacherShell` khi mở lại.

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

- `teacher/LabAssignmentComposer.tsx`: GV chọn 1 trong 4 bài và tự đặt mục tiêu đo — θ và sEF (Bài 6),
  s (Bài 11), 5 mức điện áp cho cả vật dẫn X và Y (Bài 23), 5 mức biến trở để thu các cặp U–I (Bài 26)
  — thấy ngay **đáp án mong đợi** tính từ physics engine (`theoreticalOf`), HS không thấy.
- Khi HS trong lớp mở đúng bài lab: đề GV **thay thế** đề seeded/AI —
  `buildAssignedSet` (`lib/problemGen.ts`) override tại `LabBench.jsx` / `FreeFallBench.jsx`
  (prop `assignedSets` chảy từ `page.tsx` hook `useMyClass` → `LabRoom`). HS ngoài lớp/không có
  bài giao vẫn nhận đề seeded như cũ.
- **Nộp bài**: HS bấm **Lưu & nộp** ở Sổ Báo Cáo (nút tự đổi nhãn khi bài thuộc bài Lab được giao) →
  `page.tsx handleReportSaved` POST `submit-lab`; server **tự chấm bằng `gradeLesson`** (không tin điểm
  client), UPSERT giữ bản mới nhất + đếm số lần nộp.

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

### 21.1. Bài lab mới

- Đã xong Bài 15 *Định luật 2 Newton* (lớp 10) cùng 2 bài lớp 11 (Bài 23, Bài 26), tổng cộng **5 bài đang mở**.
- Đang chờ bàn thí nghiệm — đã có trong `labCatalog.ts` với `status: "soon"` và hiện ở dải "Sắp ra
  mắt": Bài 19 *Bảo toàn động lượng* (lớp 10), Bài 22 *Tiêu cự thấu kính hội tụ* (lớp 11), Bài 15
  *Giao thoa ánh sáng* (lớp 12).
- **Quy trình thêm bài**: xem `README.md` → *Thêm bài thí nghiệm mới*. Tóm tắt phần bắt buộc:
  1. `data/labCatalog.ts` — thêm dòng (`soon` → `open` khi bàn chạy được). Mọi màn tự hiện bài.
  2. `lib/types.ts` — thêm vào `LessonId` và `RichTrial["lab"]`.
  3. `experiments/specs.ts` — `ExperimentSpec` (lý thuyết, dụng cụ, bước, sổ số liệu, homework).
  4. `engine/` — mô hình vật lý; nhiễu lấy từ `noise.js`, mạch điện dùng `solveDC`.
  5. `components/lab/<Tên>Bench.jsx` + định tuyến trong `LabRoom.tsx`; dụng cụ mới là component SVG
     trong `lab/mech/` hoặc `lab/electric/` (không `filter`, id từ `useId()`).
  6. `notes/notebookData.ts` (`columnsFor`, `buildChart` hoặc `buildCharts` khi bài có nhiều đồ thị) và
     `NoteSection.tsx` (công thức, thẻ kết quả, số liệu mẫu); `LabKind` trong `grading.ts`.
  7. `scripts/test.mjs` — test vật lý cho bài.
- **Nên có**: Prelab (`components/prelab/` + nhánh trong `Prelab.tsx`), từ khoá quét SGK
  (`lib/lessonMatch.ts`), ôn tập (`data/quizBank.ts`), tri thức trợ lý (`lib/labKnowledge.ts`), phần giáo
  viên (`LabAssignmentComposer.tsx`, `buildAssignedSet`, `LabKind` trong `grading.ts`,
  `antiCheatQuiz.ts`, `LabAssignmentPayload` trong `classTypes.ts`), trang `app/gioi-thieu/page.tsx`.

### 21.2. Việc còn dở

- Mở lại chức năng Lớp học (`FEATURES.classroom`) và gắn `teacherTour()` vào `TeacherShell`.
- Làm lại phần chấm điểm và chat trợ lý phía học sinh (đang ẩn, mục 11–12).
- Cấp lại token VNPT SmartReader (OCR đang trả 401).
- Dọn mã cũ không còn dùng (mục 17) và các lỗi lint cũ trong `app/page.tsx`.
- Cho trang giới thiệu đọc từ `labCatalog.ts` thay vì danh sách viết tay.

---

*Tài liệu này mô tả trạng thái dự án tại 2026-09-25. Điểm số & vật lý là deterministic; AI của VNPT
lo phần ngôn ngữ (nhận xét, hỏi đáp, đọc thoại, OCR, eKYC).*
