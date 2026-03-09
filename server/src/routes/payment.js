const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// 상품 목록 조회 (비로그인 가능)
router.get('/products', paymentController.getProducts);

// 결제 요청 (로그인 필수)
router.post('/payments', authenticateToken, paymentController.createPayment);

// 결제 승인
router.post('/payments/confirm', paymentController.confirmPayment);

// 결제 상태 조회
router.get('/payments/:orderId', paymentController.getPaymentStatus);

module.exports = router;
