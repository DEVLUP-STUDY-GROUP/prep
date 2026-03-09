const { pool } = require('../config/database');

/**
 * 코드 배치 생성
 */
async function createBatch({ name, productId, totalCount }) {
    const [result] = await pool.execute(
        `INSERT INTO tb_prep_code_batches (name, product_id, total_count)
         VALUES (?, ?, ?)`,
        [name, productId, totalCount]
    );
    return result.insertId;
}

/**
 * 인증 코드 일괄 등록
 */
async function insertCodes(batchId, codes) {
    const values = codes.map(code => [batchId, code]);
    const placeholders = values.map(() => '(?, ?)').join(', ');
    const flatValues = values.flat();

    const [result] = await pool.execute(
        `INSERT INTO tb_prep_auth_codes (batch_id, code) VALUES ${placeholders}`,
        flatValues
    );
    return result.affectedRows;
}

/**
 * 결제 완료 후 코드 순차 할당 (트랜잭션)
 */
async function assignCodeToPayment(productId, userId, paymentId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 해당 상품의 사용 가능한 코드 중 가장 오래된 것 선택 (FOR UPDATE 잠금)
        const [codes] = await connection.execute(
            `SELECT ac.id, ac.code, ac.batch_id
             FROM tb_prep_auth_codes ac
             JOIN tb_prep_code_batches cb ON ac.batch_id = cb.id
             WHERE cb.product_id = ? AND ac.status = 'AVAILABLE'
             ORDER BY ac.id ASC
             LIMIT 1
             FOR UPDATE`,
            [productId]
        );

        if (codes.length === 0) {
            await connection.rollback();
            return null;
        }

        const authCode = codes[0];

        // 코드 할당
        await connection.execute(
            `UPDATE tb_prep_auth_codes
             SET status = 'ASSIGNED', assigned_to = ?, payment_id = ?, assigned_at = NOW()
             WHERE id = ?`,
            [userId, paymentId, authCode.id]
        );

        // 배치 할당 카운트 증가
        await connection.execute(
            `UPDATE tb_prep_code_batches
             SET assigned_count = assigned_count + 1
             WHERE id = ?`,
            [authCode.batch_id]
        );

        await connection.commit();
        return authCode.code;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 사용자에게 할당된 코드 조회
 */
async function getCodesByUserId(userId) {
    const [rows] = await pool.execute(
        `SELECT ac.code, ac.assigned_at, ac.status,
                cb.name as batch_name,
                pp.name as product_name
         FROM tb_prep_auth_codes ac
         JOIN tb_prep_code_batches cb ON ac.batch_id = cb.id
         JOIN tb_prep_products pp ON cb.product_id = pp.id
         WHERE ac.assigned_to = ?
         ORDER BY ac.assigned_at DESC`,
        [userId]
    );
    return rows;
}

/**
 * 결제 ID로 할당된 코드 조회
 */
async function getCodeByPaymentId(paymentId) {
    const [rows] = await pool.execute(
        'SELECT code FROM tb_prep_auth_codes WHERE payment_id = ?',
        [paymentId]
    );
    return rows[0] || null;
}

/**
 * 상품별 사용 가능한 코드 수 조회
 */
async function getAvailableCodeCount(productId) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) as count
         FROM tb_prep_auth_codes ac
         JOIN tb_prep_code_batches cb ON ac.batch_id = cb.id
         WHERE cb.product_id = ? AND ac.status = 'AVAILABLE'`,
        [productId]
    );
    return rows[0].count;
}

/**
 * 모든 배치 목록 조회 (관리자용)
 */
async function getAllBatches() {
    const [rows] = await pool.execute(
        `SELECT cb.*, pp.name as product_name
         FROM tb_prep_code_batches cb
         JOIN tb_prep_products pp ON cb.product_id = pp.id
         ORDER BY cb.created_at DESC`
    );
    return rows;
}

/**
 * 배치 상세 조회 (코드 목록 포함)
 */
async function getBatchDetail(batchId) {
    const [batch] = await pool.execute(
        `SELECT cb.*, pp.name as product_name
         FROM tb_prep_code_batches cb
         JOIN tb_prep_products pp ON cb.product_id = pp.id
         WHERE cb.id = ?`,
        [batchId]
    );

    if (!batch[0]) return null;

    const [codes] = await pool.execute(
        `SELECT ac.id, ac.code, ac.status, ac.assigned_at,
                u.name as assigned_user_name, u.email as assigned_user_email
         FROM tb_prep_auth_codes ac
         LEFT JOIN tb_prep_users u ON ac.assigned_to = u.id
         WHERE ac.batch_id = ?
         ORDER BY ac.id`,
        [batchId]
    );

    return { ...batch[0], codes };
}

module.exports = {
    createBatch,
    insertCodes,
    assignCodeToPayment,
    getCodesByUserId,
    getCodeByPaymentId,
    getAvailableCodeCount,
    getAllBatches,
    getBatchDetail
};
