# Boole Studio — chương 2

App độc lập nằm ở `public/boole-chuong-2.html`. Mở trực tiếp trong trình duyệt, không cần cài thư viện hay kết nối mạng. Học theo dạng, không khóa thứ tự. Tiến độ lưu bằng localStorage theo trình duyệt và địa chỉ mở file.

Phạm vi: 22 bài / 72 mục, chỉ trang 5–9 của BTC2.pdf. I và II phân biệt các số bài 2-14–2-17 được in lặp. Hình 5 trang gốc được nhúng trong HTML. Bài 2-6 ghi rõ 6 tổ hợp không có trên giản đồ; các kết quả rút gọn sử dụng giả thiết xem các tổ hợp đó là tùy chọn.

- `engine.js`: parser không dùng eval, bảng chân trị, phủ prime implicant tối ưu theo số hạng rồi số literal, tổng hợp và mô phỏng mạch.
- `content.js`: dữ kiện theo đề, các bước chứng minh đại số, lưu ý riêng cho từng bài.
- `app.js`, `style.css`, `shell.html`: giao diện và minh họa SVG/DOM.
- `build.py`: nhúng toàn bộ mã và hình trang nguồn thành một HTML; cần pypdfium2 và PDF ở đường dẫn khai báo trong script.
- `node tools/chapter2/verify.cjs`: kiểm tra 72 hàm, các bước chứng minh, các nhóm phủ và 3.180 trạng thái mạch. Kiểm tra mọi cổng NAND/NOR được tổng hợp đều có 2 ngõ vào.

Kiểm tra giao diện đã thực hiện: điều hướng đủ 72 mục, nhóm bìa K hợp lệ/sai, bìa 5 biến, phản hồi đáp án sai/đúng, lưu tiến độ sau tải lại, ảnh nguồn nhúng, menu và chiều rộng 390px. Các mạch là logic lý tưởng, không mô phỏng trễ truyền.
