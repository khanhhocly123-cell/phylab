const { spawn } = require("child_process");
const http = require("http");

console.log("=====================================================");
console.log("🌟 Khởi động PhyLab & Thiết lập đường truyền từ xa...");
console.log("=====================================================");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const npxCmd = isWin ? "npx.cmd" : "npx";

// 1. Khởi động Next.js dev server ở port 3000
const nextDev = spawn(npmCmd, ["run", "dev"], { shell: true });

nextDev.stdout.on("data", (data) => {
  const output = data.toString();
  if (output.includes("Ready") || output.includes("started") || output.includes("Local")) {
    console.log("[Next.js]: Dev server đã sẵn sàng tại http://localhost:3000");
  }
});

nextDev.stderr.on("data", (data) => {
  console.error(`[Next.js Error]: ${data}`);
});

// Hàm kiểm tra khi nào port 3000 hoạt động thì mới bật tunnel
function checkPortAndStartTunnel() {
  http.get("http://localhost:3000", () => {
    startTunnel();
  }).on("error", () => {
    // Nếu chưa kết nối được, thử lại sau 1 giây
    setTimeout(checkPortAndStartTunnel, 1000);
  });
}

function startTunnel() {
  console.log("🔗 Đang kết nối đường truyền bảo mật ra internet (Localtunnel)...");
  
  // 2. Chạy localtunnel thông qua npx
  const tunnel = spawn(npxCmd, ["localtunnel", "--port", "3000"], { shell: true });
  
  tunnel.stdout.on("data", (data) => {
    const output = data.toString().trim();
    if (output.includes("url is")) {
      const url = output.split("url is:")[1]?.trim() || output;
      console.log("\n=====================================================");
      console.log("🚀 PHÒNG THÍ NGHIỆM PHYLAB ĐÃ ONLINE TỪ XA!");
      console.log("🔗 Hãy gửi đường link này cho Ban giám khảo/BTC:");
      console.log(`👉 \x1b[36m${url}\x1b[0m`);
      console.log("-----------------------------------------------------");
      console.log("💡 Lưu ý: Khi BTC truy cập lần đầu, họ cần điền IP Public");
      console.log("   của máy bạn để xác thực. Hãy lấy IP tại: https://ipv4.icanhazip.com");
      console.log("=====================================================\n");
    }
  });

  tunnel.stderr.on("data", (data) => {
    console.error(`[Tunnel Error]: ${data}`);
  });

  tunnel.on("close", (code) => {
    console.log(`[Tunnel] Đường truyền đóng với mã: ${code}`);
    nextDev.kill();
    process.exit(code);
  });
}

// Bắt đầu thăm dò port 3000
checkPortAndStartTunnel();

// Xử lý khi tắt terminal
process.on("SIGINT", () => {
  nextDev.kill();
  process.exit();
});
