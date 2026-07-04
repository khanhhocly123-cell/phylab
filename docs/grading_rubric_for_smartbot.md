# Cách chấm điểm PhyLab — tài liệu cho SmartBot học

> **Mục đích của file này:** đưa cho một LLM (Sonnet) để nó SINH RA dữ liệu huấn luyện (cặp Hỏi–Đáp)
> nạp cho VNPT SmartBot, giúp bot HIỂU cách app chấm điểm và viết NHẬN XÉT đúng tinh thần thang điểm.
>
> **Ranh giới tuyệt đối — SmartBot KHÔNG chấm điểm.** Toàn bộ CON SỐ điểm do máy tính deterministic
> (`src/lib/grading.ts`) tính sẵn và gửi cho bot. Việc của bot chỉ là VIẾT NHẬN XÉT bằng lời dựa trên
> bảng điểm đã có. Bot không được tự bịa/đổi điểm. Mọi dữ liệu train sinh ra phải củng cố nguyên tắc này.

---

## 0. Bối cảnh 2 bài thực hành

| Bài | lessonId | Các mẫu chấm (labKind) | Công thức HS tự tính | Giá trị lý thuyết |
|---|---|---|---|---|
| Bài 6 — Đo tốc độ | `do-toc-do-vat-chuyen-dong` | `average` (v trung bình) + `instant` (v tức thời) | v = s/t | Suy từ engine máng nghiêng (a = 5/7·g·sinθ) |
| Bài 11 — Rơi tự do | `do-gia-toc-roi-tu-do` | `freefall` (gia tốc g) | g = 2s/t² | g = 9,8 m/s² |

- **average:** s = quãng đường sEF giữa 2 cổng E–F (m); kết quả đúng = sEF/t.
- **instant:** s = đường kính bi d (m); kết quả đúng = d/t.
- **freefall:** s = quãng rơi (m); kết quả đúng = 2s/t².
- Bài 6 chấm 2 mẫu rồi lấy **trung bình cộng** điểm 2 mẫu. Bài 11 chỉ 1 mẫu.

---

## 1. Công thức điểm tổng (thang 10, KHẮT KHE)

```
Điểm thí nghiệm (mỗi mẫu) = Số liệu×70% + Trình tự×20% + Sai số×10%
Điểm thí nghiệm cả bài     = trung bình cộng điểm các mẫu
Điểm TỔNG                  = Điểm thí nghiệm × 70% + Điểm đồ thị × 30%
```

- **Đồ thị là BẮT BUỘC.** HS phải tự vẽ đồ thị và bấm "Chấm đồ thị" thì mới nộp được báo cáo.
  Chưa vẽ → app chặn, không cho nộp.
- 3 thành phần con (Số liệu / Trình tự / Sai số) đều thang 0..10, tính riêng cho từng mẫu.

---

## 2. Ba thành phần con

### 2.1 Số liệu (70%) — HS tự tính có đúng công thức không
- Với mỗi lần đo, so sánh **kết quả HS tự điền** với **kết quả đúng theo công thức** từ chính (s, t) HS đo.
- Độ chính xác 1 lần = `100 − |HS − đúng| / đúng × 100` (%), kẹp trong [0, 100].
- **Ô bỏ trống → 0% cho lần đo đó** (bị phạt nặng).
- Lấy trung bình % của các lần → tra **bảng băng điểm** (mục 3) ra điểm Số liệu.
- **Phạt thiếu lần đo:** cần tối thiểu **3 lần đo/mẫu**. Thiếu mỗi lần trừ **2 điểm** Số liệu.

### 2.2 Trình tự (20%) — thao tác có đúng quy trình không
- Tiêu chí chính: **máng/giá đã cân bằng khi đo chưa**.
- Bắt đầu 10 điểm, **mỗi lần đo khi CHƯA cân bằng trừ 2,5 điểm**. Kẹp trong [0, 10].
- Ví dụ: 2 lần đo lúc chưa cân bằng → 10 − 2×2,5 = **5 điểm** trình tự.

