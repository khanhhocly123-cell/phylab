import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/leose/Downloads/AnhX2/PhyLab_SmartBot_Training (1).xlsx";
const outputDir = "E:/App/RealPhyLab/xnx/outputs/phylab-rag-export";
const outputPath = `${outputDir}/PhyLab_SmartBot_RAG_2026-07-05.xlsx`;

const rows = [
  [
    "Nhận xét báo cáo thực hành",
    "Khi được yêu cầu viết nhận xét báo cáo, Trợ lý Phylab chỉ viết phần nhận xét cuối báo cáo, không chào hỏi, không hỏi ngược học sinh và không liệt kê yêu cầu làm báo cáo. Nhận xét cần bám vào điểm số, độ đúng của số liệu, sai số/trình tự/đồ thị nếu có, rồi kết thúc bằng một câu kết luận vật lí ngắn.",
    "Viết nhận xét báo cáo giúp em;Nhận xét phần kết luận;Em cần nhận xét kết quả thí nghiệm;Kết luận báo cáo viết sao;Tại sao nhận xét báo cáo chưa đúng",
    "nhận xét;báo cáo;kết luận;SmartBot",
    "{}",
  ],
  [
    "Mẫu nhận xét điểm tốt",
    "Nếu điểm cao và số liệu sát lí thuyết, nhận xét nên nêu: kết quả tính đúng công thức, số đo ổn định, trình tự thao tác hợp lí. Ví dụ: Bài thực hành đạt kết quả tốt; số liệu đo bám sát lí thuyết, cách tính và đơn vị nhìn chung chính xác. Kết luận: kết quả có thể dùng để kiểm chứng quan hệ giữa quãng đường, thời gian và đại lượng cần đo.",
    "Nhận xét khi điểm cao;Bài đạt 9 điểm nhận xét sao;Số liệu sát lí thuyết nhận xét thế nào;Kết luận khi kết quả tốt",
    "nhận xét;báo cáo;điểm cao;số liệu",
    "{}",
  ],
  [
    "Mẫu nhận xét khi sai số lớn",
    "Nếu số đo lệch nhiều so với lí thuyết, nhận xét cần nêu nguyên nhân khả dĩ: chưa reset đồng hồ, vị trí cổng quang chưa đúng, dụng cụ chưa cân bằng/cố định, thao tác thả chưa đồng nhất hoặc đọc sai đơn vị. Không đổ lỗi chung chung; nên gợi ý đo lặp và lấy trung bình.",
    "Sai số lớn nhận xét sao;Vì sao kết quả lệch lí thuyết;Số đo không khớp phải viết gì;Nhận xét lỗi reset đồng hồ;Nhận xét cổng quang đặt sai",
    "nhận xét;sai số;reset;cổng quang;cân bằng",
    "{}",
  ],
  [
    "Không hỏi ngược trong nhận xét",
    "Ở mục nhận xét báo cáo, Trợ lý Phylab không được trả lời kiểu: hãy chia sẻ thêm, em đang gặp khó khăn ở đâu, một báo cáo hoàn chỉnh cần có... Đây là văn bản báo cáo đã chấm, nên phải đưa ra nhận xét trực tiếp dựa trên dữ liệu đã có.",
    "Bot hỏi ngược ở phần nhận xét;Nhận xét bị bựa;Không muốn AI hỏi lại trong báo cáo;Tại sao nhận xét nói hãy chia sẻ thêm",
    "nhận xét;guardrail;báo cáo;SmartBot",
    "{}",
  ],
  [
    "Khi nào hiện nút tự động hỗ trợ",
    "Chỉ hiện nút tự động khi học sinh mô tả đang gặp khó khăn thao tác, ví dụ: không kéo thả được, không lắp được, không nối dây được, bấm không được, không thả được, không reset được. Nếu học sinh hỏi kiến thức bình thường như vận tốc là gì thì không hiện nút tự động.",
    "Khi nào hiện nút tự động;Tại sao hỏi kiến thức lại hiện auto;Em không kéo thả được;Em không lắp được;Em không nối dây được",
    "auto action;trợ lý Phylab;keyword;mobile",
    "{}",
  ],
  [
    "Không hiện auto action khi hỏi kiến thức",
    "Nếu câu hỏi là khái niệm/công thức vật lí như vận tốc là gì, gia tốc là gì, sai số là gì, công thức g = 2s/t², Trợ lý Phylab trả lời kiến thức bình thường và không gợi ý tự động lắp/nối/kéo.",
    "Vận tốc là gì;Gia tốc là gì;Sai số là gì;Công thức tính g;Tại sao không cần auto action",
    "kiến thức;vật lí;auto action;SmartBot",
    "{}",
  ],
  [
    "Hỗ trợ kéo thả dụng cụ trên điện thoại",
    "Trên điện thoại, học sinh có thể chạm và kéo trực tiếp cả ô dụng cụ đang sáng, không cần bấm riêng biểu tượng bàn tay màu cam. Kéo vào vùng lab hoặc khung gợi ý thì dụng cụ tự bay vào đúng vị trí.",
    "Em không kéo dụng cụ được;Kéo thả trên điện thoại thế nào;Có cần bấm icon bàn tay không;Lắp dụng cụ mobile khó quá",
    "mobile;kéo thả;lắp dụng cụ;UI",
    "{}",
  ],
  [
    "Panel điều khiển nhanh mobile",
    "Sau khi lắp xong, điện thoại có panel điều khiển nhanh ở dưới khung lab. Bấm nút > để mở panel lớn, nền ngoài sẽ mờ nhẹ để dễ tập trung; bấm < hoặc bấm vùng mờ bên ngoài để đóng. Panel dùng để chọn vùng zoom, cố định vít, chỉnh góc hoặc chỉnh cổng quang.",
    "Panel điều khiển ở đâu;Nút lớn hơn ở mobile;Làm sao mở điều khiển nhanh;Làm sao tắt panel;Vì sao nền bị mờ",
    "mobile;panel;zoom;điều khiển nhanh",
    "{}",
  ],
  [
    "Không tự zoom khi thả vật",
    "Khi học sinh bấm thả bi hoặc thả trụ thép, giao diện không tự zoom vào đồng hồ. Màn hình giữ nguyên vùng quan sát hiện tại để học sinh theo dõi chuyển động. Nếu muốn xem đồng hồ, học sinh dùng nút zoom hoặc panel điều khiển nhanh.",
    "Thả bi có tự zoom không;Thả trụ có phóng đồng hồ không;Không muốn auto zoom khi thả;Làm sao xem đồng hồ sau khi thả",
    "mobile;zoom;thả bi;thả trụ;đồng hồ",
    "{}",
  ],
  [
    "Nối dây bài 6",
    "Bài 6 đo tốc độ: lật mặt sau đồng hồ MC964, kéo dây từ cổng quang E vào ổ A. Nếu đo vận tốc trung bình thì kéo thêm dây từ cổng F vào ổ B và chọn MODE A↔B. Nếu đo vận tốc tức thời thì chỉ cần cổng E vào A và chọn MODE A.",
    "Không nối dây bài 6 được;Cổng E cắm vào đâu;Cổng F cắm vào đâu;Đo vận tốc trung bình nối dây thế nào;Đo vận tốc tức thời nối dây thế nào",
    "Bài 6;nối dây;cổng quang;MC964",
    "{}",
  ],
  [
    "Nối dây bài 11",
    "Bài 11 rơi tự do: nối công tắc kép với nam châm điện, nối công tắc kép vào ổ A của đồng hồ, nối cổng quang vào ổ B. Chọn MODE A↔B để đồng hồ bắt đầu khi nhả nam châm và dừng khi trụ thép qua cổng quang.",
    "Không nối dây bài 11 được;Công tắc kép cắm vào đâu;Nam châm điện nối thế nào;Cổng quang bài rơi tự do cắm ổ nào;MODE bài 11 là gì",
    "Bài 11;nối dây;công tắc kép;nam châm;MC964",
    "{}",
  ],
  [
    "Cố định vít và cân bằng",
    "Nếu học sinh nói không cố định được vít hoặc máng/giá đỡ bị lệch, hướng dẫn bấm vùng vít/cố định trong panel điều khiển nhanh. Cân bằng/cố định giúp vật không chạm thành máng và giảm sai số hệ thống.",
    "Không cố định vít được;Cân bằng giá đỡ thế nào;Máng bị lệch;Dây dọi dùng để làm gì;Tự động cố định vít",
    "cân bằng;vít;dây dọi;sai số;mobile",
    "{}",
  ],
  [
    "Reset trước khi đo",
    "Trước mỗi lần thả vật cần reset đồng hồ về 0.000. Nếu quên reset, đồng hồ có thể cộng dồn số cũ làm thời gian đo lớn hơn thực tế và kết quả tính sai.",
    "Quên reset thì sao;Tại sao phải reset đồng hồ;Số đo cũ chưa về 0;Đồng hồ cộng dồn;Reset trước khi thả",
    "reset;MC964;sai số;thao tác",
    "{}",
  ],
  [
    "Ghi số liệu sau khi đo",
    "Sau khi đồng hồ có số đo khác 0.000, học sinh bấm Ghi số liệu để lưu thời gian vào câu hiện tại. Nếu đã chấm đồ thị xong, cần quay lại tab Số liệu để bấm Chấm điểm & nộp báo cáo.",
    "Đo xong làm gì;Ghi số liệu ở đâu;Sao chưa có dữ liệu báo cáo;Chấm đồ thị xong làm gì;Quay về số liệu thế nào",
    "ghi số liệu;báo cáo;đồ thị;workflow",
    "{}",
  ],
  [
    "Tự điền số liệu để test",
    "Trong Sổ báo cáo có nút tự điền số liệu mẫu để tiện kiểm thử. Dữ liệu mẫu chỉ dùng để test luồng chấm điểm/báo cáo; khi học thật học sinh nên dùng số đo từ lab.",
    "Có nút tự điền số liệu không;Auto fill số liệu ở đâu;Dữ liệu mẫu dùng để làm gì;Test báo cáo thế nào",
    "sổ báo cáo;auto fill;test;số liệu",
    "{}",
  ],
  [
    "OCR chọn bài bằng tay",
    "Nếu quét sách/OCR không nhận được bài, màn hình quét chỉ cần giữ camera và nút thoát/chọn bài bằng tay. Học sinh có thể chọn bài thủ công để vào đúng Prelab/Lab.",
    "OCR không quét được;Chọn bài bằng tay ở đâu;Không nhận diện sách;Quét sách lỗi;Thoát màn hình quét",
    "OCR;scan;chọn bài bằng tay;mobile",
    "{}",
  ],
  [
    "Prelab là gì",
    "Prelab là phần tìm hiểu trước dụng cụ và thao tác chính trước khi vào phòng lab. Học sinh vẫn nên được tương tác với mô hình, thử bấm/kéo/quan sát, nhưng mục tiêu là chuẩn bị thao tác chứ chưa phải ghi số liệu chính thức.",
    "Prelab là gì;Prelab khác Lab thế nào;Có được tương tác trong Prelab không;Prelab dùng để làm gì",
    "Prelab;dụng cụ;hướng dẫn",
    "{}",
  ],
];

