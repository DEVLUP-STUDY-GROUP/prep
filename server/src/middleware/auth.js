const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'prep-secret-key-change-in-production';

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, isAdmin: user.is_admin },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: '인증이 만료되었습니다. 다시 로그인해주세요.' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    next();
}

module.exports = {
    generateToken,
    authenticateToken,
    requireAdmin
};
