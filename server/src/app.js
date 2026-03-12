require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 클라이언트 설정 (브라우저에 노출해도 되는 공개 키만)
app.get('/api/config', (req, res) => {
    res.json({ tossClientKey: process.env.TOSS_CLIENT_KEY });
});

// 라우트
app.use('/api', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 헬스 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '서버 오류가 발생했습니다.'
    });
});

// 서버 시작
async function startServer() {
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('데이터베이스 연결 실패. 서버를 시작할 수 없습니다.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
        console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer();
