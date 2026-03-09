const productModel = require('../models/product');
const paymentModel = require('../models/payment');
const authCodeModel = require('../models/authCode');
const userModel = require('../models/user');
const tossPayments = require('../services/tossPayments');
const emailService = require('../services/emailService');

/**
 * 상품 목록 조회
 */
async function getProducts(req, res, next) {
    try {
        const products = await productModel.getAllActiveProducts();
        res.json({ success: true, products });
    } catch (error) {
        next(error);
    }
}

/**
 * 결제 요청 (주문 생성) - 로그인 필수
 */
async function createPayment(req, res, next) {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: '상품을 선택해주세요.'
            });
        }

        // 상품 조회
        const product = await productModel.getProductById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '상품을 찾을 수 없습니다.'
            });
        }

        // 사용 가능한 코드가 있는지 확인
        const availableCount = await authCodeModel.getAvailableCodeCount(productId);
        if (availableCount === 0) {
            return res.status(400).json({
                success: false,
                message: '현재 해당 상품의 인증 코드가 모두 소진되었습니다. 관리자에게 문의해주세요.'
            });
        }

        // 주문번호 생성
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 주문 저장
        await paymentModel.createPayment({
            orderId,
            userId,
            productId,
            amount: product.price
        });

        res.json({
            success: true,
            orderId,
            amount: product.price,
            orderName: product.name
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 결제 승인
 */
async function confirmPayment(req, res, next) {
    try {
        const { paymentKey, orderId, amount } = req.body;

        if (!paymentKey || !orderId || !amount) {
            return res.status(400).json({
                success: false,
                message: '결제 정보가 올바르지 않습니다.'
            });
        }

        // 주문 정보 조회
        const payment = await paymentModel.getPaymentByOrderId(orderId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: '주문 정보를 찾을 수 없습니다.'
            });
        }

        // 금액 검증
        if (payment.amount !== parseInt(amount)) {
            return res.status(400).json({
                success: false,
                message: '결제 금액이 일치하지 않습니다.'
            });
        }

        // 이미 처리된 결제인지 확인
        if (payment.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: '이미 처리된 결제입니다.'
            });
        }

        // 토스 페이먼츠 결제 승인
        const result = await tossPayments.confirmPayment(paymentKey, orderId, parseInt(amount));

        if (!result.success) {
            await paymentModel.updatePaymentFailed(orderId, result.error);
            return res.status(400).json({
                success: false,
                message: result.error.message || '결제 승인에 실패했습니다.'
            });
        }

        // 결제 완료 업데이트
        await paymentModel.updatePaymentConfirmed(orderId, paymentKey, result.data);

        // 인증 코드 할당
        let assignedCode = null;
        try {
            assignedCode = await authCodeModel.assignCodeToPayment(
                payment.product_id,
                payment.user_id,
                payment.id
            );
        } catch (codeError) {
            console.error('인증 코드 할당 실패:', codeError);
        }

        // 사용자 정보 조회 후 이메일 발송 (비동기)
        userModel.getUserById(payment.user_id).then(user => {
            if (user) {
                emailService.sendPaymentConfirmationEmail({
                    customerEmail: user.email,
                    customerName: user.name,
                    productName: payment.product_name,
                    amount: payment.amount,
                    orderId,
                    paidAt: new Date(),
                    authCode: assignedCode
                }).catch(err => console.error('이메일 발송 실패:', err));
            }
        }).catch(err => console.error('사용자 조회 실패:', err));

        res.json({
            success: true,
            message: '결제가 완료되었습니다.',
            authCode: assignedCode
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 결제 상태 조회
 */
async function getPaymentStatus(req, res, next) {
    try {
        const { orderId } = req.params;

        const payment = await paymentModel.getPaymentByOrderId(orderId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: '주문 정보를 찾을 수 없습니다.'
            });
        }

        // 할당된 코드 조회
        const codeInfo = await authCodeModel.getCodeByPaymentId(payment.id);

        res.json({
            success: true,
            payment: {
                orderId: payment.order_id,
                productName: payment.product_name,
                amount: payment.amount,
                status: payment.status,
                paidAt: payment.paid_at,
                authCode: codeInfo?.code || null
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getProducts,
    createPayment,
    confirmPayment,
    getPaymentStatus
};