await fs.mkdir(outputDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const training = workbook.worksheets.getItem("Training Data");
training.getRange(`A226:E${225 + rows.length}`).values = rows;

const used = training.getUsedRange(true);
used.format.wrapText = true;
training.getRange("A:E").format = {
  font: { name: "Arial", size: 10, color: "#1F2937" },
};
training.getRange("A1:E1").format = {
  fill: "#C85A17",
  font: { bold: true, color: "#FFFFFF" },
};
training.getRange("A:A").format.columnWidth = 28;
training.getRange("B:B").format.columnWidth = 78;
training.getRange("C:C").format.columnWidth = 64;
training.getRange("D:D").format.columnWidth = 28;
training.getRange("E:E").format.columnWidth = 18;
training.freezePanes.freezeRows(1);
training.showGridLines = false;

const stats = workbook.worksheets.getItem("Thống kê");
stats.getRange("A1:B6").values = [
  ["Tổng số hàng dữ liệu", 224 + rows.length],
  ["Số chủ đề chính", "18"],
  ["Ngày tạo", "2026-07-05"],
  ["Số hàng xã giao", 20],
  ["Số hàng bổ sung lần này", rows.length],
  ["Ghi chú", "Bổ sung nhận xét báo cáo, thao tác mobile, auto action, OCR và Prelab"],
];
stats.getRange("A1:B6").format.wrapText = true;
stats.getRange("A:A").format.columnWidth = 28;
stats.getRange("B:B").format.columnWidth = 58;

const preview = await workbook.render({ sheetName: "Training Data", range: "A1:E24", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/rag-preview.png`, new Uint8Array(await preview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const finalCheck = await workbook.inspect({
  kind: "table",
  sheetId: "Training Data",
  range: "A1:E242",
  tableMaxRows: 5,
  tableMaxCols: 5,
  tableMaxCellChars: 120,
  maxChars: 3000,
});
console.log(finalCheck.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
