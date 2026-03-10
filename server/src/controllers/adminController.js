const authCodeModel = require('../models/authCode');
const productModel = require('../models/product');

/**
 * 인증 코드 CSV 업로드
 * CSV 형식: 한 줄에 하나의 코드, 또는 code 컬럼
 */
async function uploadCodes(req, res, next) {
    try {
        const { productId, batchName } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'CSV 파일을 업로드해주세요.'
            });
        }

        if (!productId || !batchName) {
            return res.status(400).json({
                success: false,
                message: '상품과 배치명을 입력해주세요.'
            });
        }

        // 상품 존재 확인
        const product = await productModel.getProductById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '상품을 찾을 수 없습니다.'
            });
        }

        // CSV 파싱 (UTF-8 BOM 제거)
        const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
        const lines = csvContent.split(/\r?\n/).map(line => line.trim()).filter(line => line);

        // 첫 줄이 헤더인지 확인
        let codes = [];
        const firstLine = lines[0].toLowerCase();
        const startIndex = (firstLine === 'code' || firstLine === '코드' || firstLine === 'auth_code') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            // CSV에서 첫 번째 컬럼만 사용 (쉼표가 있을 경우)
            const code = lines[i].split(',')[0].trim().replace(/^["']|["']$/g, '');
            if (code) {
                codes.push(code);
            }
        }

        if (codes.length === 0) {
            return res.status(400).json({
                success: false,
                message: '유효한 코드가 없습니다.'
            });
        }

        // 중복 제거
        codes = [...new Set(codes)];

        // 배치 생성
        const batchId = await authCodeModel.createBatch({
            name: batchName,
            productId: parseInt(productId),
            totalCount: codes.length
        });

        // 코드 일괄 등록
        const insertedCount = await authCodeModel.insertCodes(batchId, codes);

        res.status(201).json({
            success: true,
            message: `${insertedCount}개의 인증 코드가 등록되었습니다.`,
            batchId,
            totalCount: insertedCount
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 코드가 포함되어 있습니다. 중복 코드를 확인해주세요.'
            });
        }
        next(error);
    }
}

/**
 * 배치 목록 조회
 */
async function getBatches(req, res, next) {
    try {
        const batches = await authCodeModel.getAllBatches();
        res.json({ success: true, batches });
    } catch (error) {
        next(error);
    }
}

/**
 * 배치 상세 조회
 */
async function getBatchDetail(req, res, next) {
    try {
        const batch = await authCodeModel.getBatchDetail(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ success: false, message: '배치를 찾을 수 없습니다.' });
        }
        res.json({ success: true, batch });
    } catch (error) {
        next(error);
    }
}

/**
 * 상품별 사용 가능 코드 수 조회
 */
async function getAvailableCount(req, res, next) {
    try {
        const count = await authCodeModel.getAvailableCodeCount(req.params.productId);
        res.json({ success: true, availableCount: count });
    } catch (error) {
        next(error);
    }
}

/**
 * 모든 상품 조회 (관리자용)
 */
async function getProducts(req, res, next) {
    try {
        const products = await productModel.getAllProducts();
        res.json({ success: true, products });
    } catch (error) {
        next(error);
    }
}

/**
 * 상품 추가
 */
async function createProduct(req, res, next) {
    try {
        const { name, price, description } = req.body;

        if (!name || price === undefined || price === null) {
            return res.status(400).json({
                success: false,
                message: '상품명과 가격은 필수입니다.'
            });
        }

        const parsedPrice = parseInt(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                success: false,
                message: '유효한 가격을 입력해주세요.'
            });
        }

        const productId = await productModel.createProduct({
            name: name.trim(),
            price: parsedPrice,
            description: description ? description.trim() : null
        });

        res.status(201).json({
            success: true,
            message: '상품이 등록되었습니다.',
            productId
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 상품 활성/비활성 토글
 */
async function toggleProduct(req, res, next) {
    try {
        const updated = await productModel.toggleProductActive(req.params.productId);
        if (!updated) {
            return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' });
        }
        res.json({ success: true, message: '상품 상태가 변경되었습니다.' });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    uploadCodes,
    getBatches,
    getBatchDetail,
    getAvailableCount,
    getProducts,
    createProduct,
    toggleProduct
};
