# Dữ liệu huấn luyện SmartBot — Trợ lý Phylab

> Bot: `d60ec730-73df-11f1-956f-e34bf231a23d`. Dùng file này để nạp tri thức trên platform SmartBot.
> Có 2 cách dùng:
> 1. **Tri thức nâng cao (khuyến nghị):** bật "tri thức nâng cao" cho bot rồi dán mục *System prompt* & tải phần Q&A làm tài liệu tri thức. App đã tự gửi kèm `system_prompt`/`advance_prompt` (RAG) khi gọi API.
> 2. **Intent/FAQ:** tạo từng cặp Hỏi–Đáp bên dưới thành intent (mỗi câu Hỏi là 1 sample utterance, câu Đáp là response). Càng nhiều biến thể câu hỏi càng tốt.

---

## SYSTEM PROMPT (dán vào phần cấu hình bot)

```
Bạn là Trợ lý Phylab — trợ giảng Vật lí lớp 10 (SGK Kết nối tri thức) cho HAI bài thực hành:
- Bài 6: Đo tốc độ của vật chuyển động (máng nghiêng, cổng quang, đồng hồ MC964) — đo vận tốc tức thời (v = d/t) và vận tốc trung bình (v = sEF/t).
- Bài 11: Đo gia tốc rơi tự do (nam châm điện giữ/thả trụ thép, cổng quang, MC964) — g = 2s/t².
Xưng "anh", gọi học sinh là "em". Trả lời NGẮN GỌN, chính xác, thân thiện, đúng chương trình phổ thông.
Chỉ trả lời trong phạm vi hai bài thực hành này và kiến thức vật lí liên quan. Nếu câu hỏi ngoài phạm vi, lịch sự hướng em quay lại nội dung bài. Ưu tiên nêu công thức và cách làm cụ thể.
```

---

## PHẦN A — KIẾN THỨC CHUNG

**Hỏi:** Vận tốc tức thời là gì?
**Đáp:** Vận tốc tức thời là vận tốc tại một thời điểm (một vị trí) xác định. Trong thí nghiệm, ta lấy gần đúng bằng cách cho vật (đường kính d) che một cổng quang, đo thời gian che t rồi tính v = d/t.

**Hỏi:** Vận tốc trung bình là gì?
**Đáp:** Vận tốc trung bình trên một quãng đường là tỉ số giữa quãng đường và thời gian đi hết quãng đó: v_tb = s/t. Trong Bài 6, đo trên đoạn giữa hai cổng E–F: v_tb = sEF/t.

**Hỏi:** Chuyển động thẳng nhanh dần đều là gì?
**Đáp:** Là chuyển động thẳng có vận tốc tăng đều theo thời gian, gia tốc a không đổi và cùng chiều vận tốc. Công thức: v = v₀ + at; s = v₀t + ½at².

**Hỏi:** Sai số ngẫu nhiên là gì và làm sao giảm?
**Đáp:** Sai số ngẫu nhiên do nhiều yếu tố nhỏ không kiểm soát được, mỗi lần đo lệch một kiểu (~±1%). Giảm bằng cách đo lặp nhiều lần ở cùng điều kiện rồi lấy trung bình; sai số của trung bình nhỏ hơn từng lần đo.

**Hỏi:** Sai số hệ thống là gì?
**Đáp:** Là sai số lặp lại theo cùng một hướng ở mọi lần đo, do dụng cụ hoặc cách bố trí (ví dụ máng chưa cân bằng, đặt lệch). Khắc phục bằng cách hiệu chỉnh dụng cụ và bố trí thí nghiệm đúng.

**Hỏi:** Cách tính sai số gián tiếp?
**Đáp:** Dùng sai số tương đối. Với thương/tích, sai số tương đối cộng lại: v = d/t thì Δv/v = Δd/d + Δt/t. Với lũy thừa: g = 2s/t² thì Δg/g = Δs/s + 2·Δt/t. Nhân sai số tương đối với giá trị trung bình để ra sai số tuyệt đối.

**Hỏi:** Đồng hồ MC964 có mấy thang đo?
**Đáp:** Hai thang: 9,999 s (độ chia nhỏ nhất 0,001 s) và 99,99 s (độ chia 0,01 s). Thời gian trong hai bài rất ngắn nên chọn thang 9,999 s để đọc mịn và chính xác hơn.

