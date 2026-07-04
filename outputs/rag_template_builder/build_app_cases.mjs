import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rows = [
  {
    title: "Prelab là gì",
    content: "Prelab là bước chuẩn bị trước khi vào Phòng Lab. Mục tiêu của Prelab là giúp học sinh hiểu vai trò dụng cụ, thử thao tác cơ bản và ghi nhận điều kiện ban đầu. Prelab vẫn có tương tác, nhưng chưa phải nơi lắp ráp đầy đủ, nối dây và đo số liệu chính.",
    questions: "Prelab là gì?;Prelab dùng để làm gì?;Tại sao phải làm Prelab trước?;Prelab có phải phòng lab không?",
    tags: "prelab;onboarding;vai trò màn hình;UX",
    info: { type: "concept", screen: "prelab", state: "intro", priority: "high" },
  },
  {
    title: "Prelab khác Phòng Lab",
    content: "Prelab tập trung vào tìm hiểu dụng cụ và thao tác thử. Phòng Lab là nơi thực hiện thí nghiệm chính: lắp thiết bị theo thứ tự, nối dây, bật nguồn, chọn MODE, reset, thả vật, ghi số liệu và xuất sang Notes. Nếu học sinh nhầm hai phần này, hãy giải thích theo luồng: Prelab để chuẩn bị, Phòng Lab để đo.",
    questions: "Prelab và Phòng Lab khác nhau thế nào?;Sao Prelab giống Lab?;Khi nào mới đo số liệu?;Prelab có ghi số liệu không?",
    tags: "prelab;lab;luồng học;phân vai",
    info: { type: "ux_explanation", screen: "prelab,lab", state: "confused_screen_role", priority: "high" },
  },
  {
    title: "Chọn bài bằng tay khi không quét được",
    content: "Nếu camera hoặc OCR không nhận diện được trang SGK, học sinh nên dùng nút Chọn bài thủ công để chọn trực tiếp Bài 6 hoặc Bài 11. Trợ lý cần trấn an rằng quét ảnh chỉ là lối tắt, còn chọn thủ công vẫn là luồng hợp lệ và không làm mất dữ liệu.",
    questions: "Không quét được thì làm sao?;Chọn bài bằng tay ở đâu?;Camera lỗi có vào lab được không?;OCR không nhận trang SGK",
    tags: "scan;manual select;OCR fallback;mobile UX",
    info: { type: "fallback", screen: "scan", state: "ocr_failed", recommended_action: "manual_select", priority: "high" },
  },
  {
    title: "Đăng nhập nhanh thay cho Face ID bắt buộc",
    content: "Trong demo học tập, không nên bắt học sinh bắt buộc chụp cả ảnh thẻ và khuôn mặt. Nếu nhận diện khuôn mặt khó hoặc camera không mượt, hãy dùng Đăng nhập nhanh bằng tên hoặc mã học sinh. Nhận diện khuôn mặt chỉ nên là bước demo/cá nhân hóa có thể bỏ qua.",
    questions: "Không chụp Face ID được thì sao?;Có cần ảnh thẻ không?;Camera login bị lỗi;Có thể đăng nhập không cần nhận diện mặt không?",
    tags: "login;face id;camera fallback;eKYC demo",
    info: { type: "fallback", screen: "login", state: "camera_or_faceid_failed", recommended_action: "quick_login", priority: "high" },
  },
  {
    title: "Camera login chụp không mượt",
    content: "Khi thao tác chụp khuôn mặt không mượt, hướng dẫn học sinh kiểm tra quyền camera, giữ điện thoại thẳng, đủ sáng và bấm Chụp lại. Nếu vẫn lỗi, chọn Bỏ qua hoặc Đăng nhập nhanh để vào app. Không để học sinh bị kẹt ở màn login.",
    questions: "Chụp khuôn mặt bị đứng;Camera login lag;Không ghi nhận ảnh;Chụp lại như thế nào?",
    tags: "login;camera;mobile;fallback",
    info: { type: "troubleshooting", screen: "login", state: "camera_capture_unstable", recommended_action: "retry_or_skip", priority: "medium" },
  },
  {
    title: "Lab mobile khó kéo dây",
    content: "Trên điện thoại, thao tác kéo dây chính xác vào ổ cắm rất khó. Nếu học sinh gặp lỗi, hãy gợi ý dùng thao tác chạm đầu dây rồi chạm ổ cắm hoặc nút Nối dây tự động. Mục tiêu học tập là hiểu sơ đồ nối dây, không phải kiểm tra độ khéo tay.",
    questions: "Kéo dây trên điện thoại khó quá;Dây không cắm được;Nối dây tự động ở đâu?;Tại sao kéo dây không vào ổ?",
    tags: "lab;mobile;wiring;touch;accessibility",
    info: { type: "interaction_support", screen: "lab", state: "wire_drag_failed", recommended_action: "tap_to_connect_or_auto_wire", priority: "high" },
  },
  {
    title: "Lab bị SmartBot che trên mobile",
    content: "Nếu vùng Lab bị panel Trợ lý AI che, hãy đóng SmartBot hoặc chuyển SmartBot sang chế độ sheet riêng. Khi đang kéo dây, chỉnh góc hoặc thao tác với đồng hồ, ưu tiên giữ canvas Lab trống và chỉ mở AI khi cần hỏi. Trợ lý không nên che khu vực thí nghiệm đang thao tác.",
    questions: "SmartBot che Lab;Không nhìn thấy bàn thí nghiệm;Lab bị trợ lý AI đè lên;Đóng SmartBot thế nào?",
    tags: "lab;smartbot;mobile layout;visibility",
    info: { type: "ux_support", screen: "lab", state: "assistant_overlaps_canvas", recommended_action: "close_assistant_sheet", priority: "high" },
  },
  {
    title: "Không nhìn rõ đồng hồ MC964",
    content: "Nếu học sinh không đọc được số trên đồng hồ MC964, hãy yêu cầu phóng to khu vực đồng hồ hoặc chuyển sang chế độ nhìn Đồng hồ. Đọc số thời gian sau khi vật đã đi qua cổng quang, rồi bấm Ghi số liệu.",
    questions: "Không thấy số đồng hồ;Đồng hồ quá nhỏ;Phóng to MC964 thế nào?;Đọc số đo ở đâu?",
    tags: "lab;MC964;zoom;mobile",
    info: { type: "visibility_support", screen: "lab", state: "clock_too_small", recommended_action: "zoom_clock", priority: "medium" },
  },
  {
    title: "Bài 6 nối dây sai",
    content: "Bài 6 đo vận tốc trung bình cần nối cổng E vào ổ A và cổng F vào ổ B của MC964, chọn MODE A↔B. Nếu đo vận tốc tức thời thì chỉ cần cổng E vào ổ A và chọn MODE A. Nếu cắm nhầm, rút dây rồi nối lại đúng sơ đồ.",
    questions: "Bài 6 nối dây thế nào?;Cổng E cắm vào đâu?;Cổng F cắm vào đâu?;Đo vận tốc tức thời nối mấy cổng?",
    tags: "Bài 6;nối dây;MC964;MODE",
    info: { type: "procedure", screen: "lab", lab: "bai6", state: "wire_bad", priority: "high" },
  },
  {
    title: "Bài 11 nối dây sai",
    content: "Bài 11 cần nối công tắc kép với nam châm điện, công tắc kép vào ổ A của MC964 và cổng quang vào ổ B. Chọn MODE A↔B để đồng hồ bắt đầu đếm khi nhả vật và dừng khi trụ thép đi qua cổng quang.",
    questions: "Bài 11 nối dây thế nào?;Công tắc kép cắm vào đâu?;Cổng quang Bài 11 cắm ổ nào?;Nam châm điện nối ra sao?",
    tags: "Bài 11;nối dây;công tắc kép;MC964",
    info: { type: "procedure", screen: "lab", lab: "bai11", state: "wire_bad", priority: "high" },
  },
  {
    title: "Đồng hồ không chạy sau khi thả vật",
    content: "Nếu đồng hồ không chạy, kiểm tra theo thứ tự: đã bật nguồn chưa, đã nối dây đúng chưa, MODE có đúng chưa, đã reset chưa, vật có thực sự đi qua cổng quang chưa. Trợ lý nên hỏi lại trạng thái hiện tại thay vì chỉ trả lời lý thuyết SGK.",
    questions: "Đồng hồ không chạy;Thả bi rồi không có số;MC964 không nhảy;Đồng hồ không đếm thời gian",
    tags: "lab;MC964;debug;thao tác lỗi",
    info: { type: "troubleshooting", screen: "lab", state: "timer_not_running", checks: ["power", "wires", "mode", "reset", "gate_path"], priority: "high" },
  },
  {
    title: "Quên Reset trước khi đo",
    content: "Nếu quên Reset, số trên MC964 có thể bị cộng dồn với lần đo trước, làm thời gian lớn hơn thực tế. Hãy bấm Reset về 0 và đo lại lần đó. Khi phân tích số liệu, không nên dùng lần đo bị quên reset.",
    questions: "Quên reset thì sao?;Số đo bị cộng dồn;Có cần đo lại không?;Tại sao phải reset?",
    tags: "lab;reset;MC964;sai số",
    info: { type: "troubleshooting", screen: "lab", state: "not_reset", recommended_action: "reset_and_rerun", priority: "medium" },
  },
  {
    title: "Không ghi được số liệu",
    content: "Chỉ ghi số liệu sau khi đồng hồ đã có kết quả khác 0 và vật đã hoàn tất lượt đo. Nếu nút Ghi số liệu chưa có tác dụng, hãy kiểm tra đã thả vật chưa, đồng hồ có chạy không và kết quả có hợp lệ không.",
    questions: "Không ghi số liệu được;Nút ghi số liệu không chạy;Khi nào được ghi số liệu?;Chưa có số đo",
    tags: "lab;data;record trial;measurement",
    info: { type: "troubleshooting", screen: "lab", state: "record_failed", priority: "medium" },
  },
  {
    title: "Notes chưa có dữ liệu",
    content: "Nếu Notes trống, cần xuất số liệu từ Phòng Lab sang Notes trước. Trong demo hoặc khi học sinh chỉ muốn xem trước chức năng, có thể dùng dữ liệu mẫu để minh họa bảng đo, công thức, đồ thị và nhận xét AI.",
    questions: "Notes trống;Không thấy số liệu trong Notes;Xuất sang Notes thế nào?;Có dữ liệu mẫu không?",
    tags: "notes;report;auto-fill;demo data",
    info: { type: "ux_support", screen: "notes", state: "empty_data", recommended_action: "export_lab_or_load_sample", priority: "medium" },
  },
  {
    title: "SmartBot chỉ trả lời kiến thức SGK",
    content: "Khi học sinh đang ở Lab và hỏi vì sao thao tác lỗi, SmartBot cần ưu tiên trạng thái hiện tại của app: dụng cụ đã lắp chưa, dây đúng chưa, nguồn bật chưa, MODE đúng chưa, đã reset chưa. Nếu không có trạng thái, trả lời bằng checklist kiểm tra từng bước.",
    questions: "Trợ lý chỉ nói lý thuyết;AI không sửa lỗi thao tác;Tại sao bot không biết em đang làm gì?;Hỏi lỗi trong lab thì bot xử lý sao?",
    tags: "smartbot;RAG;state aware;lab support",
    info: { type: "assistant_behavior", screen: "lab", state: "operation_question", recommended_action: "state_aware_checklist", priority: "high" },
  },
  {
    title: "Trợ lý nam nữ không thống nhất",
    content: "Trợ lý nên dùng một persona thống nhất trong toàn app. Khuyến nghị gọi là Trợ lý Phylab, xưng anh/em hoặc tôi/bạn nhất quán. Nếu có cài đặt giọng, cho phép chọn giọng Nam hoặc Nữ nhưng văn bản và vai trò không được thay đổi giữa các màn.",
    questions: "Trợ lý là nam hay nữ?;Sao chỗ này xưng anh chỗ kia xưng chị?;Có đổi giọng AI được không?;Persona trợ lý là gì?",
    tags: "smartbot;persona;voice;consistency",
    info: { type: "assistant_behavior", screen: "global", state: "persona_inconsistent", recommended_action: "single_persona_with_voice_setting", priority: "medium" },
  },
  {
    title: "Quét màn hình nhiều icon gây rối",
    content: "Màn quét nên tập trung vào một hành động chính là Chụp trang SGK. Các icon phụ nên giảm hoặc đưa xuống khu vực hỗ trợ. Nếu người dùng không muốn quét, nút Chọn bài thủ công cần rõ ràng và luôn bấm được.",
    questions: "Màn quét nhiều icon quá;Nên bấm nút nào để quét?;Chọn bài thủ công không thấy;Scan UX bị rối",
    tags: "scan;UX;mobile;manual select",
    info: { type: "ux_recommendation", screen: "scan", state: "too_many_actions", recommended_action: "single_primary_capture", priority: "medium" },
  },
  {
    title: "Mobile cần thao tác chạm thay kéo chính xác",
    content: "Trên mobile, thao tác kéo thả nên có phương án thay thế bằng chạm: chạm dụng cụ để lắp, chạm dây rồi chạm ổ cắm, chạm nút phóng to để quan sát. Kéo thả vẫn giữ cho desktop hoặc người muốn tương tác sâu.",
    questions: "Điện thoại kéo thả khó;Có cách chạm để lắp không?;Mobile dùng kiểu gì dễ hơn?;Kéo dụng cụ không trúng ô",
    tags: "mobile;drag drop;touch target;accessibility",
    info: { type: "ux_recommendation", screen: "lab", state: "mobile_drag_hard", recommended_action: "tap_alternative", priority: "high" },
  },
  {
    title: "Kết quả đo lệch nhiều",
    content: "Nếu kết quả đo lệch nhiều, kiểm tra các nguyên nhân thường gặp: chưa cân bằng giá đỡ, quên reset, chọn sai MODE, nối dây sai, vật không đi qua đúng cổng quang, hoặc đọc sai quãng đường. Hãy đo lại sau khi sửa từng nguyên nhân.",
    questions: "Kết quả đo sai nhiều;g ra quá thấp;vận tốc không hợp lý;Sai số lớn thì làm gì?",
    tags: "measurement;sai số;debug;lab",
    info: { type: "troubleshooting", screen: "lab,notes", state: "measurement_outlier", priority: "medium" },
  },
  {
    title: "Xuất sang Notes sau khi đo",
    content: "Sau khi có ít nhất một lần đo hợp lệ, học sinh bấm Xuất sang Notes để chuyển dữ liệu sang báo cáo. Notes sẽ dùng số liệu này để lập bảng, tính toán, vẽ đồ thị và tạo nhận xét. Nếu chưa xuất, Notes có thể chỉ hiển thị mẫu minh họa.",
    questions: "Xuất sang Notes để làm gì?;Khi nào xuất báo cáo?;Dữ liệu từ Lab qua Notes thế nào?;Bấm xuất ở đâu?",
    tags: "lab;notes;export;report",
    info: { type: "procedure", screen: "lab,notes", state: "ready_to_export", priority: "medium" },
  },
  {
    title: "Không hiểu bước tiếp theo",
    content: "Khi học sinh không biết làm gì tiếp, Trợ lý nên trả lời bằng một hành động cụ thể dựa trên tiến trình: lắp dụng cụ tiếp theo, cân bằng, nối dây, bật nguồn, chọn MODE, reset, thả vật, ghi số liệu hoặc xuất Notes. Tránh trả lời chung chung.",
    questions: "Em phải làm gì tiếp?;Bước tiếp theo là gì?;Không biết thao tác tiếp;Hướng dẫn em làm tiếp",
    tags: "smartbot;progress;next step;lab support",
    info: { type: "assistant_behavior", screen: "lab,prelab", state: "next_step_unknown", recommended_action: "contextual_next_action", priority: "high" },
  },
];

