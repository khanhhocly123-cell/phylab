-- 0002_accounts.sql — Tài khoản PhyLab (bản Beta Phi01): đăng ký / đăng nhập + đồng bộ tiến độ giữa các máy.
-- Apply: npx wrangler d1 migrations apply phylab-db --local (dev) / --remote (prod)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,           -- chữ thường, đã bỏ khoảng trắng
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  password_hash TEXT NOT NULL,          -- "pbkdf2-sha256$<vòng lặp>$<salt>$<hash>"; tài khoản env (admin/GV) = "env"
  grade INTEGER,                        -- 10 | 11 | 12 (tuỳ chọn)
  school TEXT,
  created_at INTEGER NOT NULL,          -- epoch ms
  last_login_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                  -- SHA-256 của token trong cookie: lộ bảng này cũng không dùng lại được phiên
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE user_state (               -- tiến độ đồng bộ: Prelab đã qua, báo cáo, hướng dẫn đã xem, thông báo đã đọc…
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,                  -- JSON (đã gộp theo lib/syncMerge.ts)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE auth_throttle (            -- chống dò mật khẩu / đăng ký hàng loạt
  key TEXT PRIMARY KEY,                 -- "login:<email>" | "register:<ip>"
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_users_created ON users(created_at);
