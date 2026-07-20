import { ExperimentSpec } from "../lib/types";

export const EXPERIMENT_SPECS: Record<string, ExperimentSpec> = {
  "do-toc-do-vat-chuyen-dong": {
    id: "do-toc-do-vat-chuyen-dong",
    shortTitle: "Tốc độ tức thời",
    title: "Đo tốc độ tức thời của vật chuyển động",
    book: "Vật lí 10 KNTT, Bài 6",
    icon: "Activity",
    keywords: ["tốc độ tức thời", "máng nghiêng", "cổng quang", "bi", "đo tốc độ"],
    theory: {
      objective: "Xác định tốc độ tức thời của viên bi chuyển động thẳng nhanh dần đều trên máng nghiêng tại cổng quang điện.",
      formula: "v = \\frac{EF}{t}",
      bullets: [
        "Chuyển động thẳng nhanh dần đều là chuyển động có vận tốc tăng đều theo thời gian.",
        "Tốc độ tức thời tại một điểm được đo bằng tỉ số giữa độ dài vô cùng nhỏ $EF$ của tấm cản quang và thời gian $t$ bi đi qua cổng quang.",
        "Học sinh cần điều chỉnh góc nghiêng máng và khoảng cách để đo thời gian $t$ chính xác."
      ]
    },
    instruments: [
      { id: "stand", name: "Giá đỡ máng nghiêng", role: "Đỡ máng nghiêng cố định góc" },
      { id: "inclined-plane", name: "Máng nghiêng", role: "Đường chạy cho viên bi", uncertainty: "±1mm" },
      { id: "ball", name: "Viên bi thép", role: "Vật chuyển động" },
      { id: "photogate-e", name: "Cổng quang E", role: "Cảm biến thứ nhất", uncertainty: "±0,0003s" },
      { id: "photogate-f", name: "Cổng quang F", role: "Cảm biến thứ hai", uncertainty: "±0,0003s" },
      { id: "timer-mc964", name: "Đồng hồ MC964", role: "Đồng hồ hiện số đo t", uncertainty: "±0,001s" },
      { id: "ruler", name: "Thước thẳng", role: "Đo quãng đường EF", uncertainty: "±0,5mm" }
    ],
    steps: [
      { id: "step-1", title: "Lắp ráp máng nghiêng", assistant: "Hãy lắp giá đứng và gá máng nghiêng lên giá đỡ." },
      { id: "step-2", title: "Đặt cổng quang điện", assistant: "Gá cổng quang E và cổng quang F vào hai vị trí xác định trên máng nghiêng." },
      { id: "step-3", title: "Kết nối dây cáp", assistant: "Nối cáp tín hiệu từ cổng quang E, F vào các cổng cắm A, B tương ứng trên đồng hồ MC964." },
      { id: "step-4", title: "Đo đạc và tính toán", assistant: "Thả bi lăn qua máng nghiêng và ghi nhận thời gian t đi qua cổng E, F." }
    ],
    dataBook: {
      columns: [
        { key: "distance", label: "Độ rộng cản quang EF", unit: "m", editable: true },
        { key: "time", label: "Thời gian t đi qua cổng", unit: "s", editable: false },
        { key: "result", label: "Tốc độ tức thời v", unit: "m/s", editable: true }
      ],
      resultLabel: "Tốc độ tức thời",
      resultUnit: "m/s",
      formulaHint: "v = \\frac{EF}{t}"
    },
    homework: [
      "Giải thích tại sao tốc độ trung bình trong khoảng thời gian rất ngắn đi qua cổng quang lại được coi là tốc độ tức thời?",
      "Tính sai số gián tiếp của phép đo tốc độ $v$ từ sai số của quãng đường $EF$ và thời gian $t$."
    ]
  },
  "do-gia-toc-roi-tu-do": {
    id: "do-gia-toc-roi-tu-do",
    shortTitle: "Gia tốc rơi tự do",
    title: "Đo gia tốc rơi tự do",
    book: "Vật lí 10 KNTT, Bài 11",
    icon: "ArrowDown",
    keywords: ["rơi tự do", "gia tốc rơi tự do", "nam châm điện", "trụ thép", "đồng hồ hiện số"],
    theory: {
      objective: "Xác định gia tốc rơi tự do $g$ từ công thức chuyển động rơi tự do $s = \\frac{1}{2}gt^2$.",
      formula: "g = \\frac{2s}{t^2}",
      bullets: [
        "Sự rơi tự do là sự rơi của một vật chỉ dưới tác dụng của trọng lực.",
        "Chuyển động rơi tự do là chuyển động thẳng nhanh dần đều không vận tốc đầu.",
        "Đo quãng đường rơi $s$ bằng thước thẳng và thời gian rơi $t$ bằng đồng hồ MC964 kết hợp nam châm điện và cổng quang điện."
      ]
    },
    instruments: [
      { id: "stand", name: "Giá đứng chính", role: "Trục đỡ có thước đo chia mốc", uncertainty: "±0,5mm" },
      { id: "magnet", name: "Nam châm điện", role: "Giữ vật rơi bằng lực từ", uncertainty: "±0,0002s" },
      { id: "photogate", name: "Cổng quang điện", role: "Cảm biến phát hiện bi đi qua", uncertainty: "±0,0003s" },
      { id: "timer", name: "Đồng hồ hiện số MC964", role: "Đo khoảng thời gian rơi t", uncertainty: "±0,001s" },
      { id: "ball", name: "Trụ thép cảm ứng", role: "Vật rơi tự do" }
    ],
    steps: [
      { id: "step-1", title: "Lắp ráp giá đứng", assistant: "Khởi đầu tốt đẹp! Đầu tiên, hãy gắp 'Giá đỡ kim loại' ở khay bên trái rồi thả vào ô vuông đứt nét của bàn thí nghiệm nhé." },
      { id: "step-2", title: "Lắp nam châm điện", assistant: "Tuyệt vời! Bây giờ, hãy kẹp chiếc 'Nam châm điện' lên đầu phía trên của cột thép đứng." },
      { id: "step-3", title: "Lắp cổng quang điện", assistant: "Sắp xong phần cơ rồi! Hãy lắp gá 'Cổng quang điện' vào phần thân giữa của thước đo." },
      { id: "step-4", title: "Đặt đồng hồ MC964", assistant: "Tuyệt quá! Tiếp tục đặt chiếc 'Đồng hồ MC964' lên góc phải bàn để nối thông đường truyền tín hiệu dây cáp." },
      { id: "step-5", title: "Treo trụ thép", assistant: "Mắt xích cuối cùng! Kéo 'Trụ thép cảm ứng từ' treo dính cố định vào nam châm điện ở mốc trên cùng để chờ đo." },
      { id: "step-6", title: "Tiến hành đo", assistant: "Lắp ráp hoàn hảo! Hãy trượt dọc cổng quang điện để thay đổi s, sau đó nhấn nút 'NHẢ NAM CHÂM' để chạy thí nghiệm." }
    ],
    dataBook: {
      columns: [
        { key: "distance", label: "Quãng đường rơi s", unit: "m", editable: true },
        { key: "time", label: "Thời gian rơi t", unit: "s", editable: false },
        { key: "result", label: "Gia tốc g tự tính", unit: "m/s²", editable: true }
      ],
      expectedValue: { label: "g chuẩn", value: 9.806, unit: "m/s²" },
      resultLabel: "Gia tốc rơi tự do",
      resultUnit: "m/s²",
      formulaHint: "g = \\frac{2s}{t^2}"
    },
    homework: [
      "Tại sao trong thí nghiệm này ta dùng trụ thép làm vật rơi mà không dùng quả bóng nhựa hay giấy vo tròn?",
      "Tính sai số tuyệt đối của gia tốc rơi tự do $g$ nhận được từ các lần đo thực nghiệm."
    ]
  },
  "do-dien-tro-dinh-luat-ohm": {
    id: "do-dien-tro-dinh-luat-ohm",
    shortTitle: "Điện trở — định luật Ohm",
    title: "Đo điện trở theo định luật Ohm",
    book: "Vật lí 11 KNTT, Bài 23",
    icon: "Zap",
    keywords: ["điện trở", "định luật ohm", "vật dẫn X", "vật dẫn Y", "vôn kế", "ampe kế", "U trên I"],
    theory: {
      objective: "Khảo sát đặc tuyến $I-U$ của hai vật dẫn kim loại X, Y và xác định điện trở của mỗi vật dẫn bằng tỉ số $R = U/I$.",
      formula: "R = \\frac{U}{I}",
      bullets: [
        "Với vật dẫn kim loại ở nhiệt độ ổn định, cường độ dòng điện tỉ lệ thuận với hiệu điện thế đặt vào hai đầu vật dẫn.",
        "Ampe kế mắc nối tiếp với vật dẫn; vôn kế mắc song song với hai đầu vật dẫn.",
        "Đo ít nhất 5 cặp $(U,I)$ cho mỗi vật dẫn và kiểm tra tỉ số $U/I$ gần như không đổi."
      ]
    },
    instruments: [
      { id: "dc-source", name: "Nguồn DC điều chỉnh", role: "Tạo hiệu điện thế một chiều thay đổi được", uncertainty: "±0,1 V" },
      { id: "switch", name: "Khóa K", role: "Đóng/ngắt mạch an toàn" },
      { id: "conductor-x", name: "Vật dẫn X", role: "Mẫu điện trở thứ nhất" },
      { id: "conductor-y", name: "Vật dẫn Y", role: "Mẫu điện trở thứ hai" },
      { id: "ammeter", name: "Đồng hồ số 1", role: "Đo cường độ dòng điện ở mode mA", uncertainty: "±0,1 mA" },
      { id: "voltmeter", name: "Đồng hồ số 2", role: "Đo hiệu điện thế ở mode V", uncertainty: "±0,1 V" }
    ],
    steps: [
      { id: "step-1", title: "Bố trí dụng cụ", assistant: "Đặt nguồn, khóa K, hai đồng hồ số và vật dẫn lên đúng vị trí bàn thí nghiệm." },
      { id: "step-2", title: "Nối mạch đo", assistant: "Mắc ampe kế nối tiếp, vôn kế song song và giữ khóa K ở trạng thái mở khi nối dây." },
      { id: "step-3", title: "Chọn thang đo", assistant: "Chọn mode mA cho đồng hồ dòng điện và mode V DC cho đồng hồ hiệu điện thế." },
      { id: "step-4", title: "Đo vật dẫn X", assistant: "Đóng khóa K, thay đổi điện áp nguồn và ghi đủ 5 cặp số liệu U, I của X." },
      { id: "step-5", title: "Đo vật dẫn Y", assistant: "Mở khóa, đổi sang vật dẫn Y rồi đo thêm 5 cặp U, I." },
      { id: "step-6", title: "Xử lí kết quả", assistant: "Tính R = U/I, vẽ đặc tuyến I-U và so sánh điện trở của X, Y." }
    ],
    dataBook: {
      columns: [
        { key: "voltage", label: "Hiệu điện thế U", unit: "V", editable: false },
        { key: "current", label: "Cường độ dòng điện I", unit: "A", editable: false },
        { key: "result", label: "Điện trở R", unit: "Ω", editable: true }
      ],
      resultLabel: "Điện trở vật dẫn",
      resultUnit: "Ω",
      formulaHint: "R = \\frac{U}{I}"
    },
    homework: [
      "Giải thích vì sao ampe kế phải mắc nối tiếp còn vôn kế phải mắc song song với vật dẫn.",
      "Từ đồ thị $I-U$, hãy nêu cách xác định điện trở của vật dẫn và so sánh X với Y."
    ]
  },
  "do-suat-dien-dong-pin-dien-hoa": {
    id: "do-suat-dien-dong-pin-dien-hoa",
    shortTitle: "Suất điện động pin",
    title: "Thực hành đo suất điện động pin điện hóa",
    book: "Vật lí 11 KNTT, Bài 26",
    icon: "BatteryCharging",
    keywords: ["suất điện động", "pin điện hóa", "điện trở trong", "vôn kế", "ampe kế", "biến trở", "đồ thị U-I"],
    theory: {
      objective: "Đo nhiều cặp hiệu điện thế mạch ngoài U và cường độ dòng điện I để xác định suất điện động và điện trở trong của pin.",
      formula: "U = \\mathcal{E} - Ir",
      bullets: [
        "Thay đổi biến trở làm dòng điện I thay đổi; vôn kế đo hiệu điện thế U giữa hai cực pin.",
        "Đồ thị U theo I là đường thẳng: tung độ gốc bằng suất điện động $\\mathcal{E}$, độ lớn hệ số góc bằng điện trở trong r.",
        "Cần mở khóa K khi lắp hoặc đổi dây và chọn đúng thang đo trước khi đóng mạch."
      ]
    },
    instruments: [
      { id: "circuit-board", name: "Bảng lắp mạch 216 nút", role: "Gắn và nối các thiết bị" },
      { id: "unknown-cell", name: "Pin điện hóa cần đo", role: "Nguồn có suất điện động và điện trở trong chưa biết" },
      { id: "ammeter", name: "Đồng hồ ĐO1", role: "Đo cường độ dòng điện ở thang mA" },
      { id: "voltmeter", name: "Đồng hồ ĐO2", role: "Đo hiệu điện thế giữa hai cực pin" },
      { id: "rheostat", name: "Biến trở 100 Ω", role: "Tạo nhiều giá trị dòng điện khác nhau" },
      { id: "protective-resistor", name: "Điện trở bảo vệ", role: "Hạn dòng trong mạch" },
      { id: "switch", name: "Khóa K", role: "Đóng/ngắt mạch" }
    ],
    steps: [
      { id: "step-1", title: "Lắp dụng cụ", assistant: "Kéo bảng, pin, khóa K, điện trở bảo vệ, biến trở và hai đồng hồ từ khay vào đúng ô sáng." },
      { id: "step-2", title: "Nối mạch", assistant: "Mắc ĐO1 nối tiếp và ĐO2 song song với hai cực pin; kiểm tra đúng cực." },
      { id: "step-3", title: "Chọn thang đo", assistant: "Đặt ĐO1 ở mA và ĐO2 ở V trước khi đóng khóa K." },
      { id: "step-4", title: "Đo U và I", assistant: "Đóng K, thay đổi biến trở và ghi ít nhất 5 cặp U, I độc lập." },
      { id: "step-5", title: "Vẽ đồ thị", assistant: "Vẽ U theo I, hồi quy đường thẳng U = E − Ir." },
      { id: "step-6", title: "Suy ra E và r", assistant: "Đọc tung độ gốc để xác định E và độ lớn hệ số góc để xác định r." }
    ],
    dataBook: {
      columns: [
        { key: "current", label: "Cường độ dòng điện I", unit: "A", editable: false },
        { key: "voltage", label: "Hiệu điện thế U", unit: "V", editable: false },
        { key: "result", label: "Suất điện động E", unit: "V", editable: true }
      ],
      expectedValue: { label: "Pin danh định", value: 1.5, unit: "V" },
      resultLabel: "Suất điện động pin",
      resultUnit: "V",
      formulaHint: "U = \\mathcal{E} - Ir"
    },
    homework: [
      "Từ đồ thị U-I, nêu cách xác định suất điện động và điện trở trong của pin.",
      "Vì sao cần điện trở bảo vệ và phải mở khóa K khi thay đổi cách mắc?"
    ]
  }
};

export function getExperimentSpec(id: string): ExperimentSpec | undefined {
  return EXPERIMENT_SPECS[id];
}
