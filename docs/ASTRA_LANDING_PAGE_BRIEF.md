# Brief cho Astra — Landing page PhyLab

> Mục tiêu: dựng một trang giới thiệu sản phẩm PhyLab bằng tiếng Việt, đủ đẹp để trình diễn và đủ chính xác với ứng dụng hiện tại. Đây là brief triển khai, không phải bản mô tả mọi tính năng tương lai.

## 1. Bối cảnh sản phẩm

PhyLab là web app thực hành Vật lí tương tác cho học sinh THPT Việt Nam. Học sinh làm quen dụng cụ ở **Prelab**, lắp ráp và đo trong **Phòng Lab**, rồi xử lí số liệu ở **Sổ Báo Cáo**. Giáo viên có khu vực lớp học để giao bài và theo dõi bài nộp. Trọng tâm thông điệp: **được tự tay làm thí nghiệm, hiểu số liệu mình đo, thay vì chỉ xem mô phỏng chạy sẵn**.

Khách xem chính: học sinh lớp 10–11, giáo viên Vật lí và người xem demo dự án. Trang cần khiến họ hiểu sản phẩm trong 5 giây và vào thử app bằng một CTA rõ ràng.

## 2. Phạm vi triển khai

- Tạo landing page ở route **`/gioi-thieu`** trong app Next.js hiện tại. Route `/` đang chứa luồng đăng nhập và app; giữ nguyên để nút **“Vào PhyLab”** dẫn tới `/`.
- Không sửa logic đăng nhập, lab, báo cáo, API hoặc dữ liệu lớp học. Landing dùng nội dung và tài nguyên sẵn có trong repo.
- Trang hoàn chỉnh trên desktop và mobile, không cần backend hay CMS mới. Nếu thêm hiệu ứng, ưu tiên CSS/Framer Motion đã cài và có `prefers-reduced-motion`.
- Không làm landing dạng dashboard. Đây là trang công khai, giàu hình ảnh, có nhịp đọc và câu chuyện sản phẩm.

## 3. Sự thật sản phẩm phải bám theo

| Nội dung | Trạng thái hiện tại | Cách nói trên landing |
|---|---|---|
| 4 bài lab tương tác | Có trong `src/experiments/specs.ts` và `src/components/lab/LabRoom.tsx` | “4 bài thực hành Vật lí 10–11” |
| Bài 6: tốc độ trên máng nghiêng | Có | Nêu như ví dụ trực quan chính |
| Bài 11: gia tốc rơi tự do | Có | Nêu như ví dụ thứ hai |
| Bài 23: điện trở theo định luật Ohm | Có | Card bài lab |
| Bài 26: suất điện động pin điện hóa | Có | Card bài lab |
| Prelab, kéo thả/lắp dụng cụ, đo và ghi số liệu | Có | Trình bày thành hành trình 3 bước |
| Sổ Báo Cáo: bảng số liệu, đồ thị, báo cáo in/PDF qua trình duyệt | Có | Nêu đúng các thao tác người học làm |
| Lớp giáo viên: mã tham gia, giao bài, quiz, theo dõi bài nộp | Có | Một section ngắn cho giáo viên; việc giao đề lab hiện tập trung ở Bài 6/11 |
| Quét trang SGK bằng VNPT OCR | Có nhưng phụ thuộc cấu hình dịch vụ | Chỉ mô tả là khả năng của app; không cam kết luôn hoạt động trong mọi bản demo |
| Chấm điểm và trợ lý AI trên giao diện Sổ Báo Cáo học sinh | Đang gỡ khỏi UI để làm lại, xem đầu `src/components/NoteSection.tsx` | **Không dùng làm headline, hero claim hoặc CTA** |

Tài liệu `docs/PHYLAB_FEATURES.md` và README có đoạn cũ nói chỉ 2 lab hoặc mô tả phần chấm điểm/AI khác UI hiện tại. **Ưu tiên code đang chạy** cho copy và số lượng bài. Không đưa bài đang khóa ở `HomeScreen.tsx` vào danh sách “đã có”. Không tự tạo thống kê người dùng, giải thưởng, lời chứng thực, trường đối tác hay logo đối tác.

## 4. Hướng thiết kế

