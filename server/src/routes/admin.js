const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// multer 설정 (메모리 저장)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('CSV 파일만 업로드 가능합니다.'));
        }
    }
});

// 모든 관리자 라우트는 인증 + 관리자 권한 필요
router.use(authenticateToken, requireAdmin);

// 인증 코드 CSV 업로드
router.post('/codes/upload', upload.single('file'), adminController.uploadCodes);

// 배치 목록 조회
router.get('/batches', adminController.getBatches);

// 배치 상세 조회
router.get('/batches/:batchId', adminController.getBatchDetail);

// 상품별 사용 가능 코드 수 조회
router.get('/codes/available/:productId', adminController.getAvailableCount);

// 상품 목록 조회 (관리자용)
router.get('/products', adminController.getProducts);

// 상품 추가
router.post('/products', adminController.createProduct);

// 상품 활성/비활성 토글
router.patch('/products/:productId/toggle', adminController.toggleProduct);

module.exports = router;