**Hỏi:** Các chế độ MODE của MC964 là gì?
**Đáp:** A: đo thời gian che cổng nối ổ A. B: đo thời gian che cổng nối ổ B. A+B: tổng thời gian che hai cổng. A↔B: đo khoảng thời gian giữa hai tín hiệu (đi từ A đến B). T: đo chu kì dao động.

**Hỏi:** Cổng quang điện hoạt động thế nào?
**Đáp:** Cổng quang có một tia hồng ngoại giữa hai càng. Khi vật che tia, mạch phát tín hiệu để đồng hồ bắt đầu hoặc dừng đếm, nhờ đó đo được thời gian rất ngắn mà không phụ thuộc phản xạ tay người.

**Hỏi:** Vì sao phải nhấn Reset trước mỗi lần đo?
**Đáp:** Để đưa số đo về 0. Nếu quên Reset, MC964 sẽ cộng dồn thời gian lần đo mới vào số cũ, khiến t đọc được lớn hơn thực tế và kết quả tính sẽ sai.

**Hỏi:** Thước kẹp (du xích) đọc thế nào?
**Đáp:** Vạch 0 của du xích chỉ phần nguyên trên thước chính; phần lẻ đọc ở vạch du xích trùng khít nhất với một vạch thước chính, nhân với độ chia (thường 0,05 mm). Dùng để đo đường kính d viên bi.

---

## PHẦN B — BÀI 6: ĐO TỐC ĐỘ

**Hỏi:** Bài 6 đo những gì?
**Đáp:** Đo tốc độ của viên bi chuyển động trên máng nghiêng: vận tốc tức thời tại một cổng quang (v = d/t) và vận tốc trung bình trên đoạn E–F (v_tb = sEF/t).

**Hỏi:** Dụng cụ Bài 6 gồm những gì?
**Đáp:** Giá đỡ, máng nghiêng, viên bi thép, hai cổng quang E và F, đồng hồ MC964, thước thẳng (và thước kẹp để đo đường kính bi).

**Hỏi:** Đo vận tốc tức thời để MODE nào?
**Đáp:** MODE A — đo thời gian bi che một cổng quang. Sau đó tính v = d/t với d là đường kính bi.

**Hỏi:** Đo vận tốc trung bình để MODE nào?
**Đáp:** MODE A↔B — đo thời gian bi đi từ cổng E đến cổng F. Sau đó tính v_tb = sEF/t.

**Hỏi:** Nối dây Bài 6 thế nào?
**Đáp:** Cổng quang E nối vào ổ A, cổng quang F nối vào ổ B của đồng hồ MC964. Đo trung bình thì chọn MODE A↔B; đo tức thời (chỉ cần cổng E) thì chọn MODE A.

**Hỏi:** Gia tốc của viên bi trên máng nghiêng tính sao?
**Đáp:** Bi đặc lăn không trượt trên máng nghiêng góc θ có gia tốc dọc máng a = (5/7)·g·sinθ (nhỏ hơn g·sinθ vì một phần cơ năng thành động năng quay).

**Hỏi:** Vận tốc tại một cổng cách điểm thả quãng s tính sao?
**Đáp:** v = √(2·a·s), với a = (5/7)·g·sinθ là gia tốc dọc máng.

**Hỏi:** Vì sao thời gian bi che cổng rất ngắn lại coi là vận tốc tức thời?
**Đáp:** Vì quãng che (đường kính bi) rất nhỏ nên tốc độ trung bình trong khoảng thời gian rất ngắn đó xấp xỉ tốc độ tại đúng vị trí cổng — tức là vận tốc tức thời.

**Hỏi:** Đề bài yêu cầu đổi gì giữa các câu ở Bài 6?
**Đáp:** Với vận tốc trung bình: đổi góc nghiêng θ và khoảng cách hai cổng sEF. Với vận tốc tức thời: chỉ đổi góc nghiêng θ.

**Hỏi:** Sai số của phép đo vận tốc tức thời v = d/t?
**Đáp:** Δv/v = Δd/d + Δt/t. Với thước kẹp Δd ≈ 0,05 mm và đồng hồ Δt ≈ 0,001 s. Nhân sai số tương đối với v trung bình để ra Δv.

---

## PHẦN C — BÀI 11: ĐO GIA TỐC RƠI TỰ DO

**Hỏi:** Rơi tự do là gì?
**Đáp:** Là sự rơi của một vật chỉ dưới tác dụng của trọng lực. Đó là chuyển động thẳng nhanh dần đều, không vận tốc đầu: s = ½·g·t².

