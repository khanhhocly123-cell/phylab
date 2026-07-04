# BÁO CÁO TRẢI NGHIỆM NGƯỜI DÙNG & TÍCH HỢP VNPT SMARTUX SDK (PHYLAB)

Tài liệu này trình bày chi tiết phương án thiết kế trải nghiệm người dùng (UX), bộ chỉ số đo lường trải nghiệm (UX Metrics), tích hợp kỹ thuật SDK VNPT SmartUX Web, và lộ trình tối ưu hóa sản phẩm Phylab khi đưa ra thị trường nhằm đáp ứng trọn vẹn nhóm tiêu chí **Trải nghiệm người dùng (20 điểm)**.

---

## 1. XÁC ĐỊNH ĐỐI TƯỢNG MỤC TIÊU & NHU CẦU CHÍNH

### 1.1. Đối tượng mục tiêu (Target Users)
* **Học sinh THPT (Lớp 10, 11, 12)**: Tuổi từ 15 - 18, học theo chương trình GDPT mới (2018).
* **Đặc điểm hành vi**: 
  * Sử dụng điện thoại thông minh (Smartphones - iOS/Android) làm thiết bị chính để học tập và giải trí ngoài giờ lên lớp.
  * Ưu tiên giao diện trực quan, không rườm rà, phản hồi nhanh chóng (dưới 1 giây).
  * Dễ nản lòng nếu quy trình lắp ráp thí nghiệm ảo quá phức tạp hoặc số liệu hiển thị khó hiểu.

### 1.2. Nhu cầu chính (Core Needs) & Giải pháp đáp ứng
* **Nhu cầu**: Thực hành các bài thí nghiệm Vật lý bắt buộc trong SGK nhưng phòng thí nghiệm trường học thiếu dụng cụ hoặc số liệu thực tế bị sai lệch lớn (sai số hệ thống).
* **Giải pháp**: Phylab cung cấp môi trường mô phỏng tương tác 2D trực quan bằng công nghệ SVG/React, đảm bảo học sinh tự tay lắp ráp thiết bị, nối dây, cắm nguồn và thu thập số liệu ngẫu nhiên có độ tin cậy vật lý cao.

---

## 2. THIẾT KẾ TRẢI NGHIỆM THAO TÁC THÔNG MINH (SMART UX ON MOBILE)

Vì điện thoại là thiết bị ưu tiên của học sinh, Phylab được tối ưu hóa đặc biệt về giao diện di động nhằm **tối ưu công sức và thao tác sử dụng**:

### 2.1. Thanh tiến trình động & Hướng dẫn bước tiếp theo
* **Không gian hiển thị**: Ngay dưới khu vực bàn thí nghiệm SVG.
* **Cơ chế hoạt động**: 
  * Giai đoạn lắp ráp: Thanh tiến trình hiển thị mức độ hoàn thành lắp đặt thiết bị (`placed.size / required.length`). Dòng trạng thái hiển thị rõ dụng cụ cần lắp tiếp theo (ví dụ: *Lắp viên bi*).
  * Giai đoạn đo đạc: Thanh tiến trình chuyển sang đo lường số bước thực hành đo (`steps.done / steps.length`). Dòng trạng thái hiển thị rõ chỉ dẫn nghiệp vụ vật lý tiếp theo (ví dụ: *Reset trước khi thả bi*).
* **Lợi ích**: Học sinh không cần đọc các trang tài liệu hướng dẫn dài dòng mà luôn biết rõ mình cần làm gì ở bước tiếp theo.

### 2.2. Bù khoảng trống thông minh (Smart Space Fill)
* **Thách thức**: Trên màn hình dọc của di động, khu vực khay dụng cụ (aside) chiếm diện tích lớn khi chưa lắp ráp. Sau khi lắp ráp xong, khay này ẩn đi tạo ra một khoảng trống lớn ở giữa màn hình.
* **Giải pháp**: Khi `assembled === true`, **Bảng ghi số liệu** tự động xuất hiện trực tiếp để lấp đầy khoảng trống đó.
* **Lợi ích**: Học sinh có thể vừa thao tác thả bi/ngắt điện trên bàn thí nghiệm phía trên, vừa theo dõi bảng số liệu đo đạc cập nhật trực tiếp ở ngay phía dưới mà **không cần đóng/mở bottom sheet liên tục** (tiết kiệm hơn 65% số lần click chuột/chạm tay).

