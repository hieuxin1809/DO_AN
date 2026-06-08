import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { getMethod, postMethodPayload } from '../../services/request';
import vnpay from '../../assest/images/vnpay.jpg';
import { formatMoney } from '../../services/money';
import Swal from 'sweetalert2';

const PAYPAL_CLIENT_ID = "AfQvtYaXkCSyaDdKT_f-sY3ZChQm2CXDMx94N0W3XBscBmLG3TgGIT4UzINwxjbFAOG6w19I29dWjMOk";
const PRIMARY = '#2A388F', ACCENT = '#0ea5e9', SUCCESS = '#10b981';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b', D = '#ef4444';
const BG_PAGE = '#f0f4f8';

/* Chuyển VND → USD (PayPal không hỗ trợ VND) */
function toUSD(vnd) {
    const usd = (vnd / 25000).toFixed(2);
    return Math.max(parseFloat(usd), 1.00).toFixed(2);
}

/* "09:00:00" → "09:00" */
function formatTimeHM(t) {
    if (!t) return '—';
    const parts = String(t).split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(t);
}

/* Shared input style + focus/blur handlers */
const inputStyle = {
    width:'100%', padding:'11px 14px', borderRadius:'10px',
    border:`1.5px solid ${B}`, background:'#fff',
    fontSize:'14px', color:T, outline:'none', boxSizing:'border-box',
    fontFamily:'inherit', transition:'all 0.18s',
    boxShadow:'0 1px 3px rgba(0,0,0,0.03)',
};
const focusStyle = (e) => {
    e.target.style.borderColor = ACCENT;
    e.target.style.boxShadow = '0 0 0 4px rgba(14,165,233,0.12), 0 2px 8px rgba(0,0,0,0.04)';
};
const blurStyle = (e) => {
    e.target.style.borderColor = B;
    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
};

/* Card chọn phương thức thanh toán */
function PaymentMethodCard({ inputId, value, title, subtitle, icon, onClick }) {
    return (
        <label
            htmlFor={inputId}
            onClick={onClick}
            style={{
                display:'flex', alignItems:'center', gap:'14px',
                padding:'14px 16px', borderRadius:'12px',
                border:`2px solid ${B}`, background:'#fff', cursor:'pointer',
                transition:'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = 'rgba(14,165,233,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = B; e.currentTarget.style.background = '#fff'; }}
        >
            <input type="radio" name="paytype" id={inputId} value={value}
                style={{ accentColor: ACCENT, transform:'scale(1.2)', cursor:'pointer' }} />
            <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:T }}>{title}</div>
                <div style={{ fontSize:'12.5px', color:T2, marginTop:'2px' }}>{subtitle}</div>
            </div>
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', minWidth:'64px' }}>
                {icon}
            </div>
        </label>
    );
}

/* Field read-only trong card "Thông tin người được tiêm" */
function InfoField({ label, value }) {
    return (
        <div>
            <div style={{ fontSize:'11.5px', fontWeight:'700', color:T2, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:'5px' }}>
                {label}
            </div>
            <div style={{
                padding:'10px 14px', borderRadius:'10px',
                background:'#f8fafc', border:`1px solid ${B}`,
                fontSize:'14px', color:T, fontWeight:'600',
                wordBreak:'break-word', minHeight:'19px',
            }}>
                {value || <span style={{ color:'#94a3b8', fontWeight:'400' }}>—</span>}
            </div>
        </div>
    );
}

/* Row trong card tóm tắt */
function SummaryRow({ icon, label, value }) {
    return (
        <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'7px 0' }}>
            <span style={{ fontSize:'15px', width:'20px', textAlign:'center', flexShrink:0 }}>{icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'11.5px', color:T2, fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.4px' }}>
                    {label}
                </div>
                <div style={{ fontSize:'13.5px', color:T, fontWeight:'600', marginTop:'2px', wordBreak:'break-word' }}>
                    {value}
                </div>
            </div>
        </div>
    );
}

/* ─── Wrapper an toàn cho PayPalButtons ─────────────
 * Tránh lỗi "window.paypal.Buttons is undefined" khi:
 *  - SDK đang load (chưa resolved)
 *  - SDK đã resolved nhưng namespace bị stale từ hot-reload
 * Hiển thị loading spinner đến khi mọi thứ sẵn sàng.
 * ──────────────────────────────────────────────── */
