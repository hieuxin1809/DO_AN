/**
 * Component dùng chung cho 2 trang callback thanh toán: /thanh-cong và /thong-bao
 * Verify trạng thái thanh toán → render UI thành công / thất bại / loading
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postMethodPayload } from '../../services/request';

/* ── palette ── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';
const BORDER  = '#e2e8f0';

/**
 * @param {Object} props
 * @param {'thanh-cong'|'thong-bao'} props.variant — quyết định cách lấy endpoint
 */
export default function PaymentResult({ variant = 'thong-bao' }) {
    const nav = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'fail'
    const [errMsg, setErrMsg] = useState('');
    const [orderInfo, setOrderInfo] = useState(null); // {orderId, payType}

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const url = new URL(window.location.href);

                /* ─── DEMO MODE — chỉ để chụp màn hình, không gọi BE ─── */
                const demo = url.searchParams.get('demo');
                if (demo === 'success') {
                    setOrderInfo({ orderId: 'DEMO-ORDER-12345ABC', payType: 'PAYPAL' });
                    setStatus('success');
                    return;
                }
                if (demo === 'fail') {
                    setErrMsg('Đây là demo lỗi để chụp màn hình');
                    setStatus('fail');
                    return;
                }
                if (demo === 'loading') {
                    // ở mãi trong loading state — bấm F5 để thoát
                    return;
                }

                const orderId      = url.searchParams.get('orderId');
                const requestId    = url.searchParams.get('requestId');
                const vnpOrderInfo = url.searchParams.get('vnp_OrderInfo');
                const queryString  = url.search.substring(1);

                let payType = null;
                if (vnpOrderInfo) payType = 'VNPAY';
                else if (orderId && requestId) payType = 'MOMO';

                const payload = {
                    orderId, requestId, vnpOrderInfo,
                    vnpayUrl: queryString, payType,
                };

                let endpoint;
                if (variant === 'thanh-cong') {
                    // /thanh-cong: dùng customerschedule id lưu ở localStorage
                    const csId = localStorage.getItem('customerschedule');
                    endpoint = `/api/customer-schedule/customer/finish-payment-schedule?id=${csId}`;
                } else {
                    // /thong-bao: ưu tiên reservation id (flow mới), fallback vaccineScheduleTimeId (legacy)
                    const thongtin = JSON.parse(localStorage.getItem('thongtindangky') || '{}');
                    endpoint = thongtin.customerScheduleId
                        ? `/api/customer-schedule/customer/finish-payment-schedule?id=${thongtin.customerScheduleId}`
                        : `/api/customer-schedule/customer/finish-payment?id=${thongtin?.vaccineScheduleTime?.id}`;
                }

                const res = await postMethodPayload(endpoint, payload);
                if (cancelled) return;

                if (res.status < 300) {
                    setOrderInfo({ orderId: orderId || vnpOrderInfo, payType });
                    setStatus('success');
                } else {
                    let msg = 'Thanh toán không thành công';
                    try {
                        const j = await res.json();
                        msg = j.defaultMessage || msg;
                    } catch {}
                    setErrMsg(msg);
                    setStatus('fail');
                }
            } catch (e) {
                if (cancelled) return;
                setErrMsg('Lỗi kết nối — không xác minh được giao dịch');
                setStatus('fail');
            }
        })();
        return () => { cancelled = true; };
    }, [variant]);

    return (
        <div style={{
            minHeight: 'calc(100vh - 200px)',
            background: 'linear-gradient(135deg, #f0f4f8 0%, #e0f2fe 100%)',
            padding: '40px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#fff', borderRadius: 24,
                maxWidth: 560, width: '100%',
                padding: '40px 32px',
                boxShadow: '0 24px 60px rgba(15,23,42,.15)',
                textAlign: 'center',
            }}>
                {status === 'loading' && <Loading />}
                {status === 'success' && <Success orderInfo={orderInfo} nav={nav} />}
                {status === 'fail'    && <Failure msg={errMsg} nav={nav} />}
            </div>
        </div>
    );
}