### 2.3. Trợ lý AI và Lịch sử Hỏi đáp Chuyên biệt
* Bottom Sheet trên di động được tinh giản và đổi tên thành **Trợ lý AI** vĩnh viễn. Khi mở ra, nó chỉ hiển thị khung chat Hỏi đáp với AI (Smartbot) chiếm trọn vẹn không gian, giúp học sinh tập trung tối đa vào việc đặt câu hỏi và giải đáp thắc mắc lý thuyết mà không bị lẫn lộn với bảng số liệu.

### 2.4. Accessibility & Nhất quán giao diện
* **Hỗ trợ giọng nói (Text-to-Speech)**: Trợ lý AI tích hợp đọc chỉ dẫn bằng giọng nói qua VNPT TTS SDK, hỗ trợ học sinh học bằng âm thanh.
* **Cỡ chữ & Độ tương phản**: Sử dụng font chữ Nunito, cỡ chữ tối thiểu 11.5px trên di động, màu sắc có độ tương phản cao, tuân thủ tiêu chuẩn WCAG 2.1.
* **Thiết kế không Emoji**: Toàn bộ giao diện di động được lược bỏ các emoji trang trí không cần thiết để tạo cảm giác học thuật chuyên nghiệp, gọn gàng và dễ nhìn.

---

## 3. BỘ CHỈ SỐ ĐO LƯỜNG TRẢI NGHIỆM (UX METRICS) & VNPT SMARTUX SDK

Phylab tích hợp **VNPT SmartUX Web SDK** để đo lường các chỉ số trải nghiệm dựa trên dữ liệu thực tế (Data-driven UX), từ đó lập kế hoạch tối ưu liên tục.

### 3.1. Mã nguồn tích hợp SDK (Đã nhúng vào `<head>` của dự án)
Đoạn mã SDK tracking được nhúng toàn cục tại `src/app/layout.tsx` với App Key được cấu hình riêng:
```html
<script type='text/javascript'>
  var VNPT = VNPT || {};
  VNPT.q = VNPT.q || [];
  VNPT.app_key = 'ca576b7d8ebf52d6edf73883e0f6329aab692936';
  VNPT.url = 'https://console-smartux.vnpt.vn';
  VNPT.q.push(['track_sessions']);
  VNPT.q.push(['track_pageview']);
  VNPT.q.push(['track_clicks']);
  VNPT.q.push(['track_scrolls']);
  VNPT.q.push(['track_errors']);
  VNPT.q.push(['track_links']);
  VNPT.q.push(['track_forms']);
  VNPT.q.push(['collect_from_forms']);
</script>
```

### 3.2. Bộ chỉ số đo lường trải nghiệm (UX Metrics) thiết lập trên Dashboard
Dựa trên các sự kiện thu thập tự động từ SDK, chúng tôi xây dựng bộ chỉ số sau để đánh giá hiệu quả sản phẩm:

1. **Task Success Rate (TSR - Tỷ lệ hoàn thành nhiệm vụ)**:
   * *Định nghĩa*: Tỷ lệ học sinh thực hiện thành công bài thí nghiệm từ đầu đến khi nộp báo cáo.
   * *Cách đo*: Tính bằng tỷ lệ người dùng kích hoạt sự kiện click vào nút *"Nộp báo cáo"* trên tổng số người dùng bắt đầu bài học.
2. **Time on Task (ToT - Thời gian hoàn thành)**:
   * *Định nghĩa*: Thời gian trung bình để học sinh hoàn thành bài thực hành.
   * *Cách đo*: Thời gian chênh lệch giữa sự kiện `track_pageview` của bài học và sự kiện gửi báo cáo thành công.
