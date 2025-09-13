// === IMPORT CƠ BẢN ===
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// === Axios với retry ===
const axiosInstance = axios.create({ timeout: 5000 });
axiosInstance.interceptors.response.use(
  res => res,
  async error => {
    const { config } = error;
    if (!config) return Promise.reject(error);
    const MAX_RETRIES = 3;
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount < MAX_RETRIES) {
      config.__retryCount++;
      const delay = Math.pow(2, config.__retryCount) * 100;
      await new Promise(r => setTimeout(r, delay));
      return axiosInstance(config);
    }
    return Promise.reject(error);
  }
);

// === Bộ nhớ giữ độ tin cậy mỗi phiên ===
let lastPhien = null;
let lastConfidence = null;
function getStableConfidence(phien) {
  if (lastPhien !== phien) {
    lastPhien = phien;
    lastConfidence = (Math.random() * (80 - 40) + 40).toFixed(2) + "%"; // random 40–80%
  }
  return lastConfidence;
}

// === Thuật toán dự đoán Tài/Xỉu theo xí ngầu ===
function duDoanTheoXiNgau(dice) {
  const [d1, d2, d3] = dice;
  const total = d1 + d2 + d3;
  let result_list = [];
  for (let d of [d1, d2, d3]) {
    let tmp = d + total;
    if (tmp === 4 || tmp === 5) tmp -= 4;
    else if (tmp >= 6) tmp -= 6;
    result_list.push(tmp % 2 === 0 ? "Tài" : "Xỉu");
  }
  // Lấy kết quả xuất hiện nhiều nhất
  return result_list.sort((a, b) =>
    result_list.filter(v => v === a).length - result_list.filter(v => v === b).length
  ).pop();
}

// === Mẫu cầu xấu / đẹp ===
function isCauXau(cauStr) {
  const mau_cau_xau = [
    "TXXTX", "TXTXT", "XXTXX", "XTXTX", "TTXTX",
    "XTTXT", "TXXTT", "TXTTX", "XXTTX", "XTXTT",
    "TXTXX", "XXTXT", "TTXXT", "TXTTT", "XTXTX",
    "XTXXT", "XTTTX", "TTXTT", "XTXTT", "TXXTX"
  ];
  return mau_cau_xau.includes(cauStr);
}

function isCauDep(cauStr) {
  const mau_cau_dep = [
    "TTTTT", "XXXXX", "TTTXX", "XXTTT", "TXTXX",
    "TTTXT", "XTTTX", "TXXXT", "XXTXX", "TXTTT",
    "XTTTT", "TTXTX", "TXXTX", "TXTXT", "XTXTX",
    "TTTXT", "XTTXT", "TXTXT", "XXTXX", "TXXXX"
  ];
  return mau_cau_dep.includes(cauStr);
}

// === API chính ===
app.get('/api/sicbo/vip', async (req, res, next) => {
  try {
    // API lịch sử của b
    const response = await axiosInstance.get('https://sicbosun-7.onrender.com/api/lxk');
    const history = response.data;

    if (!Array.isArray(history) || history.length === 0) {
      return res.json({ error: "Không đủ dữ liệu lịch sử." });
    }

    const latest = history[0]; // phiên gần nhất
    const dice = [latest.xuc_xac_1, latest.xuc_xac_2, latest.xuc_xac_3];
    const tong = latest.tong;

    // Dự đoán cơ bản theo xí ngầu
    let prediction = duDoanTheoXiNgau(dice);

    // Lấy 5 cầu gần nhất (T/X)
    let cauStr = history.slice(0, 5).map(h => h.ket_qua[0].toUpperCase()).join("");

    // Xử lý theo cầu
    if (isCauXau(cauStr)) {
      prediction = prediction === "Tài" ? "Xỉu" : "Tài"; // đảo ngược nếu cầu xấu
    } else if (isCauDep(cauStr)) {
      // Giữ nguyên nếu cầu đẹp
    }

    // Random độ tin cậy ổn định theo phiên
    const doTinCay = getStableConfidence(latest.phien);

    // Dự đoán vị (5 số quanh tổng)
    const duDoanVi = [
      tong,
      tong + 1,
      tong - 1,
      tong + 2,
      tong - 2
    ].map(v => Math.min(Math.max(v, 3), 18)); // giới hạn 3–18

    // Kết quả cuối
    const result = {
      id: "@cskhtoolxk",
      phien_truoc: `#${latest.phien}`,
      ket_qua: latest.ket_qua,
      xuc_xac: dice,
      tong: tong,
      phien_sau: parseInt(latest.phien) + 1,
      du_doan: prediction,
      do_tin_cay: doTinCay,
      du_doan_vi: duDoanVi,
      giai_thich: `bú cu anh ko`
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// === Middleware lỗi ===
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err);
  res.status(500).json({ error: "Server lỗi." });
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`✅ API Sicbo VIP chạy tại http://localhost:${PORT}`);
});
