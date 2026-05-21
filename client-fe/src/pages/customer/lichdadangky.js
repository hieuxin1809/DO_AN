import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import { getMethod, postMethod, postMethodPayload } from '../../services/request';
import Swal from 'sweetalert2';
import StarRating from './star';
import vnpay from '../../assest/images/vnpay.jpg';
import { formatMoney } from '../../services/money';
import DoiLich from './doilich';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = 'AfQvtYaXkCSyaDdKT_f-sY3ZChQm2CXDMx94N0W3XBscBmLG3TgGIT4UzINwxjbFAOG6w19I29dWjMOk';

function toUSD(vnd) {
    return Math.max(parseFloat((vnd / 25000).toFixed(2)), 1.00).toFixed(2);
}

/* ── Date / time formatters ──────────────────── */
const pad2 = (n) => String(n).padStart(2, '0');

// "2026-05-21T22:49:46.123" hoặc Date → "21/05/2026 22:49"
function formatDateTime(input) {
    if (!input) return '—';
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return String(input);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "2026-05-21" hoặc Date → "21/05/2026"
function formatDate(input) {
    if (!input) return '—';
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) {
        // backend trả "2026-05-21" thuần → split & re-format
        const parts = String(input).split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return String(input);
    }
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// "09:00:00" → "09:00"
function formatTime(input) {
    if (!input) return '—';
    const parts = String(input).split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return String(input);
}

/* ── palette ──────────────────────────────────── */
const ACCENT  = '#0ea5e9';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';
const BORDER  = '#e2e8f0';
const BG_ROW  = '#f8fafc';
const PRIMARY = '#2A388F';

/* ── status badge config ─────────────────────── */
const STATUS_MAP = {
    pending:      { label: 'Chờ duyệt',  bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    confirmed:    { label: 'Đã duyệt',   bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
    cancelled:    { label: 'Đã hủy',     bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    injected:     { label: 'Đã tiêm',    bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
    finished:     { label: 'Hoàn thành', bg: '#e0e7ff', color: '#3730a3', dot: '#6366f1' },
    not_injected: { label: 'Chưa tiêm',  bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_MAP[status] || { label: status, bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: cfg.bg, color: cfg.color,
            padding: '4px 10px', borderRadius: '20px',
            fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
        }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }}/>
            {cfg.label}
        </span>
    );
}

function PayBadge({ paid }) {
    return paid
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>✓ Đã thanh toán</span>
        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>⏳ Chưa thanh toán</span>;
}

/* ── HealthStatusCell (unchanged logic) ────────── */
const MAX_CHARS = 80;
function HealthStatusCell({ item, onViewMore }) {
    const before = item.healthStatusBefore;
    const after  = item.healthStatusAfter;
    if (!before && !after) return <span style={{ color: '#bbb' }}>—</span>;
    const text = before || after;
    const isTruncated = text && text.length > MAX_CHARS;
    return (
        <div style={{ fontSize: 13 }}>
            {before && (
                <div>
                    <span style={{ fontWeight: 500, color: '#555' }}>Trước: </span>
                    {isTruncated && before === text ? <>{before.slice(0, MAX_CHARS)}... </> : before}
                </div>
            )}
            {after && (
                <div style={{ marginTop: before ? 4 : 0 }}>
                    <span style={{ fontWeight: 500, color: '#555' }}>Sau: </span>
                    {!before && isTruncated
                        ? <>{after.slice(0, MAX_CHARS)}... </>
                        : (before ? (after.length > MAX_CHARS ? <>{after.slice(0, MAX_CHARS)}... </> : after) : after)}
                </div>
            )}
            {(isTruncated || (before && after)) && (
                <button
                    className="btn btn-link p-0"
                    style={{ fontSize: 12 }}
                    onClick={() => onViewMore(item)}
                >
                    Xem thêm
                </button>
            )}
        </div>
    );
}

/* ── filter input style helper ───────────────── */
function FilterInput({ id, type = 'text', placeholder, label, style }) {
    return (
        <div style={style}>
            {label && <label style={{ display: 'block', fontSize: '12px', color: TEXT_2, fontWeight: '600', marginBottom: '5px' }}>{label}</label>}
            <input
                id={id}
                type={type}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '9px 13px', borderRadius: '9px',
                    border: `1.5px solid ${BORDER}`, background: '#fff',
                    fontSize: '13.5px', color: TEXT, outline: 'none', boxSizing: 'border-box',
                }}
            />
        </div>
    );
}

/* ── action button helper ────────────────────── */
function ActionBtn({ color, bg, border, onClick, children }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '5px 13px', borderRadius: '8px', fontSize: '12px',
                fontWeight: '600', border: `1.5px solid ${hov ? color : (border || color)}`,
                background: hov ? color : (bg || 'transparent'),
                color: hov ? '#fff' : color,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
        >
            {children}
        </button>
    );
}