3. **User Error Rate (UER - Tỷ lệ lỗi thao tác)**:
   * *Định nghĩa*: Số lỗi trung bình học sinh gặp phải trong quá trình lắp ráp hoặc cắm nguồn/nối dây sai thứ tự.
   * *Cách đo*: Lắng nghe các sự kiện kích hoạt hàm cảnh báo `flash()` trên màn hình thông qua SDK.
4. **Interaction Heatmap (Bản đồ nhiệt tương tác)**:
   * *Định nghĩa*: Xác định các vị trí học sinh thường xuyên nhấn nhầm hoặc bối rối trên bàn thí nghiệm.
   * *Cách đo*: Sử dụng sự kiện `track_clicks` toàn cục để vẽ bản đồ mật độ click trên SVG Canvas.

### 3.3. Hướng dẫn trải nghiệm các tính năng Smart UX của sản phẩm
Để kiểm tra và trải nghiệm các thiết kế tối ưu hóa trải nghiệm (Smart UX) trực quan trên ứng dụng Phylab, giám khảo và người dùng có thể thực hiện theo các chỉ dẫn tương tác sau:

1. **Trải nghiệm cơ chế "Tự động thu phóng thông minh" (Smart Auto-Zoom)**:
   * *Cách hoạt động*: Trong suốt quá trình thực hành, camera của bàn thí nghiệm sẽ tự động điều chỉnh góc nhìn và tỷ lệ hiển thị để hướng tầm mắt học sinh vào khu vực cần tương tác gần nhất.
   * *Cách trải nghiệm*: 
     * Khi bắt đầu bài học, camera hiển thị toàn cảnh bàn thí nghiệm để học sinh dễ kéo thả thiết bị.
     * Khi đã lắp ráp xong và chuyển sang giai đoạn đo đạc, camera tự động chuyển góc nhìn phóng to riêng khu vực **Đồng hồ đo thời gian số** để học sinh dễ dàng quan sát các con số đo đạc nhỏ.
     * Người dùng có thể chủ động nhấn biểu tượng **Kính lúp phóng to** nổi trên bàn thí nghiệm để zoom cực đại màn hình LED đồng hồ, và hệ thống sẽ tự động thu nhỏ lại khi hoàn thành đo.

2. **Trải nghiệm cơ chế "Bù khoảng trống bảng số liệu" (Smart Space Filling)**:
   * *Cách hoạt động*: Giải quyết triệt để vấn đề lãng phí diện tích hiển thị trên điện thoại di động sau khi khay dụng cụ được thu hồi.
   * *Cách trải nghiệm*:
     * Trong giai đoạn lắp ráp, màn hình di động hiển thị khay kéo thả thiết bị ở phía dưới.
     * Ngay khi lắp xong linh kiện cuối cùng, khay dụng cụ ẩn đi và **Bảng ghi số liệu đo đạc** tự động chèn vào khoảng trống trống đó trên màn hình chính. Học sinh có thể vừa thả bi ở trên, vừa nhấn nút *"Ghi số liệu"* trực tiếp ở bảng phía dưới mà không cần mở bất kỳ menu phụ nào khác.

3. **Trải nghiệm "Thanh tiến trình & Chỉ dẫn hành động động"**:
   * *Cách hoạt động*: Hiển thị trực quan trạng thái hoàn thành bài học và câu lệnh định hướng hành động tiếp theo.
   * *Cách trải nghiệm*:
     * Quan sát thanh tiến trình màu cam tăng dần tương ứng với số dụng cụ đã lắp ráp hoặc số lần đo đạc đã ghi nhận.
     * Đọc dòng chữ *"Tiếp theo: [Yêu cầu]"* để thực hiện chính xác các bước vận hành vật lý mà không cần xem tài liệu hướng dẫn bên ngoài.