const outputDir = "outputs/smartbot_rag_cases";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const data = workbook.worksheets.add("Training Data");
data.showGridLines = false;

const headers = ["Tiêu đề", "Nội dung", "Câu hỏi liên quan (các câu cách nhau bởi dấu \";\")", "Tags", "IdentificationInfo"];
const body = rows.map((r) => [
  r.title,
  r.content,
  r.questions,
  r.tags,
  JSON.stringify(r.info),
]);
data.getRangeByIndexes(0, 0, body.length + 1, headers.length).values = [headers, ...body];

const used = data.getRangeByIndexes(0, 0, body.length + 1, headers.length);
used.format = {
  font: { name: "Arial", size: 10, color: "#321E12" },
  borders: { preset: "outside", style: "thin", color: "#E2DFD8" },
  wrapText: true,
  verticalAlignment: "top",
};
data.getRange("A1:E1").format = {
  fill: "#C85A17",
  font: { bold: true, color: "#FFFFFF", name: "Arial", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  wrapText: true,
};
data.getRange(`A2:E${body.length + 1}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#F0E5D8" },
};
data.getRange(`E2:E${body.length + 1}`).format.font = { name: "Consolas", size: 9, color: "#605248" };
data.getRange("A:A").format.columnWidthPx = 190;
data.getRange("B:B").format.columnWidthPx = 520;
data.getRange("C:C").format.columnWidthPx = 360;
data.getRange("D:D").format.columnWidthPx = 220;
data.getRange("E:E").format.columnWidthPx = 360;
data.getRange("1:1").format.rowHeightPx = 36;
data.freezePanes.freezeRows(1);
data.tables.add(`A1:E${body.length + 1}`, true, "AppSituationTrainingData");

const stats = workbook.worksheets.add("Thống kê");
stats.showGridLines = false;
stats.getRange("A1:B7").values = [
  ["Tổng số hàng dữ liệu", rows.length],
  ["Nhóm nội dung", "UX tình huống + hỗ trợ thao tác"],
  ["Ngày tạo", "2026-07-04"],
  ["Format", "Tương thích PhyLab_SmartBot_Training"],
  ["Mục đích", "Import Google Sheets / nạp RAG cho SmartBot"],
  ["Ưu tiên cao", rows.filter((r) => r.info.priority === "high").length],
  ["Ghi chú", "Người dùng có thể bổ sung thêm dòng theo cùng 5 cột"],
];
stats.getRange("A1:B7").format = {
  font: { name: "Arial", size: 10, color: "#321E12" },
  borders: { preset: "outside", style: "thin", color: "#E2DFD8" },
  wrapText: true,
};
stats.getRange("A1:A7").format = {
  fill: "#FFF2E6",
  font: { bold: true, color: "#321E12", name: "Arial", size: 10 },
};
stats.getRange("A:A").format.columnWidthPx = 210;
stats.getRange("B:B").format.columnWidthPx = 380;
stats.tables.add("A1:B7", false, "AppSituationStats");

const inspect = await workbook.inspect({
  kind: "table",
  sheetId: "Training Data",
  range: `A1:E${body.length + 1}`,
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 5,
  maxChars: 6000,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: "Training Data", range: "A1:E12", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/app_situations_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(`${outputDir}/PhyLab_SmartBot_App_Situations_RAG.xlsx`);

