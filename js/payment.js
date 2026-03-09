// 결제 모듈 JavaScript
(function() {
    'use strict';

    // 설정
    const CONFIG = {
        API_BASE_URL: '/prep/api',
        TOSS_CLIENT_KEY: 'test_ck_LlDJaYngrozLoW0KWKblVezGdRpX' // 테스트 키 (실제 운영시 변경 필요)
    };

    // 상태 관리
    let selectedProduct = null;
    let products = [];

    // DOM 요소
    const elements = {
        productList: document.getElementById('productList'),
        customerForm: document.getElementById('customerForm'),
        totalAmount: document.getElementById('totalAmount'),
        payButton: document.getElementById('payButton'),
        errorMessage: document.getElementById('errorMessage'),
        loading: document.getElementById('loading')
    };

    // 인증 헤더
    function getAuthHeaders() {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    function isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    // 네비게이션 상태 업데이트
    function updateNav() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const authLinks = document.getElementById('authLinks');
        const userArea = document.getElementById('userArea');
        const mypageLink = document.getElementById('mypageLink');
        const userName = document.getElementById('userName');
        const logoutBtn = document.getElementById('logoutBtn');

        // nav 요소가 없는 페이지(payment-success 등)에서는 스킵
        if (!authLinks || !userArea) return;

        if (token && user) {
            authLinks.style.display = 'none';
            userArea.style.display = 'flex';
            userArea.style.alignItems = 'center';
            userArea.style.gap = '12px';
            if (userName) userName.textContent = user.name + '님';
            if (mypageLink) mypageLink.style.display = 'inline';

            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                });
            }
        }
    }

    // 초기화
    async function init() {
        updateNav();
        await loadProducts();
        setupEventListeners();
    }

    // 상품 목록 로드
    async function loadProducts() {
        try {
            showLoading(true);
            const response = await fetch(`${CONFIG.API_BASE_URL}/products`);
            const data = await response.json();

            if (data.success) {
                products = data.products;
                renderProducts();
            } else {
                showError('상품 목록을 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('상품 로드 오류:', error);
            showError('서버 연결에 실패했습니다.');
        } finally {
            showLoading(false);
        }
    }

    // 상품 목록 렌더링
    function renderProducts() {
        if (!elements.productList) return;

        elements.productList.innerHTML = products.map(product => `
            <label class="product-item" data-product-id="${product.id}">
                <input type="radio" name="product" value="${product.id}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-desc">${product.description || ''}</div>
                </div>
                <div class="product-price">${formatPrice(product.price)}원</div>
            </label>
        `).join('');

        // 상품 선택 이벤트
        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', () => selectProduct(item));
        });
    }

    // 상품 선택
    function selectProduct(item) {
        document.querySelectorAll('.product-item').forEach(p => p.classList.remove('selected'));
        item.classList.add('selected');
        item.querySelector('input[type="radio"]').checked = true;

        const productId = parseInt(item.dataset.productId);
        selectedProduct = products.find(p => p.id === productId);
        updateTotalAmount();
    }

    // 총 결제금액 업데이트
    function updateTotalAmount() {
        if (elements.totalAmount && selectedProduct) {
            elements.totalAmount.textContent = `${formatPrice(selectedProduct.price)}원`;
        }
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        if (elements.customerForm) {
            elements.customerForm.addEventListener('submit', handlePayment);
        }
    }

    // 결제 처리
    async function handlePayment(e) {
        e.preventDefault();
        hideError();

        // 로그인 확인
        if (!isLoggedIn()) {
            showError('결제를 진행하려면 로그인이 필요합니다.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }

        // 상품 선택 확인
        if (!selectedProduct) {
            showError('상품을 선택해주세요.');
            return;
        }

        try {
            showLoading(true);
            disablePayButton(true);

            // 1. 주문 생성 (로그인 사용자 정보 사용)
            const orderResponse = await fetch(`${CONFIG.API_BASE_URL}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ productId: selectedProduct.id })
            });

            const orderData = await orderResponse.json();

            if (!orderData.success) {
                throw new Error(orderData.message || '주문 생성에 실패했습니다.');
            }

            // 2. 토스 페이먼츠 결제창 호출
            await requestTossPayment(orderData);

        } catch (error) {
            console.error('결제 처리 오류:', error);
            showError(error.message || '결제 처리 중 오류가 발생했습니다.');
        } finally {
            showLoading(false);
            disablePayButton(false);
        }
    }

    // 토스 페이먼츠 결제 요청
    async function requestTossPayment(orderData) {
        const tossPayments = TossPayments(CONFIG.TOSS_CLIENT_KEY);

        const payment = tossPayments.payment({ customerKey: orderData.orderId });

        await payment.requestPayment({
            method: 'CARD',
            amount: {
                currency: 'KRW',
                value: orderData.amount
            },
            orderId: orderData.orderId,
            orderName: orderData.orderName,
            successUrl: `${window.location.origin}/prep/payment-success.html`,
            failUrl: `${window.location.origin}/prep/payment-fail.html`,
            card: {
                useEscrow: false,
                flowMode: 'DEFAULT',
                useCardPoint: false,
                useAppCardOnly: false
            }
        });
    }

    // 결제 승인 처리 (payment-success.html에서 호출)
    async function confirmPayment() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentKey = urlParams.get('paymentKey');
        const orderId = urlParams.get('orderId');
        const amount = urlParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
            return { success: false, message: '결제 정보가 올바르지 않습니다.' };
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/payments/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount) })
            });

            return await response.json();
        } catch (error) {
            console.error('결제 승인 오류:', error);
            return { success: false, message: '결제 승인 중 오류가 발생했습니다.' };
        }
    }

    // 결제 상태 조회
    async function getPaymentStatus(orderId) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/payments/${orderId}`);
            return await response.json();
        } catch (error) {
            console.error('결제 상태 조회 오류:', error);
            return { success: false, message: '결제 상태 조회 중 오류가 발생했습니다.' };
        }
    }

    // 유틸리티 함수들
    function formatPrice(price) {
        return price.toLocaleString('ko-KR');
    }

    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.classList.add('active');
        }
    }

    function hideError() {
        if (elements.errorMessage) {
            elements.errorMessage.classList.remove('active');
        }
    }

    function showLoading(show) {
        if (elements.loading) {
            elements.loading.classList.toggle('active', show);
        }
    }

    function disablePayButton(disable) {
        if (elements.payButton) {
            elements.payButton.disabled = disable;
            elements.payButton.textContent = disable ? '처리 중...' : '결제하기';
        }
    }

    // 전역 함수로 노출
    window.PaymentModule = {
        init,
        confirmPayment,
        getPaymentStatus,
        formatPrice
    };

    // DOM 로드 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
