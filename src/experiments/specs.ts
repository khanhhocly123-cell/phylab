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
  }
};

export function getExperimentSpec(id: string): ExperimentSpec | undefined {
  return EXPERIMENT_SPECS[id];
}
