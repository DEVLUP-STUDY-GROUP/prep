const bcrypt = require('bcrypt');
const userModel = require('../models/user');
const paymentModel = require('../models/payment');
const authCodeModel = require('../models/authCode');
const { generateToken } = require('../middleware/auth');

const SALT_ROUNDS = 10;

/**
 * 회원가입
 */
async function register(req, res, next) {
    try {
        const { email, password, name, phone } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: '모든 필수 정보를 입력해주세요.'
            });
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: '올바른 이메일 주소를 입력해주세요.'
            });
        }

        // 비밀번호 길이 검증
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '비밀번호는 6자 이상이어야 합니다.'
            });
        }

        // 전화번호 형식 검증
        const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
        if (!phoneRegex.test(phone.replace(/-/g, ''))) {
            return res.status(400).json({
                success: false,
                message: '올바른 휴대폰 번호를 입력해주세요.'
            });
        }

        // 이메일 중복 확인
        const existingUser = await userModel.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: '이미 가입된 이메일입니다.'
            });
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 회원 생성
        const userId = await userModel.createUser({
            email,
            password: hashedPassword,
            name,
            phone
        });

        // 토큰 발급
        const user = await userModel.getUserById(userId);
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 로그인
 */
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '이메일과 비밀번호를 입력해주세요.'
            });
        }

        const user = await userModel.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                isAdmin: user.is_admin
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 내 정보 조회
 */
async function getProfile(req, res, next) {
    try {
        const user = await userModel.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 내 결제 내역 조회
 */
async function getMyPayments(req, res, next) {
    try {
        const payments = await paymentModel.getPaymentsByUserId(req.user.id);
        res.json({ success: true, payments });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login,
    getProfile,
    getMyPayments
};
