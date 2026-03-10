const { pool } = require('../config/database');

/**
 * 모든 활성 상품 조회
 */
async function getAllActiveProducts() {
    const [rows] = await pool.execute(
        'SELECT id, name, price, description FROM tb_prep_products WHERE is_active = TRUE ORDER BY id'
    );
    return rows;
}

/**
 * 상품 ID로 조회
 */
async function getProductById(id) {
    const [rows] = await pool.execute(
        'SELECT id, name, price, description FROM tb_prep_products WHERE id = ? AND is_active = TRUE',
        [id]
    );
    return rows[0] || null;
}

/**
 * 모든 상품 조회 (관리자용, 비활성 포함)
 */
async function getAllProducts() {
    const [rows] = await pool.execute(
        'SELECT id, name, price, description, is_active, created_at FROM tb_prep_products ORDER BY id'
    );
    return rows;
}

/**
 * 상품 추가
 */
async function createProduct({ name, price, description }) {
    const [result] = await pool.execute(
        'INSERT INTO tb_prep_products (name, price, description) VALUES (?, ?, ?)',
        [name, price, description || null]
    );
    return result.insertId;
}

/**
 * 상품 활성/비활성 토글
 */
async function toggleProductActive(id) {
    const [result] = await pool.execute(
        'UPDATE tb_prep_products SET is_active = NOT is_active WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}

module.exports = {
    getAllActiveProducts,
    getProductById,
    getAllProducts,
    createProduct,
    toggleProductActive
};