**Hỏi:** Công thức tính gia tốc rơi tự do?
**Đáp:** Từ s = ½·g·t² suy ra g = 2s/t². Đo quãng rơi s và thời gian rơi t rồi tính g, so với g chuẩn ≈ 9,8 m/s².

**Hỏi:** Dụng cụ Bài 11 gồm những gì?
**Đáp:** Máng đứng có gắn dây dọi và thước, nam châm điện giữ trụ thép, công tắc kép, cổng quang điện, đồng hồ MC964, trụ thép (vật rơi).

**Hỏi:** Nam châm điện có vai trò gì?
**Đáp:** Dùng lực từ giữ trụ thép ở vị trí thả. Khi ngắt điện nam châm (qua công tắc kép), lực từ mất, trụ rơi tự do và đồng hồ bắt đầu đếm cùng lúc — nên thời điểm bắt đầu đo trùng thời điểm thả.

**Hỏi:** Sơ đồ nối dây Bài 11 thế nào?
**Đáp:** Công tắc kép nối nam châm điện và nối ổ A (bắt đầu đếm khi thả); cổng quang nối ổ B (dừng đếm khi trụ đi qua). Chọn MODE A↔B. Nhấn công tắc kép để đồng thời ngắt nam châm và khởi động đồng hồ.

**Hỏi:** Làm sao đổi quãng rơi s giữa các lần đo?
**Đáp:** Trượt cổng quang dọc máng đứng để đặt quãng rơi s theo từng câu, đọc s trên thước gắn ở máng.

**Hỏi:** Vì sao dùng trụ thép mà không dùng giấy hay bóng nhựa?
**Đáp:** Trụ thép nặng, nhỏ gọn nên lực cản không khí không đáng kể so với trọng lực → chuyển động rất gần rơi tự do lí tưởng. Vật nhẹ như giấy chịu sức cản lớn, cho g sai nhiều.

**Hỏi:** Vì sao phải cân bằng máng bằng dây dọi?
**Đáp:** Dây dọi luôn chỉ phương thẳng đứng. Căn cho máng thật thẳng đứng để trụ không chạm thành máng khi rơi; nếu lệch sẽ gây sai số hệ thống làm t hơi lớn.

**Hỏi:** Sai số của phép đo g = 2s/t²?
**Đáp:** Δg/g = Δs/s + 2·Δt/t (hệ số 2 vì t lũy thừa 2). Với thước Δs ≈ 0,5 mm và đồng hồ Δt ≈ 0,001 s. Nhân với g trung bình để ra Δg.

**Hỏi:** Đồ thị Bài 11 vẽ thế nào?
**Đáp:** Vẽ s theo t². Vì s = ½·g·t² nên đồ thị là đường thẳng qua gốc tọa độ, độ dốc bằng g/2. Từ độ dốc suy ra g = 2 × độ dốc.

---

## PHẦN D — CÂU HỎI THƯỜNG GẶP KHI LÀM BÀI

**Hỏi:** Em quên Reset thì sao?
**Đáp:** Số đo bị cộng dồn nên t lớn hơn thực tế, kết quả tính sai. Hãy Reset về 0 rồi đo lại lần đó.

**Hỏi:** Đo xong mà đồng hồ không nhảy số?
**Đáp:** Kiểm tra: đã bật nguồn đồng hồ chưa, dây cổng quang đã cắm đúng ổ A/B chưa, và MODE có đúng không. Bài 11 cần công tắc kép nối ổ A và cổng quang nối ổ B.

**Hỏi:** Kết quả g của em ra 9,5 m/s², có sai không?
**Đáp:** Lệch khoảng 3% so với 9,8 m/s² là chấp nhận được trong phòng thí nghiệm phổ thông. Nếu lệch nhiều hơn, kiểm tra cân bằng máng, Reset, và đo lặp lấy trung bình.

**Hỏi:** Nên đo mỗi câu mấy lần?
**Đáp:** Nên đo lặp 3–5 lần ở cùng điều kiện rồi lấy trung bình để giảm sai số ngẫu nhiên.

**Hỏi:** Tại sao viên bi phải lăn không trượt?
**Đáp:** Nếu trượt, một phần chuyển động không chuyển thành quay đúng quy luật, công thức a = (5/7)g·sinθ không còn đúng và kết quả sẽ sai.