**Ý tưởng:** “Bàn thí nghiệm mở ra từ trang sách”. Cảm giác ấm, tò mò, giàu chi tiết vật lí; không dùng visual SaaS xanh tím quen thuộc. Giữ nhận diện hiện tại: nền kem `#FBF6EC`, chữ nâu đậm `#321E12`/`#3E2718`, cam đất `#D56A17`/`#C85A17`, trắng giấy. Font Nunito đang có ở `src/app/layout.tsx`; có thể phối một kiểu chữ display nếu thật sự cần, nhưng tiếng Việt phải đẹp và tải ổn.

- **Hero:** bố cục bất đối xứng. Bên trái là headline ngắn + mô tả + CTA. Bên phải là “bàn lab” hoặc khung giao diện được dựng từ asset thật, gợi máng nghiêng/cổng quang/đồng hồ và đường nối số liệu tới đồ thị. Không dùng ảnh stock học sinh cầm ống nghiệm vì sản phẩm là lab Vật lí số.
- **Hệ hình ảnh:** dùng ảnh và SVG hiện có, kết hợp annotation kiểu sổ tay: góc nghiêng `θ`, `t = 0.287 s`, `g = 2s/t²`, đường nét kẻ ô và số thứ tự. Công thức chỉ mang tính minh họa, không giả là số liệu đo live.
- **Bố cục:** thoáng, có điểm nhấn lớn. Section xen kẽ nền giấy/kem/cam nhạt. Card không nên đều tăm tắp từ đầu đến cuối. Có thể dùng một dải ngang “4 bài lab” để tạo nhịp thị giác.
- **Chuyển động:** hover và reveal nhẹ; có microinteraction ở sơ đồ thí nghiệm. Không để motion làm người dùng khó đọc hoặc làm trang nặng.
- **Mobile:** hero đọc được trước ảnh; CTA thấy ngay trên màn đầu, nav gọn và không che nội dung.

## 5. Cấu trúc và copy gợi ý

Copy sau có thể tinh chỉnh câu chữ, nhưng giữ đúng ý và không thêm claim chưa kiểm chứng.

### Header

Logo PhyLab (có thể tái dùng `src/components/Logo.tsx`) · Cách học · Bài thực hành · Dành cho giáo viên · CTA **Vào PhyLab**. Các mục giữa cuộn tới section. Trên mobile dùng menu dễ thao tác.

### Hero

- Eyebrow: **PHÒNG THÍ NGHIỆM VẬT LÍ TƯƠNG TÁC**
- H1: **Tự tay đo. Tự mình hiểu.**
- Mô tả: **Từ lắp dụng cụ, đo số liệu đến vẽ đồ thị và viết báo cáo — PhyLab đưa buổi thực hành Vật lí lên màn hình của bạn.**
- CTA chính: **Vào PhyLab** → `/`
- CTA phụ: **Khám phá cách học** → `#cach-hoc`
- Dòng ngữ cảnh dưới CTA: **4 bài thực hành · Vật lí 10–11 · Học trên trình duyệt**

### Section “Một buổi thực hành, ba chặng” (`#cach-hoc`)

1. **Làm quen trước khi đo** — khám phá dụng cụ và thao tác trong Prelab.
2. **Lắp, chỉnh và thả thử** — tương tác với bàn thí nghiệm, quan sát thời gian và số đo được tạo bởi mô hình vật lí.
3. **Biến số đo thành hiểu biết** — điền bảng, vẽ đồ thị và hoàn thành Sổ Báo Cáo.

Thiết kế như một đường hành trình nối liền, có hình ảnh minh họa từng bước; không chỉ ba ô icon chung chung.

### Section “Chọn hiện tượng muốn khám phá” (`#bai-thuc-hanh`)

Hiện **4 card** lấy tên/chủ đề từ `src/experiments/specs.ts`:

- **Vật lí 10 · Bài 6** — Đo tốc độ tức thời của vật chuyển động (máng nghiêng).
- **Vật lí 10 · Bài 11** — Đo gia tốc rơi tự do.
- **Vật lí 11 · Bài 23** — Đo điện trở theo định luật Ohm.
- **Vật lí 11 · Bài 26** — Đo suất điện động pin điện hóa.

