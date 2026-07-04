const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const PROJECT_NAME = "phylab"; // Thay đổi nếu bạn đặt tên dự án khác trên Cloudflare
const ENV_FILE = path.join(__dirname, "../cloudflare-env.txt");

console.log("=====================================================");
console.log("🚀 Đang khởi động tiến trình tải biến môi trường lên Cloudflare...");
console.log("=====================================================");

// 1. Kiểm tra file cấu hình
if (!fs.existsSync(ENV_FILE)) {
  console.error(`❌ Không tìm thấy file: ${ENV_FILE}`);
  console.log("Vui lòng tạo file cloudflare-env.txt ở thư mục gốc trước.");
  process.exit(1);
}

// 2. Đọc và phân tách các biến
const content = fs.readFileSync(ENV_FILE, "utf-8");
const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.startsWith("#"));

console.log(`📋 Tìm thấy ${lines.length} biến môi trường cần tải lên.`);
console.log("🔑 Vui lòng đảm bảo bạn đã chạy lệnh 'npx wrangler login' trước đó để đăng nhập.\n");

const isWin = process.platform === "win32";
const npxCmd = isWin ? "npx.cmd" : "npx";

// 3. Lặp qua từng biến và thực thi npx wrangler pages secret put
lines.forEach((line, index) => {
  const separatorIndex = line.indexOf("=");
  if (separatorIndex === -1) return;

  const key = line.substring(0, separatorIndex).trim();
  const value = line.substring(separatorIndex + 1).trim();

  if (!key || !value) return;

  console.log(`[${index + 1}/${lines.length}] Đang tải biến: ${key}...`);

  // Thực thi wrangler pages secret put và đưa giá trị vào stdin (đầu vào tiêu chuẩn)
  const result = spawnSync(
    npxCmd,
    ["wrangler", "pages", "secret", "put", key, "--project-name", PROJECT_NAME],
    {
      input: value,
      encoding: "utf-8",
      shell: true,
    }
  );

  if (result.status === 0) {
    console.log(`  ✅ Thành công.`);
  } else {
    console.error(`  ❌ Lỗi khi tải biến ${key}:`);
    console.error(result.stderr || result.stdout);
  }
});

console.log("\n=====================================================");
console.log("🎉 Hoàn tất tải toàn bộ biến môi trường lên Cloudflare!");
console.log("=====================================================");
