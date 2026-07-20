-- 0001_init.sql — Schema tính năng lớp học (giáo viên ↔ học sinh) trên Cloudflare D1.
-- Apply: npx wrangler d1 migrations apply phylab-db --local (dev) / --remote (prod)

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,            -- mã tham gia 5 ký tự (bỏ 0/O/1/I)
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL           -- epoch ms
);

CREATE TABLE memberships (
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,             -- UUID sinh ở localStorage phía HS
  student_name TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('lab', 'quiz', 'personal_quiz')),
  title TEXT NOT NULL,
  lesson_id TEXT,
  payload TEXT NOT NULL,                -- JSON: lab={problemSets...} | quiz=MoeQuiz | personal_quiz={sourceAssignmentId}
  due_at INTEGER,
  created_at INTEGER NOT NULL,
  open_at INTEGER,                      -- thời điểm MỞ quiz (epoch ms); trước đó HS chưa làm được
  duration_sec INTEGER,                 -- thời lượng làm quiz (giây); hết giờ auto nộp
  linked_lab_id TEXT                    -- quiz gắn nối tiếp sau 1 bài Lab (id assignment)
);

CREATE TABLE submissions (              -- bài Lab đã nộp (đã chấm deterministic)
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  payload TEXT NOT NULL,                -- JSON: {trials: RichTrial[], grade: LessonGrade, aiFeedback}
  score REAL NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  submitted_at INTEGER NOT NULL,
  UNIQUE (assignment_id, student_id)    -- UPSERT: giữ bản mới nhất, attempt++
);

CREATE TABLE quiz_results (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  answers TEXT NOT NULL,                -- JSON MoeAnswers
  detail TEXT NOT NULL,                 -- JSON breakdown từng câu (nguồn heatmap lỗi sai)
  score REAL NOT NULL,
  submitted_at INTEGER NOT NULL,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE activity_events (          -- cường độ vào app
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_id TEXT,
  type TEXT NOT NULL,                   -- 'login'|'lab_start'|'lab_submit'|'quiz_submit'
  meta TEXT,
  at INTEGER NOT NULL
);

CREATE INDEX idx_act_student ON activity_events(student_id, at);
CREATE INDEX idx_act_class ON activity_events(class_id, at);
CREATE INDEX idx_memb_class ON memberships(class_id);
CREATE INDEX idx_memb_student ON memberships(student_id);
CREATE INDEX idx_asg_class ON assignments(class_id);
CREATE INDEX idx_sub_asg ON submissions(assignment_id);
CREATE INDEX idx_qr_asg ON quiz_results(assignment_id);