### 2.3 Sai số (10%) — số đo có sát lý thuyết không
- So sánh **kết quả đúng theo công thức** (từ s, t HS đo) với **giá trị lý thuyết** (g=9,8 hoặc v suy từ engine).
- Độ sát 1 lần = `100 − |đúng − lýthuyết| / lýthuyết × 100` (%).
- Trung bình % các lần → tra **bảng băng điểm** ra điểm Sai số.
- Đây là chỗ phản ánh chất lượng phép ĐO (nhiễu, thao tác), khác với 2.1 phản ánh chất lượng TÍNH.

---

## 3. Bảng băng điểm theo độ sát (KHẮT KHE)

Dùng cho cả **Số liệu** và **Sai số** (biến % độ sát → điểm 0..10):

| Độ sát (%) | Điểm |
|---|---|
| ≥ 98 | 10 |
| ≥ 95 | 9 |
| ≥ 90 | 8 |
| ≥ 80 | 6,5 |
| ≥ 70 | 5 |
| < 70 | 3 |

- **Dung sai để ô "Kết quả tính" hiện chữ "Đúng":** lệch ≤ **1%** so với công thức. Lệch hơn → "Lệch".
  (Lưu ý: chữ "Đúng/Lệch" chỉ là nhãn hiển thị; điểm Số liệu vẫn tính theo % độ sát ở bảng trên,
  không phải đếm số ô "Đúng".)

---

## 4. Ví dụ đã tính sẵn (để Sonnet bắt chước giọng + con số)

### Ví dụ A — Bài 11, làm tốt
- 3 lần đo rơi tự do, cân bằng đủ, HS tự tính g khớp công thức gần như tuyệt đối, số đo sát 9,8.
- Số liệu 10/10 · Trình tự 10/10 · Sai số 10/10 → Điểm thí nghiệm **10/10**.
- Đồ thị s theo t² vẽ thẳng, khớp → Điểm đồ thị 9/10.
- **Tổng = 10×0,7 + 9×0,3 = 9,7/10.**

### Ví dụ B — Bài 11, thao tác ẩu
- 3 lần đo nhưng **2 lần đo khi máng chưa cân bằng**; HS tính đúng công thức; số đo lệch ~3% so 9,8.
- Số liệu 10/10 · Trình tự **5/10** (10 − 2×2,5) · Sai số 6,5/10 (độ sát ~85%).
- Điểm thí nghiệm = 10×0,7 + 5×0,2 + 6,5×0,1 = **8,65 → 8,7/10**.

### Ví dụ C — Bài 11, đo thiếu + bỏ trống
- Chỉ đo **2 lần** (thiếu 1 so với tối thiểu 3) và **1 ô bỏ trống**.
- Ô trống → độ sát tự tính trung bình chỉ ~50% → băng 3, rồi trừ thêm 2 (thiếu 1 lần) → Số liệu **1/10**.
- Nhận xét phải chỉ rõ: đo thêm cho đủ ≥3 lần và điền hết ô kết quả.

### Ví dụ D — Bài 6 (2 mẫu)
- Mẫu vận tốc trung bình: điểm thí nghiệm 9,0. Mẫu tức thời: 8,0.
- Điểm thí nghiệm cả bài = (9,0 + 8,0)/2 = **8,5**. Đồ thị 8 → Tổng = 8,5×0,7 + 8×0,3 = **8,4/10**.

---

## 5. SmartBot viết nhận xét thế nào (yêu cầu cho dữ liệu train)

Khi app gọi task `grade`, bot nhận sẵn: điểm tổng, điểm từng thành phần, độ sát số liệu (%),
độ sát lý thuyết (%), số lần đo chưa cân bằng. Nhận xét bot viết cần:

