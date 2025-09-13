const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL của API gốc
const SOURCE_API_URL = 'https://wtx.tele68.com/v1/tx/sessions';

// Endpoint để lấy thông tin của phiên gần nhất
app.get('/api/taixiu/phien_gan_nhat', async (req, res) => {
    try {
        const response = await axios.get(SOURCE_API_URL);
        const data = response.data;

        // Truy cập đúng đường dẫn dữ liệu
        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
            console.error("Dữ liệu từ API gốc không hợp lệ hoặc rỗng.");
            return res.status(500).json({
                error: "Dữ liệu từ API gốc không hợp lệ hoặc rỗng.",
                details: "Cấu trúc phản hồi không như mong đợi."
            });
        }

        const latestResult = data.list[0];

        // Trích xuất và định dạng thông tin cần thiết
        const result = {
            phien_truoc: latestResult.id,
            xuc_xac: latestResult.dices
        };

        res.json(result);

    } catch (error) {
        console.error("Lỗi khi gọi API gốc:", error.message);
        res.status(500).json({
            error: "Không thể lấy dữ liệu từ API gốc.",
            details: error.message
        });
    }
});

// Endpoint mặc định
app.get('/', (req, res) => {
    res.send('Chào mừng đến với API Lấy Phiên Gần Nhất. Truy cập /api/taixiu/phien_gan_nhat để xem kết quả.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

