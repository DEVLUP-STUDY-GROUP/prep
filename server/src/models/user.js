const { pool } = require('../config/database');

async function createUser({ email, password, name, phone }) {
    const [result] = await pool.execute(
        `INSERT INTO tb_prep_users (email, password, name, phone)
         VALUES (?, ?, ?, ?)`,
        [email, password, name, phone]
    );
    return result.insertId;
}

async function getUserByEmail(email) {
    const [rows] = await pool.execute(
        'SELECT * FROM tb_prep_users WHERE email = ?',
        [email]
    );
    return rows[0] || null;
}

async function getUserById(id) {
    const [rows] = await pool.execute(
        'SELECT id, email, name, phone, is_admin, created_at FROM tb_prep_users WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById
};