/* ── Bootstrap-kept modal action button (for modals still using data-bs-*) ── */
function ActionBtnBs({ color, bg, border, onClick, 'data-bs-toggle': toggle, 'data-bs-target': target, children }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            data-bs-toggle={toggle}
            data-bs-target={target}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '5px 13px', borderRadius: '8px', fontSize: '12px',
                fontWeight: '600', border: `1.5px solid ${hov ? color : (border || color)}`,
                background: hov ? color : (bg || 'transparent'),
                color: hov ? '#fff' : color,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
        >
            {children}
        </button>
    );
}

/* ─── SafePayPalButtons wrapper (xem giải thích ở xacnhandangky.js) ── */
function SafePayPalButtons(props) {
    const [{ isResolved, isRejected, isPending }] = usePayPalScriptReducer();
    const [windowReady, setWindowReady] = useState(false);

    useEffect(() => {
        if (!isResolved) { setWindowReady(false); return; }
        let cancelled = false;
        let attempts  = 0;
        const tick = () => {
            if (cancelled) return;
            if (typeof window !== 'undefined' && window.paypal && typeof window.paypal.Buttons === 'function') {
                setWindowReady(true);
                return;
            }
            attempts++;
            if (attempts > 50) return;
            setTimeout(tick, 100);
        };
        tick();
        return () => { cancelled = true; };
    }, [isResolved]);

    if (isRejected) {
        return (
            <div style={{ textAlign: 'center', padding: '24px', color: '#ef4444' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
                <p style={{ margin: 0, fontWeight: '600' }}>Không tải được PayPal SDK.</p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: TEXT_2 }}>
                    Vui lòng tải lại trang (Ctrl + Shift + R) và thử lại.
                </p>
            </div>
        );
    }
    if (isPending || !isResolved || !windowReady) {
        return (
            <div style={{ textAlign: 'center', padding: '32px', color: TEXT_2 }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <p style={{ margin: 0, fontSize: '13.5px' }}>Đang tải PayPal...</p>
            </div>
        );
    }
    return <PayPalButtons {...props} />;
}

/* ══════════════════════════════════════════════ */
var size = 3;
var url  = '';

function LichDaDangKy() {
    const [customerSchedule, setCustomerSchedule] = useState([]);
    const [schedule,         setSchedule]         = useState(null);
    const [rating,           setRating]           = useState(1);
    const [doctors,          setDoctors]          = useState([]);
    const [nurses,           setNurses]           = useState([]);
    const [pageCount,        setpageCount]        = useState(0);
    const [currentPage,      setCurrentPage]      = useState(0);
    const [item,             setItem]             = useState(null);
    const [healthItem,       setHealthItem]       = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paypalProcessing, setPaypalProcessing] = useState(false);

    useEffect(() => {
        const getItem = async () => {
            var response = await getMethod('/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&page=' + 0);
            var result   = await response.json();
            setCustomerSchedule(result.content);
            setpageCount(result.totalPages);
            url = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&page=';
        };
        getItem();

        const getDoctor = async () => {
            var response = await getMethod('/api/doctor/public/find-all');
            setDoctors(await response.json());
        };
        getDoctor();

        const getNurse = async () => {
            var response = await getMethod('/api/nurse/public/find-all');
            setNurses(await response.json());
        };
        getNurse();
    }, []);

    /* ── reload schedule list ────────────────── */
    const reloadSchedule = async () => {
        var response = await getMethod('/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&page=0');
        var result   = await response.json();
        setCustomerSchedule(result.content);
        setpageCount(result.totalPages);
        url = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&page=';
    };

    /* ── unchanged handler functions ─────────── */
    async function huyTiem(id) {
        var con = window.confirm('Xác nhận hủy tiêm?');
        if (con === false) return;
        var res = await postMethod('/api/customer-schedule/customer/cancel?id=' + id);
        if (res.status < 300) {
            toast.success('Đã hủy lịch tiêm thành công!');
            await reloadSchedule();
        } else {
            if (res.status === 417) {
                var result = await res.json();
                toast.error(result.defaultMessage);
            } else {
                toast.error('Hủy lịch tiêm thất bại');
            }
        }
    }

    const handleRatingSelect = (ratingValue) => setRating(ratingValue);

    async function taoPhanHoi(event) {
        event.preventDefault();
        var phanhoi = {
            content:          event.target.elements.noidungph.value,
            rating,
            customerSchedule: { id: schedule.id },
            doctor:           { id: event.target.elements.doctor.value },
            nurse:            { id: event.target.elements.yta.value },
        };
        if (event.target.elements.doctor.value === '') phanhoi.doctor = null;
        if (event.target.elements.yta.value    === '') phanhoi.nurse  = null;
        var res = await postMethodPayload('/api/feedback/customer/create', phanhoi);
        if (res.status < 300) toast.success('Đã gửi phản hồi thành công');
        else                   toast.error('Hành động thất bại');
    }

    const handlePageClick = async (data) => {
        var cp       = data.selected;
        var response = await getMethod(url + cp);
        var result   = await response.json();
        setCustomerSchedule(result.content);
        setpageCount(result.totalPages);
        setCurrentPage(cp);
    };

    async function filterLichDangKy() {
        var search = document.getElementById('search').value;
        var from   = document.getElementById('from').value;
        var to     = document.getElementById('to').value;
        var curUrl = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc';
        if (search !== '') curUrl += '&search=' + search;
        if (from   !== '') curUrl += '&from='   + from;
        if (to     !== '') curUrl += '&to='     + to;
        curUrl += '&page=';
        url = curUrl;
        var response = await getMethod(curUrl + 0);
        var result   = await response.json();
        setCustomerSchedule(result.content);
        setpageCount(result.totalPages);
    }

    async function loadDuLieu() {
        url = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&page=';
        var response = await getMethod(url + 0);
        var result   = await response.json();
        setCustomerSchedule(result.content);
        setpageCount(result.totalPages);
        document.getElementById('search').value = '';
        document.getElementById('from').value   = '';
        document.getElementById('to').value     = '';
    }

    /* ── VNPay payment ───────────────────────── */
    async function requestVNPay() {
        const urlmain  = window.location.origin;
        var returnurl  = urlmain + '/thanh-cong';
        var paymentDto = {
            content:        'Thanh toán',
            returnUrl:      returnurl,
            notifyUrl:      returnurl,
            idScheduleTime: item.vaccineScheduleTime.id,
        };
        localStorage.setItem('customerschedule', item.id);
        const res    = await postMethodPayload('/api/vnpay/urlpayment', paymentDto);
        var result   = await res.json();
        if (res.status < 300)   window.open(result.url, '_blank');
        if (res.status === 417) toast.warning(result.defaultMessage);
    }

    /* ── PayPal handlers ─────────────────────── */
    function handlePaypalCreateOrder(data, actions) {
        const price       = item?.vaccineScheduleTime?.vaccineSchedule?.vaccine?.price ?? 0;
        const priceUSD    = toUSD(price);
        const vaccineName = item?.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name ?? 'Vaccine';
        return actions.order.create({
            purchase_units: [{
                amount: { value: priceUSD, currency_code: 'USD' },
                description: vaccineName,
            }],
            application_context: { shipping_preference: 'NO_SHIPPING' },
        });
    }

    async function handlePaypalApprove(data, actions) {
        setPaypalProcessing(true);
        let stage = 'init';
        try {
            // Với intent='capture', PayPal đã auto-capture khi user approve.
            // KHÔNG gọi actions.order.capture() vì popup đã đóng.
            const orderId = data?.orderID;
            console.log('[PayPal] order approved, orderId =', orderId);
            if (!orderId) throw new Error('Không lấy được orderID từ PayPal');

            stage = 'backend';
            const payload = { payType: 'PAYPAL', orderId: orderId };
            console.log('[PayPal] calling backend finish-payment-schedule with:', payload);
            const res = await postMethodPayload(
                `/api/customer-schedule/customer/finish-payment-schedule?id=${item.id}`,
                payload
            );
            console.log('[PayPal] backend response status:', res.status);

            if (res.status < 300) {
                setShowPaymentModal(false);
                await Swal.fire({
                    icon: 'success',
                    title: 'Thanh toán thành công!',
                    text: 'Lịch tiêm của bạn đã được xác nhận.',
                    confirmButtonColor: PRIMARY,
                });
                await reloadSchedule();
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

    /* ── render ───────────────────────────────── */
    return (
        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons', environment: 'sandbox' }}>
            {/* ── Filter bar ────────────────────────── */}
            <div style={{
                background: BG_ROW, borderRadius: '12px',
                border: `1px solid ${BORDER}`, padding: '16px 20px',
                marginBottom: '20px', display: 'flex', gap: '12px',
                flexWrap: 'wrap', alignItems: 'flex-end',
            }}>
                <FilterInput id="search" placeholder="Tìm tên vaccine..." label="Tìm kiếm" style={{ flex: '1 1 160px', minWidth: '140px' }} />
                <FilterInput id="from" type="date" label="Từ ngày" style={{ flex: '0 0 155px' }} />
                <FilterInput id="to"   type="date" label="Đến ngày" style={{ flex: '0 0 155px' }} />
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '0' }}>
                    <button
                        onClick={filterLichDangKy}
                        style={{
                            padding: '9px 22px', borderRadius: '9px',
                            background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                            color: '#fff', border: 'none', fontWeight: '700',
                            fontSize: '13px', cursor: 'pointer',
                        }}
                    >
                        🔍 Lọc
                    </button>
                    <button
                        onClick={loadDuLieu}
                        title="Làm mới"
                        style={{
                            padding: '9px 14px', borderRadius: '9px',
                            background: '#fff', border: `1.5px solid ${BORDER}`,
                            color: TEXT_2, fontSize: '15px', cursor: 'pointer',
                        }}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* ── Table ─────────────────────────────── */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${BORDER}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', color: TEXT }}>
                    <thead>
                        <tr style={{ background: `linear-gradient(90deg, ${PRIMARY} 0%, #1e4fad 100%)`, color: '#fff' }}>
                            {['Mã ĐK', 'Vaccine', 'Trung tâm', 'Ngày đăng ký', 'Ngày tiêm', 'Thanh toán', 'Trạng thái', 'Tình trạng SK', 'Chức năng', 'Phản hồi', 'Hủy lịch'].map((h, i) => (
                                <th key={i} style={{ padding: '12px 14px', fontWeight: '700', whiteSpace: 'nowrap', textAlign: 'left', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {customerSchedule.map((item, index) => {
                            const currentDate = new Date();
                            const targetDate  = new Date(item.vaccineScheduleTime.injectDate);
                            const checked     = currentDate.getTime() >= targetDate.getTime();

                            return (
                                <tr
                                    key={item.id}
                                    style={{
                                        background: index % 2 === 0 ? '#fff' : BG_ROW,
                                        borderBottom: `1px solid ${BORDER}`,
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? '#fff' : BG_ROW}
                                >
                                    <td style={{ padding: '12px 14px', fontWeight: '700', color: PRIMARY }}>
                                        #{item.id}
                                    </td>
                                    <td style={{ padding: '12px 14px', maxWidth: '160px' }}>
                                        <div style={{ fontWeight: '600', lineHeight: '1.4' }}>
                                            {item.vaccineScheduleTime.vaccineSchedule.vaccine.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', color: TEXT_2, fontSize: '13px' }}>
                                        {item.vaccineScheduleTime.vaccineSchedule.center.centerName}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: TEXT_2, whiteSpace: 'nowrap', fontSize: '13px' }}>
                                        {formatDateTime(item.createdDate)}
                                    </td>
                                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                        <div style={{ fontWeight: '600', color: TEXT }}>
                                            {formatTime(item.vaccineScheduleTime.start)} – {formatTime(item.vaccineScheduleTime.end)}
                                        </div>
                                        <div style={{ color: TEXT_2, fontSize: '12px', marginTop: '2px' }}>
                                            📅 {formatDate(item.vaccineScheduleTime.injectDate)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <PayBadge paid={item.customerSchedulePay !== 'CHUA_THANH_TOAN'} />
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <StatusBadge status={item.statusCustomerSchedule} />
                                    </td>
                                    <td style={{ padding: '12px 14px', minWidth: '150px', maxWidth: '210px' }}>
                                        <HealthStatusCell item={item} onViewMore={setHealthItem} />
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {item.customerSchedulePay === 'CHUA_THANH_TOAN' ? (
                                            <ActionBtn
                                                color="#0ea5e9"
                                                onClick={() => { setItem(item); setShowPaymentModal(true); }}
                                            >
                                                💳 Thanh toán
                                            </ActionBtn>
                                        ) : item.statusCustomerSchedule === 'confirmed' && !checked ? (
                                            <ActionBtnBs
                                                color="#6366f1"
                                                onClick={() => setItem(item)}
                                                data-bs-toggle="modal"
                                                data-bs-target="#modeldoilich"
                                            >
                                                🔄 Đổi lịch
                                            </ActionBtnBs>
                                        ) : null}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {item.statusCustomerSchedule === 'injected' && (
                                            <ActionBtnBs
                                                color="#10b981"
                                                onClick={() => setSchedule(item)}
                                                data-bs-toggle="modal"
                                                data-bs-target="#exampleModal"
                                            >
                                                💬 Gửi
                                            </ActionBtnBs>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {item.statusCustomerSchedule !== 'cancelled' &&
                                         item.statusCustomerSchedule !== 'finished' &&
                                         item.statusCustomerSchedule !== 'injected' &&
                                         item.statusCustomerSchedule !== 'not_injected' &&
                                         !checked && (
                                            <ActionBtn
                                                color="#ef4444"
                                                onClick={() => huyTiem(item.id)}
                                            >
                                                🗑 Hủy
                                            </ActionBtn>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {customerSchedule.length === 0 && (
                            <tr>
                                <td colSpan={11} style={{ padding: '48px', textAlign: 'center', color: TEXT_2 }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                                    Chưa có lịch tiêm nào
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ────────────────────────── */}
            <div style={{ marginTop: '20px' }}>
                <ReactPaginate
                    marginPagesDisplayed={2}
                    pageCount={pageCount}
                    onPageChange={handlePageClick}
                    containerClassName={'pagination'}
                    pageClassName={'page-item'}
                    pageLinkClassName={'page-link'}
                    previousClassName="page-item"
                    previousLinkClassName="page-link"
                    nextClassName="page-item"
                    nextLinkClassName="page-link"
                    breakClassName="page-item"
                    breakLinkClassName="page-link"
                    previousLabel="Trang trước"
                    nextLabel="Trang sau"
                    activeClassName="active"
                />
            </div>

            {/* ══ Modals ═══════════════════════════════ */}

            {/* ── Modal thanh toán (React state) ─────── */}
            {showPaymentModal && item && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999,
                    }}
                    onClick={() => { if (!paypalProcessing) setShowPaymentModal(false); }}
                >
                    <div
                        style={{
                            background: '#fff', borderRadius: '16px',
                            padding: '28px 32px', width: '440px', maxWidth: '95vw',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            position: 'relative',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h5 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: TEXT }}>Thanh toán</h5>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: PRIMARY, marginTop: '4px' }}>
                                    {formatMoney(item.vaccineScheduleTime.vaccineSchedule.vaccine.price)}
                                </div>
                                <div style={{ fontSize: '12.5px', color: TEXT_2, marginTop: '2px' }}>
                                    ≈ ${toUSD(item.vaccineScheduleTime.vaccineSchedule.vaccine.price)} USD
                                </div>
                            </div>
                            {!paypalProcessing && (
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    style={{
                                        background: '#f1f5f9', border: 'none', borderRadius: '8px',
                                        width: '32px', height: '32px', cursor: 'pointer',
                                        fontSize: '16px', color: TEXT_2,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* divider */}
                        <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '20px' }} />

                        {/* PayPal */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: TEXT_2, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Thanh toán qua PayPal
                            </div>
                            <SafePayPalButtons
                                style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 40 }}
                                createOrder={handlePaypalCreateOrder}
                                onApprove={handlePaypalApprove}
                                onCancel={() => toast.info('Đã hủy thanh toán PayPal.')}
                                onError={(err) => { console.error('PayPal error:', err); toast.error('Có lỗi xảy ra với PayPal.'); }}
                                disabled={paypalProcessing}
                            />
                        </div>

                        {/* divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ flex: 1, height: '1px', background: BORDER }} />
                            <span style={{ fontSize: '12px', color: TEXT_2, fontWeight: '600' }}>HOẶC</span>
                            <div style={{ flex: 1, height: '1px', background: BORDER }} />
                        </div>

                        {/* VNPay */}
                        <button
                            onClick={requestVNPay}
                            disabled={paypalProcessing}
                            style={{
                                width: '100%', padding: '10px 16px', borderRadius: '10px',
                                border: `1.5px solid ${BORDER}`, background: '#fff',
                                cursor: paypalProcessing ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'border-color 0.15s',
                                opacity: paypalProcessing ? 0.6 : 1,
                            }}
                            onMouseEnter={e => { if (!paypalProcessing) e.currentTarget.style.borderColor = ACCENT; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
                        >
                            <span style={{ fontWeight: '600', fontSize: '13.5px', color: TEXT }}>Thanh toán qua VNPay</span>
                            <img src={vnpay} alt="VNPay" style={{ height: '28px', objectFit: 'contain' }} />
                        </button>

                        {paypalProcessing && (
                            <div style={{ textAlign: 'center', marginTop: '16px', color: TEXT_2, fontSize: '13px' }}>
                                Đang xử lý thanh toán...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal gửi phản hồi */}
            <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="exampleModalLabel">Gửi phản hồi</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={taoPhanHoi} method="post">
                                <label className="lb-form-dky-tiem"><span>*</span> Đánh giá sao</label>
                                <StarRating onRatingSelect={handleRatingSelect} />
                                <label className="lb-form-dky-tiem"><span>*</span> Nội dung phản hồi</label>
                                <textarea name="noidungph" className="form-control" />
                                <label className="lb-form-dky-tiem">Bác sĩ</label>
                                <Select
                                    options={doctors.map(d => ({ label: d.fullName + ', ' + d.specialization, value: d.id }))}
                                    placeholder="Chọn bác sĩ tiêm"
                                    name="doctor"
                                    isSearchable
                                />
                                <label className="lb-form-dky-tiem">Y tá</label>
                                <Select
                                    options={nurses.map(n => ({ label: n.fullName + ', ' + n.qualification, value: n.id }))}
                                    placeholder="Chọn y tá"
                                    name="yta"
                                    isSearchable
                                />
                                <br /><br />
                                <button className="btn btn-primary form-control">Gửi phản hồi</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal tình trạng sức khỏe đầy đủ */}
            {healthItem && (
                <div
                    className="modal fade show"
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.4)' }}
                    tabIndex="-1"
                    onClick={() => setHealthItem(null)}
                >
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Tình trạng sức khỏe — Mã đăng ký #{healthItem.id}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setHealthItem(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontWeight: 600, marginBottom: 6, color: '#1890ff' }}>Tình trạng trước tiêm</p>
                                    <div style={{ background: '#f6f6f6', borderRadius: 6, padding: '10px 14px', minHeight: 48, color: healthItem.healthStatusBefore ? '#333' : '#aaa', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                        {healthItem.healthStatusBefore || 'Chưa có thông tin'}
                                    </div>
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, marginBottom: 6, color: '#52c41a' }}>Tình trạng sau tiêm</p>
                                    <div style={{ background: '#f6f6f6', borderRadius: 6, padding: '10px 14px', minHeight: 48, color: healthItem.healthStatusAfter ? '#333' : '#aaa', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                        {healthItem.healthStatusAfter || 'Chưa có thông tin'}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setHealthItem(null)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DoiLich customerSchedule={item} />
        </PayPalScriptProvider>
    );
}

export default LichDaDangKy;