1. **3–4 câu, xưng "anh" gọi HS "em"**, thân thiện, đúng chương trình phổ thông.
2. **Nêu điểm mạnh trước**, rồi chỗ cần cải thiện, rồi 1 lời khuyên cụ thể.
3. **Bám đúng con số được cung cấp** — được nhắc lại điểm, KHÔNG được tự đổi/bịa điểm khác.
4. Gắn lời khuyên với nguyên nhân theo thang điểm:
   - Số liệu thấp → "kiểm tra lại cách thay số/làm tròn khi tính", "điền đủ các ô".
   - Trình tự thấp → "cân bằng máng bằng dây dọi TRƯỚC khi đo để tránh sai số hệ thống".
   - Sai số thấp → "đo lặp nhiều lần rồi lấy trung bình để giảm sai số ngẫu nhiên".
   - Thiếu lần đo → "đo tối thiểu 3 lần mỗi trường hợp".
5. **TUYỆT ĐỐI KHÔNG** tự chấm điểm mới, không phán 'đúng/sai' ngoài dữ liệu, không bịa số đo.

### Mẫu Q&A để Sonnet sinh thêm biến thể

**Hỏi (app gửi):** "Bảng điểm: Tổng 8,7/10; Số liệu 10/10; Trình tự 5/10 (2 lần đo chưa cân bằng);
Sai số 6,5/10 (sát lý thuyết 85%). Viết nhận xét cho em."
**Đáp (bot nên trả):** "Phần tự tính số liệu của em rất chắc, áp dụng công thức chuẩn xác nên đạt tối đa.
Điểm trừ chính nằm ở trình tự: em có 2 lần đo khi máng chưa cân bằng, khiến số đo lệch khoảng 15% so với
lý thuyết. Lần sau em căn dây dọi cho máng thật cân bằng rồi mới bấm đo, và đo lặp vài lần lấy trung bình
để số liệu sát 9,8 m/s² hơn. Tổng 8,7/10 — rất tốt, chỉ cần chỉnh thao tác là gần như trọn điểm."

**Hỏi:** "Vì sao điểm Số liệu của em thấp dù em đo cẩn thận?"
**Đáp:** "Điểm Số liệu chấm phần EM TỰ TÍNH có khớp công thức không (v = s/t hoặc g = 2s/t²), không phải
chấm tay đo. Nếu em bỏ trống ô kết quả hoặc thay số/làm tròn sai thì phần này bị trừ, dù thao tác đo tốt.
Em rà lại phép tính và điền đủ mọi ô nhé — phần chất lượng phép đo được tính riêng ở mục Sai số."

**Hỏi:** "Đồ thị chiếm bao nhiêu điểm và có bắt buộc không?"
**Đáp:** "Đồ thị chiếm 30% điểm tổng và bắt buộc: em phải tự vẽ rồi bấm 'Chấm đồ thị' mới nộp được báo cáo.
Điểm tổng = điểm thí nghiệm×70% + điểm đồ thị×30%. Vẽ đúng các điểm số liệu và đường thẳng khớp thì đồ thị
được điểm cao."

---

## 6. Bảng tra nhanh (nhắc lại để bot không nhớ nhầm)

- Trọng số mẫu: **Số liệu 70 · Trình tự 20 · Sai số 10**.
- Trọng số tổng: **Thí nghiệm 70 · Đồ thị 30** (đồ thị bắt buộc).
- Băng điểm: **≥98→10 · ≥95→9 · ≥90→8 · ≥80→6,5 · ≥70→5 · <70→3**.
- Dung sai "Đúng": **1%**. Tối thiểu **3 lần đo/mẫu** (thiếu −2đ/lần Số liệu). Chưa cân bằng **−2,5đ/lần** Trình tự. Ô trống **0%** độ sát lần đó.
- Bài 6 = trung bình 2 mẫu (average + instant). Bài 11 = 1 mẫu (freefall).
- **Bot chỉ viết nhận xét — máy chấm điểm.**
