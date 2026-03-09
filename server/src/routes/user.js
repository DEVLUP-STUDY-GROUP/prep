const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// 회원가입
router.post('/register', userController.register);

// 로그인
router.post('/login', userController.login);

// 내 정보 조회
router.get('/me', authenticateToken, userController.getProfile);

// 내 결제 내역
router.get('/me/payments', authenticateToken, userController.getMyPayments);

module.exports = router;
