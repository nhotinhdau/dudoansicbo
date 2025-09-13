const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// 👉 URL của API gốc
const SOURCE_API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1";

// ===== Hàm tính kết quả =====
function getKetQua(dices) {
  if (!Array.isArray(dices) || dices.length !== 3) return "Không xác định";

  const [d1, d2, d3] = dices;

  // Nếu 3 xúc xắc bằng nhau → Bão
  if (d1 === d2 && d2 === d3) return "Bão";

  const tong = d1 + d2 + d3;
  if (tong >= 4 && tong <= 10) return "Xỉu";
  if (tong >= 11 && tong <= 17) return "Tài";

  return "Không xác định";
}

// ===== Endpoint: lấy phiên gần nhất =====
app.get("/api/tx", async (req, res) => {
  try {
    const response = await axios.get(SOURCE_API_URL);
    const data = response.data;

    // Kiểm tra dữ liệu
    if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
      console.error("⚠️ Dữ liệu từ API gốc không hợp lệ hoặc rỗng.");
      return res.status(500).json({
        error: "Dữ liệu từ API gốc không hợp lệ hoặc rỗng.",
        details: "Cấu trúc phản hồi không như mong đợi.",
      });
    }

    // Lấy phiên mới nhất
    const latestResult = data.list[0];
    const dices = latestResult.dices;

    // Format lại kết quả
    const result = {
      Phien: latestResult.id,
      Xuc_xac_1: dices[0],
      Xuc_xac_2: dices[1],
      Xuc_xac_3: dices[2],
      Tong: dices[0] + dices[1] + dices[2],
      Ket_qua: getKetQua(dices),
    };

    res.json(result);

  } catch (error) {
    console.error("❌ Lỗi khi gọi API gốc:", error.message);
    res.status(500).json({
      error: "Không thể lấy dữ liệu từ API gốc.",
      details: error.message,
    });
  }
});

// ===== Endpoint mặc định =====
app.get("/", (req, res) => {
  res.send("👉 API lấy phiên gần nhất. Truy cập /api/taixiu/phien_gan_nhat để xem kết quả.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