function SafePayPalButtons(props) {
    const [{ isResolved, isRejected, isPending }, dispatch] = usePayPalScriptReducer();
    const [windowReady, setWindowReady] = useState(false);
    const [timedOut,    setTimedOut]    = useState(false);

    useEffect(() => {
        if (!isResolved) { setWindowReady(false); return; }
        let cancelled = false;
        let attempts  = 0;
        const tick = () => {
            if (cancelled) return;
            if (typeof window !== 'undefined' && window.paypal && typeof window.paypal.Buttons === 'function') {
                setWindowReady(true);
                setTimedOut(false);
                return;
            }
            attempts++;
            if (attempts > 80) { setTimedOut(true); return; } // ~8s
            setTimeout(tick, 100);
        };
        tick();
        return () => { cancelled = true; };
    }, [isResolved]);

    // Timeout sau khi resolved nhưng không thấy Buttons → script load nhưng thiếu component
    if (isResolved && timedOut) {
        const ns = (typeof window !== 'undefined' && window.paypal) ? Object.keys(window.paypal).join(', ') : '(không có)';
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: T }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
                <p style={{ margin: 0, fontWeight: '700' }}>PayPal SDK đã load nhưng thiếu component Buttons.</p>
                <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: T2 }}>
                    Có thể do trình duyệt cache SDK cũ hoặc extension chặn. window.paypal chứa: <code>{ns}</code>
                </p>
                <button
                    onClick={() => {
                        // Xoá script paypal cũ + reload SDK
                        document.querySelectorAll('script[src*="paypal.com/sdk"]').forEach(s => s.remove());
                        try { delete window.paypal; } catch(e) { window.paypal = undefined; }
                        setTimedOut(false);
                        setWindowReady(false);
                        dispatch({ type: 'resetOptions', value: { clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons', environment: 'sandbox' } });
                    }}
                    style={{ marginTop: '12px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: `linear-gradient(135deg, ${'#2A388F'}, #0ea5e9)`, color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                    🔄 Tải lại PayPal SDK
                </button>
            </div>
        );
    }

    if (isRejected) {
        return (
            <div style={{ textAlign: 'center', padding: '24px', color: D }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
                <p style={{ margin: 0, fontWeight: '600' }}>Không tải được PayPal SDK.</p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: T2 }}>
                    Kiểm tra kết nối mạng, tắt ad-blocker, hoặc tải lại trang (Ctrl + Shift + R).
                </p>
            </div>
        );
    }
    if (isPending || !isResolved || !windowReady) {
        return (
            <div style={{ textAlign: 'center', padding: '32px', color: T2 }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <p style={{ margin: 0, fontSize: '13.5px' }}>Đang tải PayPal...</p>
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                    isResolved={String(isResolved)} · isPending={String(isPending)}
                </p>
            </div>
        );
    }
    return <PayPalButtons {...props} />;
}

function XacNhanDangky() {
    const [vaccineTime,      setVaccineTime]      = useState(null);
    const [customer,         setCustomer]         = useState(null);
    const [showPaypalModal,  setShowPaypalModal]  = useState(false);
    const [pendingPayload,   setPendingPayload]   = useState(null);
    const [paypalProcessing, setPaypalProcessing] = useState(false);
    const [bookingForOther,  setBookingForOther]  = useState(false);
    const [patientInfo,      setPatientInfo]      = useState(null); // {fullName, dob, phone, address}
    const [missingInfo,      setMissingInfo]      = useState(false);

    /* Reservation state — slot bị hold trong 15 phút */
    const [reservationId, setReservationId] = useState(null);
    const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);

    /* Countdown tick */
    useEffect(() => {
        if (!reservationId || holdSecondsLeft <= 0) return;
        const t = setInterval(() => {
            setHoldSecondsLeft(s => {
                if (s <= 1) {
                    clearInterval(t);
                    toast.warning('Đã hết thời gian giữ chỗ. Vui lòng đặt lại.');
                    setShowPaypalModal(false);
                    setReservationId(null);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [reservationId, holdSecondsLeft]);

    const fmtCountdown = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    useEffect(() => {
        const fetchData = async () => {
            const r1 = await getMethod('/api/customer-profile/customer/find-by-user');
            setCustomer(await r1.json());

            const uls  = new URL(document.URL);
            const time = uls.searchParams.get('time');
            setBookingForOther(uls.searchParams.get('for') === 'other');
            const r2   = await getMethod('/api/vaccine-schedule-time/public/find-by-id?id=' + time);
            setVaccineTime(await r2.json());

            // Đọc thông tin patient từ sessionStorage (đã nhập ở booking step)
            try {
                const stored = sessionStorage.getItem('patientInfo_' + time);
                if (stored) {
                    setPatientInfo(JSON.parse(stored));
                } else {
                    setMissingInfo(true);
                }
            } catch (e) {
                setMissingInfo(true);
            }
        };
        fetchData();
    }, []);

    function vnpayClick()  { document.getElementById('paytype-vnpay').click(); }
    function paypalClick() { document.getElementById('paytype-paypal').click(); }

    function getPayload(/* event */) {
        if (!patientInfo) {
            toast.error('Thiếu thông tin người được tiêm. Vui lòng quay lại bước đăng ký.');
            throw new Error('missing patientInfo');
        }
        return {
            fullName: patientInfo.fullName,
            dob:      patientInfo.dob,
            phone:    patientInfo.phone,
            idCard:   patientInfo.idCard,
            address:  patientInfo.address,
            vaccineScheduleTime: { id: vaccineTime.id },
            bookingForOther: bookingForOther,
        };
    }

    function validateForm(event) {
        const dobInput = event.target.elements.ngaysinhnt.value;
        const dobValue = new Date(dobInput);
        const today    = new Date();
        if (dobValue > today) { toast.error('Ngày sinh phải nhỏ hơn ngày hiện tại.'); return false; }
        let age = today.getFullYear() - dobValue.getFullYear();
        const md = today.getMonth() - dobValue.getMonth();
        const dd = today.getDate()  - dobValue.getDate();
        if (md < 0 || (md === 0 && dd < 0)) age--;
        if (age < 0 || age > 80) { toast.error('Tuổi không hợp lệ (0–80 tuổi).'); return false; }
        return true;
    }

    async function dangKyTiem(event) {
        event.preventDefault();
        if (missingInfo || !patientInfo) {
            toast.error('Thiếu thông tin người được tiêm. Vui lòng quay lại bước đăng ký.');
            return;
        }
        if (!window.confirm('Xác nhận đăng ký tiêm')) return;

        const paytype = event.target.elements.paytype.value;
        if (paytype !== 'paypal' && paytype !== 'vnpay') {
            toast.warning('Vui lòng chọn hình thức thanh toán!');
            return;
        }

        const payload = getPayload(event);

        /* Reserve slot trước khi mở payment */
        const reserveRes = await postMethodPayload('/api/customer-schedule/customer/reserve', payload);
        if (reserveRes.status >= 300) {
            try {
                const j = await reserveRes.json();
                toast.error(j.defaultMessage || 'Không giữ được slot');
            } catch { toast.error('Không giữ được slot'); }
            return;
        }
        const reserveData = await reserveRes.json();
        const csId = reserveData.customerScheduleId;
        const secs = reserveData.expiresInSeconds || (15 * 60);
        setReservationId(csId);
        setHoldSecondsLeft(secs);

        if (paytype === 'paypal') {
            setPendingPayload({ ...payload, customerScheduleId: csId });
            setShowPaypalModal(true);
        } else if (paytype === 'vnpay') {
            requestPayMentVnpay(event, csId, payload);
        }
    }

    async function requestPayMentVnpay(event, customerScheduleId, payload) {
        const urlmain    = window.location.origin;
        const returnurl  = urlmain + '/thong-bao';
        const paymentDto = { content: 'Thanh toán', returnUrl: returnurl, notifyUrl: returnurl, idScheduleTime: payload.vaccineScheduleTime.id };
        // Lưu cả reservation id để /thong-bao dùng khi callback
        localStorage.setItem('thongtindangky', JSON.stringify({ ...payload, customerScheduleId }));
        const res    = await postMethodPayload('/api/vnpay/urlpayment', paymentDto);
        const result = await res.json();
        if (res.status < 300)   window.open(result.url, '_blank');
        if (res.status === 417) toast.warning(result.defaultMessage);
    }

    /* ── PayPal handlers ─────────────────────────── */
    function handlePaypalCreateOrder(data, actions) {
        const price = vaccineTime?.vaccineSchedule?.vaccine?.price || 0;
        return actions.order.create({
            purchase_units: [{
                amount: {
                    value:         toUSD(price),
                    currency_code: 'USD',
                },
                description: vaccineTime?.vaccineSchedule?.vaccine?.name || 'Vaccine',
            }],
            application_context: { shipping_preference: 'NO_SHIPPING' },
        });
    }

    async function handlePaypalApprove(data, actions) {
        setPaypalProcessing(true);
        let stage = 'init';
        try {
            // Với intent='capture', PayPal đã auto-capture khi user approve.
            // KHÔNG được gọi actions.order.capture() lần nữa vì popup đã đóng
            // → sẽ throw "Window closed before response".
            // Dùng thẳng data.orderID, verify với PayPal API ở backend.
            const orderId = data?.orderID;
            console.log('[PayPal] order approved, orderId =', orderId);
            if (!orderId) throw new Error('Không lấy được orderID từ PayPal');

            stage = 'backend';
            const payload = {
                orderId:  orderId,
                payType:  'PAYPAL',
            };
            console.log('[PayPal] calling backend finish-payment-schedule with:', payload);
            const res = await postMethodPayload(
                `/api/customer-schedule/customer/finish-payment-schedule?id=${pendingPayload.customerScheduleId}`,
                payload
            );
            console.log('[PayPal] backend response status:', res.status);

            if (res.status < 300) {
                try { sessionStorage.removeItem('patientInfo_' + vaccineTime.id); } catch(e){}
                setShowPaypalModal(false);
                Swal.fire({
                    title: 'Thanh toán thành công! 🎉',
                    text:  'Đăng ký tiêm chủng thành công.',
                    icon:  'success',
                    preConfirm: () => { window.location.href = '/tai-khoan#lichtiem'; },
                });
            } else {
                let bodyText = '';
                try { bodyText = await res.text(); } catch (_) {}
                let msg = '';
                try { msg = JSON.parse(bodyText)?.defaultMessage || JSON.parse(bodyText)?.message || ''; } catch (_) { msg = bodyText; }
                console.error('[PayPal] backend error:', res.status, bodyText);
                toast.error(`Backend từ chối (${res.status}): ${msg || 'không rõ lý do'}`);
            }
        } catch (err) {
            console.error(`[PayPal] error at stage="${stage}":`, err);
            toast.error(`Lỗi PayPal (${stage}): ${err?.message || String(err)}`);
        } finally {
            setPaypalProcessing(false);
        }
    }

    const priceVND = vaccineTime?.vaccineSchedule?.vaccine?.price || 0;
    const priceUSD = toUSD(priceVND);

    return (
        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons', environment: 'sandbox' }}>
            <div style={{ background: BG_PAGE, minHeight: '80vh' }}>

                {/* ── Hero ── */}
                <div style={{
                    background: `linear-gradient(135deg, #0d1b3e 0%, ${PRIMARY} 55%, ${ACCENT} 100%)`,
                    padding: '40px 24px 56px', position:'relative', overflow:'hidden',
                }}>
                    <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
                    <div style={{ maxWidth:'1100px', margin:'0 auto', position:'relative', zIndex:1 }}>
                        <div style={{ marginBottom:'10px', fontSize:'13px', color:'rgba(255,255,255,0.65)' }}>
                            <a href="/" style={{ color:'rgba(255,255,255,0.65)', textDecoration:'none' }}>Trang chủ</a>
                            <span style={{ margin:'0 8px' }}>›</span>
                            <a href="/dang-ky-tiem-chung" style={{ color:'rgba(255,255,255,0.65)', textDecoration:'none' }}>Đăng ký tiêm</a>
                            <span style={{ margin:'0 8px' }}>›</span>
                            <span style={{ color:'#fff' }}>Xác nhận & Thanh toán</span>
                        </div>
                        <h1 style={{ color:'#fff', fontSize:'26px', fontWeight:'800', margin:'0 0 8px', letterSpacing:'-0.4px' }}>
                            💉 Xác nhận & Thanh toán
                        </h1>
                        <p style={{ color:'rgba(255,255,255,0.78)', fontSize:'14.5px', margin:0 }}>
                            Kiểm tra thông tin lần cuối và chọn phương thức thanh toán
                        </p>
                    </div>
                </div>

                {/* ── Main content ── */}
                <div style={{ maxWidth:'1100px', margin:'-30px auto 0', padding:'0 20px 60px', position:'relative', zIndex:2 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'22px', alignItems:'start' }}>

                        {/* ===== LEFT: Form ===== */}
                        {/* paddingTop để đẩy cột trái xuống dưới hero (vì container cha có margin-top -30px),
                            tránh banner sáng đè lên gradient xanh đậm của hero gây lệch thị giác */}
                        <div style={{ paddingTop: 40 }}>
                            {/* Banner pre-filled */}
                            <div style={{
                                marginBottom:'18px', padding:'12px 16px', borderRadius:'12px',
                                background: bookingForOther ? '#fffbeb' : 'rgba(14,165,233,0.08)',
                                border:`1px solid ${bookingForOther ? '#fde68a' : 'rgba(14,165,233,0.25)'}`,
                                color: bookingForOther ? '#92400e' : T,
                                fontSize:'13.5px',
                                display:'flex',
                                alignItems:'center',          // ← center icon ngang với text
                                gap:'12px',
                                boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
                                lineHeight: 1.55,
                            }}>
                                {/* Icon — bọc trong khung cố định để emoji không "nổi" lệch */}
                                <span style={{
                                    flexShrink: 0,
                                    width: 28, height: 28,
                                    display:'inline-flex',
                                    alignItems:'center',
                                    justifyContent:'center',
                                    fontSize:'20px',
                                    lineHeight: 1,
                                }}>
                                    {bookingForOther ? '👶' : '✓'}
                                </span>
                                {/* Text — flex:1 để chiếm hết phần còn lại, không bị bóp */}
                                <span style={{ flex: 1 }}>
                                    {bookingForOther
                                        ? <>Đăng ký <strong>cho người khác</strong>. Thông tin đã điền ở bước trước — vui lòng kiểm tra lại trước khi thanh toán.</>
                                        : <>Thông tin đã được điền sẵn từ hồ sơ của bạn. Bạn có thể sửa nếu cần.</>}
                                </span>
                            </div>

                            <form onSubmit={dangKyTiem}>
                                {/* Card 1: Thông tin người được tiêm — read-only (đã nhập ở booking step) */}
                                {missingInfo ? (
                                    <div style={{
                                        background:'#fff2f0', borderRadius:'16px', marginBottom:'18px',
                                        border:'1px solid #ffccc7', padding:'18px 22px',
                                        color:'#cf1322', fontSize:'14px', lineHeight:'1.6',
                                    }}>
                                        <div style={{ fontWeight:'700', marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                                            <span>🚫</span> Thiếu thông tin người được tiêm
                                        </div>
                                        <div style={{ marginBottom:'10px' }}>
                                            Có vẻ bạn đã truy cập trang này trực tiếp. Vui lòng quay lại bước đăng ký để nhập thông tin.
                                        </div>
                                        <a href="/dang-ky-tiem-chung" style={{
                                            display:'inline-block', padding:'8px 18px', borderRadius:'8px',
                                            background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                                            color:'#fff', textDecoration:'none', fontWeight:'700', fontSize:'13px',
                                        }}>← Về trang đăng ký</a>
                                    </div>
                                ) : (
                                    <div style={{
                                        background:'#fff', borderRadius:'16px', marginBottom:'18px',
                                        boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:`1px solid ${B}`,
                                        overflow:'hidden',
                                    }}>
                                        <div style={{
                                            display:'flex', alignItems:'center', justifyContent:'space-between',
                                            padding:'14px 22px', borderBottom:`1px solid ${B}`,
                                            background:`linear-gradient(90deg, rgba(42,56,143,0.04) 0%, transparent 100%)`,
                                        }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                                <span style={{ fontSize:'18px' }}>👤</span>
                                                <h3 style={{ margin:0, fontSize:'14px', fontWeight:'800', color:PRIMARY, letterSpacing:'0.3px', textTransform:'uppercase' }}>
                                                    Thông tin người được tiêm
                                                </h3>
                                            </div>
                                            <a href="/dang-ky-tiem-chung" style={{
                                                fontSize:'12px', color:ACCENT, textDecoration:'none', fontWeight:'600',
                                                padding:'4px 10px', borderRadius:'6px',
                                                border:`1px solid ${ACCENT}`,
                                            }}>✏️ Sửa</a>
                                        </div>
                                        <div style={{ padding:'18px 22px' }}>
                                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 22px' }}>
                                                <InfoField label="Họ tên" value={patientInfo?.fullName} />
                                                <InfoField label="Số CMND/CCCD" value={patientInfo?.idCard} />
                                                <InfoField label="Ngày sinh" value={patientInfo?.dob} />
                                                <InfoField label="Số điện thoại" value={patientInfo?.phone} />
                                                <InfoField label="Địa chỉ" value={patientInfo?.address} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Card 2: Phương thức thanh toán */}
                                <div style={{
                                    background:'#fff', borderRadius:'16px', marginBottom:'18px',
                                    boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:`1px solid ${B}`,
                                    overflow:'hidden',
                                }}>
                                    <div style={{
                                        display:'flex', alignItems:'center', gap:'10px',
                                        padding:'14px 22px', borderBottom:`1px solid ${B}`,
                                        background:`linear-gradient(90deg, rgba(42,56,143,0.04) 0%, transparent 100%)`,
                                    }}>
                                        <span style={{ fontSize:'18px' }}>💳</span>
                                        <h3 style={{ margin:0, fontSize:'14px', fontWeight:'800', color:PRIMARY, letterSpacing:'0.3px', textTransform:'uppercase' }}>
                                            Phương thức thanh toán
                                        </h3>
                                    </div>
                                    <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:'10px' }}>
                                        {/* PayPal card */}
                                        <PaymentMethodCard
                                            onClick={paypalClick}
                                            inputId="paytype-paypal" value="paypal"
                                            title="Thanh toán qua PayPal"
                                            subtitle={`Quy đổi ~$${priceUSD} USD`}
                                            icon={(
                                                <svg width="64" height="22" viewBox="0 0 100 32" xmlns="http://www.w3.org/2000/svg">
                                                    <text x="0" y="24" fontFamily="Arial" fontWeight="bold" fontSize="26" fill="#003087">Pay</text>
                                                    <text x="42" y="24" fontFamily="Arial" fontWeight="bold" fontSize="26" fill="#009cde">Pal</text>
                                                </svg>
                                            )}
                                        />
                                        {/* VNPay card */}
                                        <PaymentMethodCard
                                            onClick={vnpayClick}
                                            inputId="paytype-vnpay" value="vnpay"
                                            title="Thanh toán qua VNPay"
                                            icon={<img src={vnpay} alt="VNPay" style={{ height:'28px', objectFit:'contain' }} />}
                                        />
                                    </div>
                                    <div style={{
                                        padding:'10px 22px 16px', fontSize:'12px', color:T2,
                                        background:'#fafbfc', borderTop:`1px solid ${B}`,
                                    }}>
                                        💳 <strong>Lưu ý:</strong> Bạn cần thanh toán ngay khi đăng ký. Hệ thống không hỗ trợ thanh toán sau.
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    style={{
                                        width:'100%', padding:'14px 24px', borderRadius:'12px',
                                        background:`linear-gradient(135deg, ${SUCCESS} 0%, #059669 100%)`,
                                        color:'#fff', border:'none', fontWeight:'800', fontSize:'15px',
                                        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                                        boxShadow:'0 6px 18px rgba(16,185,129,0.35)',
                                        transition:'transform 0.18s, box-shadow 0.18s',
                                        letterSpacing:'0.3px',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 22px rgba(16,185,129,0.45)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 18px rgba(16,185,129,0.35)'; }}
                                >
                                    <span>✅</span> Xác nhận & Đặt lịch
                                </button>
                            </form>
                        </div>

                        {/* ===== RIGHT: Tóm tắt lịch tiêm ===== */}
                        <div style={{ position:'sticky', top:'20px' }}>
                            <div style={{
                                background:'#fff', borderRadius:'16px',
                                boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:`1px solid ${B}`,
                                overflow:'hidden',
                            }}>
                                <div style={{
                                    padding:'18px 22px',
                                    background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                                    color:'#fff',
                                }}>
                                    <div style={{ fontSize:'12px', opacity:0.85, fontWeight:'600', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'4px' }}>
                                        Tóm tắt lịch tiêm
                                    </div>
                                    <div style={{ fontSize:'18px', fontWeight:'800' }}>
                                        {vaccineTime?.vaccineSchedule?.vaccine?.name || '—'}
                                    </div>
                                </div>

                                <div style={{ padding:'18px 22px' }}>
                                    <SummaryRow icon="🏥" label="Trung tâm" value={vaccineTime?.vaccineSchedule?.center?.centerName || '—'} />
                                    <SummaryRow icon="📅" label="Ngày tiêm" value={vaccineTime?.injectDate || '—'} />
                                    <SummaryRow icon="⏰" label="Giờ tiêm" value={vaccineTime ? `${formatTimeHM(vaccineTime.start)} - ${formatTimeHM(vaccineTime.end)}` : '—'} />
                                    {vaccineTime?.vaccineSchedule?.vaccine?.ageGroup?.ageRange && (
                                        <SummaryRow icon="🎂" label="Nhóm tuổi" value={vaccineTime.vaccineSchedule.vaccine.ageGroup.ageRange} />
                                    )}

                                    <div style={{ margin:'16px 0', borderTop:`1px dashed ${B}` }} />

                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                                        <div>
                                            <div style={{ fontSize:'12px', color:T2, fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.4px' }}>
                                                Tổng thanh toán
                                            </div>
                                            <div style={{ fontSize:'24px', fontWeight:'800', color:PRIMARY, marginTop:'4px' }}>
                                                {formatMoney(priceVND)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize:'12.5px', color:T2, fontWeight:'600', textAlign:'right' }}>
                                            ≈ ${priceUSD}<br/><span style={{ fontSize:'11px' }}>USD (PayPal)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                marginTop:'14px', padding:'12px 16px', borderRadius:'12px',
                                background:'#fff', border:`1px solid ${B}`, fontSize:'12.5px', color:T2,
                                display:'flex', alignItems:'center', gap:'10px',
                            }}>
                                <span style={{ fontSize:'16px' }}>🔒</span>
                                <span>Thông tin thanh toán được bảo mật theo chuẩn PCI-DSS</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* ── PayPal Payment Modal ─────────────────── */}
            {showPaypalModal && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={e => { if (e.target === e.currentTarget && !paypalProcessing) setShowPaypalModal(false); }}
                >
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)' }} />
                    <div style={{
                        position: 'relative', zIndex: 1, background: '#fff', borderRadius: '18px',
                        width: '92%', maxWidth: '460px', padding: '28px 28px 20px',
                        boxShadow: '0 25px 60px rgba(0,0,0,.22)',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: T }}>Thanh toán qua PayPal</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: T2 }}>
                                    {vaccineTime?.vaccineSchedule?.vaccine?.name} — {formatMoney(priceVND)}
                                    <span style={{ marginLeft: '6px', color: '#003087', fontWeight: '600' }}>(${priceUSD} USD)</span>
                                </p>
                            </div>
                            {!paypalProcessing && (
                                <button
                                    onClick={() => setShowPaypalModal(false)}
                                    style={{ background: 'none', border: 'none', fontSize: '20px', color: T2, cursor: 'pointer', lineHeight: 1 }}
                                >×</button>
                            )}
                        </div>

                        {/* Countdown — slot đang giữ */}
                        {holdSecondsLeft > 0 && (
                            <div style={{
                                marginBottom: 14, padding: '8px 14px', borderRadius: 10,
                                background: holdSecondsLeft < 60 ? '#fee2e2' : holdSecondsLeft < 180 ? '#fef3c7' : '#eff6ff',
                                border: `1px solid ${holdSecondsLeft < 60 ? '#fecaca' : holdSecondsLeft < 180 ? '#fde68a' : '#dbeafe'}`,
                                color: holdSecondsLeft < 60 ? '#991b1b' : holdSecondsLeft < 180 ? '#92400e' : '#1e40af',
                                fontSize: 13, fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <span>⏱ Đang giữ slot</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800 }}>
                                    {fmtCountdown(holdSecondsLeft)}
                                </span>
                            </div>
                        )}

                        {/* PayPal Buttons */}
                        {paypalProcessing ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: T2 }}>
                                <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
                                <p style={{ margin: 0, fontWeight: '600' }}>Đang xử lý thanh toán...</p>
                            </div>
                        ) : (
                            <SafePayPalButtons
                                style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 44 }}
                                createOrder={handlePaypalCreateOrder}
                                onApprove={handlePaypalApprove}
                                onCancel={() => setShowPaypalModal(false)}
                                onError={(err) => {
                                    console.error('PayPal error:', err);
                                    toast.error('Lỗi kết nối PayPal. Vui lòng thử lại!');
                                }}
                            />
                        )}

                        <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: '12px', color: T2 }}>
                            🔒 Giao dịch được bảo mật bởi PayPal
                        </p>
                    </div>
                </div>
            )}
        </PayPalScriptProvider>
    );
}

export default XacNhanDangky;