4. **Trải nghiệm "Trợ lý AI & Giọng nói" (AI Smartbot & Voice Assistant)**:
   * *Cách hoạt động*: Hỗ trợ học tập đa phương thức (hình ảnh, LaTeX, âm thanh) và phân tách luồng nghiệp vụ trên di động.
   * *Cách trải nghiệm*:
     * Bấm vào biểu tượng loa màu cam trên thẻ Trợ lý để bật/tắt tiếng. Nhấn nút **Play** bên cạnh lời khuyên của Trợ lý AI để nghe đọc hướng dẫn bằng giọng nói (VNPT TTS).
     * Vuốt kéo thanh **Trợ lý AI** ở dưới cùng lên trên di động. Màn hình Chat AI chiếm trọn không gian, cho phép học sinh đặt câu hỏi chuyên sâu về công thức lý thuyết và sai số một cách tập trung nhất.

---

## 4. LỘ TRÌNH LIÊN TỤC TỐI ƯU UX (ROADMAP 12 THÁNG)

Để đảm bảo Phylab phát triển bền vững và luôn lấy học sinh làm trung tâm, lộ trình tối ưu hóa trải nghiệm dựa trên số liệu thực tế được chia chi tiết theo 4 Quý như sau:

### 4.1. QUÝ I (Tháng 1 - 3): Thu thập dữ liệu nền tảng & Phân tích phễu chuyển đổi (UX Baseline & Funnel Analytics)
* **Mục tiêu**: Xác định các điểm rơi rụng (drop-off points) và các rào cản thao tác lớn nhất đối với học sinh trên môi trường mạng.
* **Hành động cụ thể**:
  * Thiết lập phễu chuyển đổi 6 bước trên Dashboard VNPT SmartUX: `Pageview` (Xem trang) $\rightarrow$ `Select Lesson` (Chọn bài thực hành) $\rightarrow$ `Assembly Done` (Lắp ráp xong thiết bị) $\rightarrow$ `Roll Done` (Thực hiện đủ lần đo) $\rightarrow$ `Export Note` (Xuất kết quả) $\rightarrow$ `Submit Report` (Nộp báo cáo).
  * Sử dụng tính năng **Heatmap** (Bản đồ nhiệt tương tác) qua sự kiện `track_clicks` để đo lường các vùng học sinh bấm nhầm nhiều nhất trên bàn thí nghiệm ảo (ví dụ: bấm nhầm vào thân đồng hồ tĩnh thay vì bấm nút chỉnh cổng quang điện).
  * Đo lường thời gian trung bình hoàn thành nhiệm vụ (**Time on Task - ToT**) của từng bài học để phát hiện bài thực hành nào quá dài hoặc gây bối rối.
* **KPI / Chỉ số đo lường**: 
  * Xác định thành công tối thiểu 3 điểm nghẽn tương tác lớn nhất.
  * Tỷ lệ hoàn thành thí nghiệm (**Task Success Rate - TSR**) đạt trên 70% ở quy mô chạy thử 200 học sinh.

### 4.2. QUÝ II (Tháng 4 - 6): Thử nghiệm A/B Testing & Tối ưu khả năng tiếp cận (Accessibility & Interaction Refinement)
* **Mục tiêu**: Giảm thiểu lỗi thao tác cơ học của học sinh (User Error Rate) và tối ưu hóa diện tích tương tác trên điện thoại.
* **Hành động cụ thể**:
  * Triển khai **A/B Testing** cho cơ chế cắm dây nguồn và dây cổng quang điện trên di động (được kích hoạt song song và phân tách lưu lượng truy cập 50/50):
    * *Phương án A (Hiện tại)*: Học sinh phải kéo dây chạm trúng ổ cắm.
    * *Phương án B (Thử nghiệm)*: Tự động hút dây (magnet snap) khi đầu dây di chuyển đến gần ổ cắm trong bán kính 15px, đồng thời ổ cắm đích đổi sang màu xanh sáng báo hiệu kết nối thành công.
  * Tối ưu hóa UI cho các dòng điện thoại thông minh màn hình nhỏ (dưới 6.0 inches) bằng cách tự động căn tỷ lệ SVG bàn thí nghiệm phù hợp, tăng diện tích tiếp xúc (touch target) của các nút bấm thủ công như nút Reset, thả bi, bật nguồn đồng hồ lên tối thiểu $44 \times 44$ pixels.
  * Tối ưu khả năng tiếp cận (Accessibility) theo chuẩn WCAG 2.1: Điều chỉnh độ tương phản màu sắc của các đường dây điện (dây đỏ, dây đen) để hỗ trợ học sinh mù màu nhẹ phân biệt rõ cực âm/dương.
