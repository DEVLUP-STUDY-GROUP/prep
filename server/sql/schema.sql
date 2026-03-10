-- Prep 결제 모듈 데이터베이스 스키마
-- 실행: mysql -u root -p riseone < schema.sql

-- 상품 테이블
CREATE TABLE IF NOT EXISTS tb_prep_products (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '상품 ID',
    name VARCHAR(200) NOT NULL COMMENT '상품명',
    price INT NOT NULL COMMENT '가격',
    description TEXT COMMENT '상품 설명',
    is_active BOOLEAN DEFAULT TRUE COMMENT '판매 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시'
) COMMENT '상품 테이블';

-- 회원 테이블
CREATE TABLE IF NOT EXISTS tb_prep_users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '회원 ID',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT '이메일 (로그인 ID)',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt)',
    name VARCHAR(50) NOT NULL COMMENT '이름',
    phone VARCHAR(20) NOT NULL COMMENT '휴대폰번호',
    is_admin BOOLEAN DEFAULT FALSE COMMENT '관리자 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시'
) COMMENT '회원 테이블';

-- 결제 테이블
CREATE TABLE IF NOT EXISTS tb_prep_payments (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '결제 ID',
    user_id INT NOT NULL COMMENT '회원 ID',
    order_id VARCHAR(64) NOT NULL UNIQUE COMMENT '주문번호 (토스용)',
    payment_key VARCHAR(200) COMMENT '토스 결제키',
    product_id INT NOT NULL COMMENT '상품 ID',
    amount INT NOT NULL COMMENT '결제 금액',
    status ENUM(
        'PENDING',
        'DONE',
        'CANCELED',
        'FAILED'
    ) DEFAULT 'PENDING' COMMENT '결제 상태',
    paid_at TIMESTAMP NULL COMMENT '결제 완료 시간',
    canceled_at TIMESTAMP NULL COMMENT '취소 시간',
    toss_response JSON COMMENT '토스 API 응답 전체 저장',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    FOREIGN KEY (user_id) REFERENCES tb_prep_users (id),
    FOREIGN KEY (product_id) REFERENCES tb_prep_products (id)
) COMMENT '결제 테이블';

-- 코드 배치 테이블 (관리자가 CSV로 업로드하는 단위)
CREATE TABLE IF NOT EXISTS tb_prep_code_batches (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '배치 ID',
    name VARCHAR(200) NOT NULL COMMENT '배치명',
    product_id INT NOT NULL COMMENT '상품 ID',
    total_count INT NOT NULL DEFAULT 0 COMMENT '총 코드 수',
    assigned_count INT NOT NULL DEFAULT 0 COMMENT '할당된 코드 수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    FOREIGN KEY (product_id) REFERENCES tb_prep_products (id)
) COMMENT '코드 배치 테이블';

-- 인증 코드 테이블
CREATE TABLE IF NOT EXISTS tb_prep_auth_codes (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '코드 ID',
    batch_id INT NOT NULL COMMENT '배치 ID',
    code VARCHAR(100) NOT NULL UNIQUE COMMENT '고유 인증 코드',
    status ENUM('AVAILABLE', 'ASSIGNED', 'EXPIRED') DEFAULT 'AVAILABLE' COMMENT '코드 상태',
    assigned_to INT NULL COMMENT '할당된 회원 ID',
    payment_id INT NULL COMMENT '결제 ID',
    assigned_at TIMESTAMP NULL COMMENT '할당 시간',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    FOREIGN KEY (batch_id) REFERENCES tb_prep_code_batches (id),
    FOREIGN KEY (assigned_to) REFERENCES tb_prep_users (id),
    FOREIGN KEY (payment_id) REFERENCES tb_prep_payments (id)
) COMMENT '인증 코드 테이블';

-- 인덱스
CREATE INDEX idx_payments_status ON tb_prep_payments (status);
CREATE INDEX idx_payments_user ON tb_prep_payments (user_id);
CREATE INDEX idx_users_email ON tb_prep_users (email);
CREATE INDEX idx_auth_codes_status ON tb_prep_auth_codes (status);
CREATE INDEX idx_auth_codes_batch ON tb_prep_auth_codes (batch_id);
CREATE INDEX idx_auth_codes_payment ON tb_prep_auth_codes (payment_id);

-- 샘플 상품 데이터
INSERT INTO
    tb_prep_products (name, price, description)
VALUES (
        '웹개발 기초 강의',
        50000,
        'HTML, CSS, JavaScript 기초부터 실전 프로젝트까지'
    ),
    (
        'React 완벽 가이드',
        80000,
        'React 18 최신 기능과 실무 패턴 학습'
    ),
    (
        'Node.js 백엔드 마스터',
        70000,
        'Express, MongoDB, REST API 구축 완벽 가이드'
    );

-- 관리자 계정 (비밀번호: admin1234 → bcrypt 해시)
-- 실제 배포 시 반드시 비밀번호 변경 필요
INSERT INTO tb_prep_users (email, password, name, phone, is_admin)
VALUES ('admin@prep.co.kr', '$2b$10$FWBJG4CXc5bPZejhjrB1b.cuQOjVglR6JGlWqNOeQXwZeq.hl3QKq', '관리자', '010-0000-0000', TRUE);
