export type LessonId = 
  | "do-toc-do-vat-chuyen-dong" 
  | "do-gia-toc-roi-tu-do"
  | string;

export interface InstrumentSpec {
  id: string;
  name: string;
  role: string;
  uncertainty?: string;
}

export interface StepSpec {
  id: string;
  title: string;
  assistant: string;
}

export type ColumnKey = "distance" | "angle" | "time" | "result" | string;

export interface DataColumn {
  key: ColumnKey;
  label: string;
  unit: string;
  editable: boolean;
}

export interface ExpectedValue {
  label: string;
  value: number;
  unit: string;
}

export interface ExperimentSpec {
  id: LessonId;
  shortTitle: string;
  title: string;
  book: string; // e.g., "Vật lí 10 KNTT, Bài 11"
  icon: string;
  keywords: string[]; // used for OCR classification
  theory: {
    objective: string;
    formula: string;
    bullets: string[];
  };
  instruments: InstrumentSpec[];
  steps: StepSpec[];
  dataBook: {
    columns: DataColumn[];
    expectedValue?: ExpectedValue;
    resultLabel: string;
    resultUnit: string;
    formulaHint: string;
  };
  homework: string[];
}

export interface Note {
  id: string;
  lessonId: LessonId;
  title: string;
  content: string;
  createdAt: string;
}

/** Một lần đo giàu thông tin do engine lab xuất ra (đủ để chấm điểm). */
export interface RichTrial {
  lab: "average" | "instant" | "freefall";
  s: number;            // sEF (average) | d/1000 (instant) | quãng rơi s (freefall) — mét
  t: number;            // thời gian đo (s)
  theta?: number;       // góc nghiêng (Bài 6)
  balanced?: boolean;   // máng đã cân bằng khi đo chưa
  studentResult?: number | null; // kết quả HS tự tính (điền ở Notes)
}

export interface ExperimentReport {
  id: string;
  lessonId: string;
  title: string;
  shortTitle: string;
  date: string;
  attempt: number;
  measures: Array<{ s: number; t: number }>;
  /** Dữ liệu đo giàu thông tin (kèm lab/theta/balanced) để chấm điểm. */
  trials?: RichTrial[];
  score: number;          // điểm tổng (thang 10)
  /** Điểm đồ thị HS tự vẽ (0..10) — bắt buộc khi nộp báo cáo. */
  graphScore?: number;
  aiFeedback: string;
}

export interface Lesson {
  id: LessonId;
  title: string;
  book: string;
}
