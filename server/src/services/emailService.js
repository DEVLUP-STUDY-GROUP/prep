const nodemailer = require('nodemailer');

// SMTP 트랜스포터 생성
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * 결제 완료 이메일 발송
 */
async function sendPaymentConfirmationEmail(paymentData) {
    const transporter = createTransporter();

    const { customerName, customerEmail, productName, amount, orderId, paidAt } = paymentData;

    const formattedAmount = amount.toLocaleString('ko-KR');
    const formattedDate = new Date(paidAt).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: bold; }
        .amount { color: #2563eb; font-size: 1.2em; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>결제 완료</h1>
        </div>
        <div class="content">
            <p>${customerName}님, 안녕하세요.</p>
            <p>결제가 성공적으로 완료되었습니다. 감사합니다!</p>

            <div class="info-box">
                <div class="info-row">
                    <span class="label">상품명 </span>
                    <span class="value">${productName}</span>
                </div>
                <div class="info-row">
                    <span class="label">결제 금액 </span>
                    <span class="value amount">${formattedAmount}원</span>
                </div>
                <div class="info-row">
                    <span class="label">주문번호 </span>
                    <span class="value">${orderId}</span>
                </div>
                <div class="info-row">
                    <span class="label">결제일시 </span>
                    <span class="value">${formattedDate}</span>
                </div>
            </div>

            <p>강의 수강 관련 문의사항이 있으시면 언제든지 연락 주세요.</p>
        </div>
        <div class="footer">
            <p>본 메일은 발신 전용입니다.</p>
            <p>&copy; Prep Education  </p>
        </div>
    </div>
</body>
</html>
`;

    try {
        await transporter.sendMail({
            from: `"Prep Education" <${process.env.SMTP_USER}>`,
            to: customerEmail,
            subject: `[Prep] ${productName} 결제 완료 안내`,
            html: htmlContent
        });

        console.log(`결제 완료 이메일 발송 완료: ${customerEmail}`);
        return { success: true };
    } catch (error) {
        console.error('이메일 발송 오류:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendPaymentConfirmationEmail
};