* **KPI / Chỉ số đo lường**:
  * Tỷ lệ lỗi thao tác của người dùng (**User Error Rate - UER**) giảm từ 35% xuống dưới 15%.
  * Thời gian hoàn tất bước lắp ráp thiết bị giảm 30%.

### 4.3. QUÝ III (Tháng 7 - 9): Tối ưu hóa Trợ lý AI (Smartbot) & Cá nhân hóa phản hồi học thuật
* **Mục tiêu**: Biến Trợ lý AI thành người hướng dẫn riêng có khả năng chủ động giải đáp mọi thắc mắc học tập theo thời gian thực.
* **Hành động cụ thể**:
  * Phân tích lịch sử các câu hỏi phổ biến nhất của học sinh thu thập được qua sự kiện `track_forms` của SDK.
  * Bổ sung dữ liệu huấn luyện (Training Data) cho Smartbot tập trung vào các chủ đề học sinh hay thắc mắc nhất: *"Cách tính sai số phép đo"*, *"Công thức tính gia tốc rơi tự do"*, *"Ý nghĩa của cổng quang điện"*.
  * Phát triển tính năng **Chủ động gợi ý (Contextual Suggestions)**: Khi SmartUX SDK phát hiện học sinh đứng im không thao tác quá 30 giây ở một bước, biểu tượng Trợ lý AI sẽ rung nhẹ và đưa ra câu hỏi gợi ý giải pháp phù hợp với ngữ cảnh (ví dụ: *"Bạn đã lắp xong nguồn điện, hãy bấm nút ON trên đồng hồ để tiếp tục nhé!"*).
* **KPI / Chỉ số đo lường**:
  * Tỷ lệ học sinh đánh giá câu trả lời của Trợ lý AI là hữu ích đạt trên 90%.
  * Tỷ lệ thoát trang giữa chừng trong lúc đo đạc giảm xuống dưới 5%.

### 4.4. QUÝ IV (Tháng 10 - 12): Đánh giá Usability diện rộng & Đo lường SUS (System Usability Scale)
* **Mục tiêu**: Kiểm chứng chất lượng trải nghiệm trên quy mô trường học thực tế (10.000+ học sinh) và tối ưu hóa hiệu năng hệ thống.
* **Hành động cụ thể**:
  * Nhúng bảng khảo sát đánh giá độ khả dụng hệ thống chuẩn hóa **SUS (System Usability Scale)** gồm 10 câu hỏi trực tiếp vào màn hình kết quả sau khi học sinh nộp báo cáo thực hành thành công.
  * Kiểm tra và tối ưu hóa hiệu năng hạ tầng: Đo lường và rút ngắn thời gian phản hồi (API latency) của trợ lý AI và công cụ trích xuất dữ liệu, đảm bảo thời gian tải trang ban đầu dưới 1.5 giây trên mạng 3G/4G di động.
  * Lên kế hoạch phát triển các tính năng hỗ trợ cộng đồng: Chia sẻ báo cáo PDF kết quả đo đạc trực tiếp cho giáo viên bộ môn qua Zalo/Email, tích hợp bảng xếp hạng điểm thực hành (Leaderboard) để kích thích thi đua học tập.
* **KPI / Chỉ số đo lường**:
  * Điểm đánh giá độ khả dụng hệ thống **SUS** đạt trung bình từ 80 điểm trở lên (Mức A - Excellent).
  * Thời gian phản hồi trung bình của API đạt dưới 500ms.