/* ─── Loading state ─── */
function Loading() {
    return (
        <div>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%,100% { opacity: 1; }
                    50%     { opacity: 0.5; }
                }
            `}</style>
            <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: `4px solid ${BORDER}`, borderTopColor: ACCENT,
                margin: '0 auto 24px',
                animation: 'spin 0.9s linear infinite',
            }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>
                Đang xác minh giao dịch...
            </h2>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, color: TEXT_2, animation: 'pulse 1.5s ease-in-out infinite' }}>
                Vui lòng đợi trong giây lát, không tắt trang.
            </p>
        </div>
    );
}

/* ─── Success state ─── */
function Success({ orderInfo, nav }) {
    return (
        <div>
            <style>{`
                @keyframes pop-in {
                    0%   { transform: scale(0); opacity: 0; }
                    60%  { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes draw-check {
                    from { stroke-dashoffset: 50; }
                    to   { stroke-dashoffset: 0; }
                }
            `}</style>
            <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: `linear-gradient(135deg, ${SUCCESS}, #059669)`,
                margin: '0 auto 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 30px ${SUCCESS}55`,
                animation: 'pop-in 0.6s cubic-bezier(.34,1.56,.64,1)',
            }}>
                <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.5 4.5L19 7"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray="50" style={{ animation: 'draw-check 0.6s ease-out 0.4s both' }} />
                </svg>
            </div>

            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }}>
                Thanh toán thành công! 🎉
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: 15, color: TEXT_2, lineHeight: 1.6 }}>
                Cảm ơn bạn đã tin tưởng iVaccine.<br/>
                Lịch tiêm của bạn đã được xác nhận và đang chờ admin duyệt.
            </p>

            {/* Order info */}
            {orderInfo?.orderId && (
                <div style={{
                    marginTop: 24, padding: '14px 18px',
                    background: '#f8fafc', borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13,
                }}>
                    <span style={{ color: TEXT_2 }}>Mã giao dịch</span>
                    <code style={{ color: PRIMARY, fontWeight: 700, fontSize: 13 }}>
                        {orderInfo.orderId.length > 24 ? orderInfo.orderId.slice(0, 24) + '…' : orderInfo.orderId}
                    </code>
                </div>
            )}
            {orderInfo?.payType && (
                <div style={{
                    marginTop: 8, padding: '14px 18px',
                    background: '#f8fafc', borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13,
                }}>
                    <span style={{ color: TEXT_2 }}>Phương thức</span>
                    <span style={{ color: TEXT, fontWeight: 700 }}>{orderInfo.payType}</span>
                </div>
            )}

            {/* Next steps */}
            <div style={{
                marginTop: 24, padding: '14px 16px',
                background: '#eff6ff', borderRadius: 12,
                border: `1px solid ${ACCENT}33`,
                textAlign: 'left',
                fontSize: 13, color: '#1e40af', lineHeight: 1.7,
            }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 Các bước tiếp theo</div>
                <div>1. Admin sẽ duyệt lịch trong vòng vài giờ</div>
                <div>2. Bạn sẽ nhận email nhắc lịch trước 1 ngày tiêm</div>
                <div>3. Đến trung tâm đúng giờ + mang theo CMND/CCCD</div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                <button onClick={() => nav('/')}
                    style={{
                        flex: 1, padding: '12px 18px', borderRadius: 12,
                        background: '#fff', border: `1.5px solid ${BORDER}`,
                        color: TEXT_2, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = TEXT_2; e.currentTarget.style.color = TEXT; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_2; }}>
                    🏠 Trang chủ
                </button>
                <button onClick={() => { window.location.href = '/tai-khoan#lichtiem'; }}
                    style={{
                        flex: 2, padding: '12px 18px', borderRadius: 12,
                        background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                        border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        boxShadow: `0 6px 18px ${PRIMARY}40`,
                        transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    📅 Xem lịch tiêm của tôi →
                </button>
            </div>
        </div>
    );
}

/* ─── Failure state ─── */
function Failure({ msg, nav }) {
    return (
        <div>
            <style>{`
                @keyframes shake {
                    0%,100% { transform: translateX(0); }
                    25%     { transform: translateX(-8px); }
                    75%     { transform: translateX(8px); }
                }
            `}</style>
            <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: `linear-gradient(135deg, ${DANGER}, #b91c1c)`,
                margin: '0 auto 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 30px ${DANGER}55`,
                animation: 'shake 0.5s ease-in-out',
            }}>
                <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M6 18L18 6"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>

            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: TEXT }}>
                Thanh toán không thành công
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: 14, color: TEXT_2, lineHeight: 1.6 }}>
                Giao dịch của bạn chưa được hoàn tất.
            </p>

            {msg && (
                <div style={{
                    marginTop: 20, padding: '14px 16px',
                    background: '#fef2f2', borderRadius: 12,
                    border: `1px solid ${DANGER}33`,
                    color: '#991b1b', fontSize: 13.5, lineHeight: 1.6,
                    textAlign: 'left',
                }}>
                    <strong>Lý do:</strong> {msg}
                </div>
            )}

            <div style={{
                marginTop: 20, padding: '14px 16px',
                background: '#fffbeb', borderRadius: 12,
                border: '1px solid #fde68a',
                textAlign: 'left',
                fontSize: 13, color: '#92400e', lineHeight: 1.7,
            }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>💡 Lưu ý</div>
                <div>• Nếu tiền đã bị trừ, vui lòng liên hệ hotline để được hỗ trợ</div>
                <div>• Slot bạn đã chọn sẽ được tự động giải phóng sau 15 phút</div>
                <div>• Bạn có thể đặt lại lịch tiêm bất cứ lúc nào</div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                <button onClick={() => nav('/')}
                    style={{
                        flex: 1, padding: '12px 18px', borderRadius: 12,
                        background: '#fff', border: `1.5px solid ${BORDER}`,
                        color: TEXT_2, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>
                    🏠 Trang chủ
                </button>
                <button onClick={() => nav('/dang-ky-tiem-chung')}
                    style={{
                        flex: 2, padding: '12px 18px', borderRadius: 12,
                        background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                        border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        boxShadow: `0 6px 18px ${PRIMARY}40`,
                    }}>
                    🔄 Đặt lại lịch tiêm
                </button>
            </div>
        </div>
    );
}