Mỗi card có một câu mô tả cụ thể, ảnh thật từ repo và nút **Vào thực hành** → `/` (vì app hiện cần đăng nhập rồi chọn bài). Đừng tạo deep link tới bài nếu route đó chưa tồn tại.

### Section “Dành cho giáo viên” (`#giao-vien`)

Headline: **Giao bài và nhìn thấy quá trình học của cả lớp.** Mô tả ngắn: tạo lớp bằng mã, giao bài thực hành hoặc quiz, xem bài nộp và mức độ tham gia. Có thể minh họa bằng panel lớp học tự dựng theo UI thật; không phóng đại thành hệ quản trị trường học. CTA **Vào khu vực giáo viên** → `/` (cùng màn đăng nhập, phân quyền theo tài khoản).

### Section “Quét trang sách, tìm đúng bài”

Một điểm nhấn nhỏ cho khả năng quét trang SGK khi dịch vụ OCR đã cấu hình. Mô tả vừa đủ: **Chụp trang bài thực hành để PhyLab gợi ý bài tương ứng.** Tránh hiệu ứng giả vờ quét thành công mọi ảnh.

### CTA cuối và footer

Headline: **Sẵn sàng bước vào phòng lab?** CTA **Bắt đầu với PhyLab** → `/`. Footer: tên sản phẩm, một dòng mô tả ngắn, link tới các section và app. Không cần pricing, form lấy email, testimonial hoặc FAQ giả.

## 6. Tài nguyên trong repo

- Brand: `src/components/Logo.tsx`, `public/images/readme_header.svg`, `public/images/readme_footer.svg`.
- Ảnh lab: `/images/marble_ramp.webp`, `/images/free_fall.webp`, `/images/do-dien-tro-ohm.png`, `/images/do-suat-dien-dong.png`.
- Dụng cụ SVG/PNG: `public/lab/bai6/`, `public/lab/bai11/`, `public/lab/electric/`.
- Visual chung nếu hợp bố cục: `/images/background.webp`, `/images/prism_light.webp`.
- Nội dung chuẩn: `src/experiments/specs.ts`, `src/components/lab/LabHub.tsx`, `src/components/NoteSection.tsx`, `src/components/teacher/`.

Ưu tiên dùng asset sẵn có và CSS/SVG dựng trong code. Nếu cần ảnh mới, chỉ tạo để bổ trợ; giữ đúng kiểu thiết bị/phòng lab số của sản phẩm. Ghi `alt` có ý nghĩa cho ảnh thông tin; ảnh trang trí để `alt=""`.

## 7. Yêu cầu kỹ thuật và nghiệm thu

- Dùng Next.js App Router, React, Tailwind v4 đang có; chỉ thêm dependency khi thật sự cần. Nên giới hạn client component ở nơi có tương tác.
- Không thay đổi route `/` và luồng app. Mọi CTA phải dẫn đúng `/` hoặc anchor có tồn tại. Trạng thái hover/focus rõ, có thể dùng bằng bàn phím.
- Semantic HTML: một H1, thứ tự heading hợp lí, nav/section/footer rõ; contrast đủ đọc. Hỗ trợ `prefers-reduced-motion`.
- Ảnh responsive, không méo, không tràn ngang ở 360px; kiểm tra ít nhất 360px, tablet và desktop. Ưu tiên WebP cho ảnh hero/card khi đã có.
- Có metadata riêng cho `/gioi-thieu` (title, description, Open Graph cơ bản nếu thuận tiện). Copy hoàn toàn tiếng Việt, dấu và thuật ngữ Vật lí nhất quán.
- Chạy `npm run lint` và `npm run build`; nếu lỗi tồn tại sẵn ngoài phần landing, nêu rõ. Mở trang và kiểm tra trực quan desktop/mobile, kiểm CTA và menu.
- Bàn giao mã nguồn, ảnh chụp kiểm tra nếu có, và tóm tắt ngắn các quyết định thiết kế. Không sửa/xóa các thay đổi khác đang có trong working tree.

## 8. Tiêu chí thành công

Người mới nhìn hero hiểu PhyLab là gì; cuộn một lần hiểu hành trình Prelab → Lab → Báo cáo; thấy đúng 4 bài lab và vai trò giáo viên; bấm CTA đến được app hiện tại. Trang có nhận diện riêng của PhyLab và không hứa tính năng UI chưa phát hành.
