import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import { getMethod, postMethod, postMethodPayload } from '../../services/request';
import StarRating from './star';
import DoiLich from './doilich';
import { downloadCertificatePdf } from '../../services/certificatePdf';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = "AfQvtYaXkCSyaDdKT_f-sY3ZChQm2CXDMx94N0W3XBscBmLG3TgGIT4UzINwxjbFAOG6w19I29dWjMOk";

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
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const WARNING = '#f59e0b';

/* ── status badge config ─────────────────────── */
const STATUS_MAP = {
    pending:      { label: 'Chờ duyệt',  bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    pending_payment: { label: 'Đang giữ chỗ', bg: '#ffedd5', color: '#9a3412', dot: '#f97316' },
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

function PayBadge({ status }) {
    if (status === 'DA_THANH_TOAN') {
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>✓ Đã thanh toán</span>;
    }
    if (status === 'REFUND_PENDING') {
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>🔄 Chờ hoàn tiền</span>;
    }
    if (status === 'REFUNDED') {
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4b5563', background: '#e5e7eb', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>💸 Đã hoàn tiền</span>;
    }
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>⏳ Chưa thanh toán</span>;
}

/* ── HealthStatusCell — parse JSON screening data sạch sẽ ────────── */
const SCREENING_LABELS = {
    hasFever:                 'Sốt',
    hasAllergy:               'Dị ứng vaccine/thuốc',
    isPregnant:               'Mang thai',
    isOnImmunosuppressant:    'Đang dùng thuốc ức chế MD',
    hasSevereChronicCondition:'Bệnh nền nghiêm trọng',
    hadReactionLastDose:      'Phản ứng mũi trước',
    hasInfectionLast14Days:   'Nhiễm trùng 14 ngày qua',
};

const SYMPTOM_LABELS = {
    painAtSite:           'Đau, sưng tại chỗ tiêm',
    redness:              'Đỏ tại chỗ tiêm',
    mildFever:            'Sốt nhẹ (<38.5°C)',
    highFever:            'Sốt cao (≥38.5°C)',
    fatigue:              'Mệt mỏi, đau cơ',
    rash:                 'Phát ban',
    difficultyBreathing:  'Khó thở',
    severeReaction:       'Phản ứng nặng',
};

function parseScreening(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    if (!trimmed.startsWith('{')) return { isText: true, text: trimmed };
    try {
        const obj = JSON.parse(trimmed);
        return { isText: false, data: obj };
    } catch { return { isText: true, text: trimmed }; }
}

function HealthStatusCell({ item, onViewMore }) {
    const before = item.healthStatusBefore;
    const after  = item.healthStatusAfter;
    if (!before && !after) return <span style={{ color: '#bbb' }}>—</span>;

    const beforeParsed = parseScreening(before);
    const afterParsed  = parseScreening(after);

    /* Hiển thị tóm tắt cho screening JSON */
    const renderSummary = (parsed) => {
        if (!parsed) return null;
        if (parsed.isText) {
            const t = parsed.text;
            return t.length > 60 ? t.slice(0, 60) + '…' : t;
        }
        const d = parsed.data || {};
        // Phân biệt format: nếu có `symptoms` thì là follow-up sau tiêm
        const isFollowup = d.symptoms && typeof d.symptoms === 'object';
        if (isFollowup) {
            const dangers = Object.keys(SYMPTOM_LABELS).filter(k => d.symptoms[k] === true);
            if (dangers.length === 0) {
                return (
                    <span style={{ color: SUCCESS }}>
                        ✓ Ổn định, không triệu chứng
                        {d.observedTemperature && <span style={{ color: TEXT_2 }}> · {d.observedTemperature}°C</span>}
                    </span>
                );
            }
            return (
                <span style={{ color: '#b45309' }}>
                    ⚠ {dangers.length} triệu chứng
                </span>
            );
        }
        const dangers = Object.keys(SCREENING_LABELS).filter(k => d[k] === true);
        if (dangers.length === 0) {
            return (
                <span style={{ color: SUCCESS }}>
                    ✓ Đủ điều kiện tiêm
                    {d.temperature && <span style={{ color: TEXT_2 }}> · {d.temperature}°C</span>}
                </span>
            );
        }
        return (
            <span style={{ color: '#b45309' }}>
                ⚠ {dangers.length} cảnh báo
            </span>
        );
    };

    return (
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {before && (
                <div>
                    <span style={{ fontWeight: 600, color: TEXT_2, fontSize: 11.5 }}>TRƯỚC: </span>
                    {renderSummary(beforeParsed)}
                </div>
            )}
            {after && (
                <div style={{ marginTop: before ? 4 : 0 }}>
                    <span style={{ fontWeight: 600, color: TEXT_2, fontSize: 11.5 }}>SAU: </span>
                    {renderSummary(afterParsed)}
                </div>
            )}
            <button
                onClick={() => onViewMore(item)}
                style={{
                    marginTop: 4, background: 'none', border: 'none',
                    color: ACCENT, fontSize: 11.5, cursor: 'pointer',
                    padding: 0, textDecoration: 'underline',
                }}
            >
                Xem chi tiết
            </button>
        </div>
    );
}

/* ── ScreeningDetail — render chi tiết JSON sàng lọc trong modal ── */
function ScreeningDetail({ text }) {
    if (!text) {
        return (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px',
                color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                Chưa có thông tin
            </div>
        );
    }
    const parsed = parseScreening(text);
    if (parsed.isText) {
        return (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px',
                color: '#334155', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {parsed.text}
            </div>
        );
    }
    const d = parsed.data || {};
    const isFollowup = d.symptoms && typeof d.symptoms === 'object';

    // ─── Follow-up sau tiêm ───
    if (isFollowup) {
        const symptoms = d.symptoms || {};
        const temp = d.observedTemperature;
        const minutes = d.observationMinutes;
        const note = d.note;
        const observedAt = d.observedAt;
        const hasDanger = Object.keys(SYMPTOM_LABELS).some(k => symptoms[k] === true);
        return (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, color: '#0f172a' }}>
                    {temp != null && (
                        <div>
                            <strong>🌡️ Nhiệt độ:</strong> {temp}°C
                            {Number(temp) >= 38.5 && <span style={{ color: DANGER, marginLeft: 6 }}>(sốt cao)</span>}
                            {Number(temp) >= 37.5 && Number(temp) < 38.5 && <span style={{ color: WARNING, marginLeft: 6 }}>(hơi cao)</span>}
                        </div>
                    )}
                    {minutes != null && (
                        <div>
                            <strong>⏱ Thời gian theo dõi:</strong> {minutes} phút
                        </div>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                    {Object.keys(SYMPTOM_LABELS).map(k => {
                        const v = symptoms[k];
                        if (v === undefined || v === null) return null;
                        return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6,
                                color: v ? '#dc2626' : '#16a34a', fontSize: 12.5 }}>
                                <span style={{ fontSize: 14 }}>{v ? '✗' : '✓'}</span>
                                <span>{SYMPTOM_LABELS[k]}: <strong>{v ? 'Có' : 'Không'}</strong></span>
                            </div>
                        );
                    })}
                </div>
                {!hasDanger && (
                    <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6,
                        background: 'rgba(16,185,129,.08)', color: '#065f46', fontSize: 12.5 }}>
                        ✅ Bệnh nhân ổn định, không có triệu chứng bất thường.
                    </div>
                )}
                {hasDanger && (
                    <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6,
                        background: 'rgba(239,68,68,.08)', color: '#991b1b', fontSize: 12.5 }}>
                        ⚠️ Có dấu hiệu cần lưu ý — vui lòng theo dõi tiếp tại nhà.
                    </div>
                )}
                {note && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                        <strong style={{ color: '#475569' }}>📝 Ghi chú:</strong> {note}
                    </div>
                )}
                {observedAt && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                        Ghi nhận lúc: {new Date(observedAt).toLocaleString('vi-VN')}
                    </div>
                )}
            </div>
        );
    }

    // ─── Sàng lọc trước tiêm ───
    const note = d.note;
    const temp = d.temperature;
    const screenedAt = d.screenedAt;
    return (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px', fontSize: 13 }}>
            {temp != null && (
                <div style={{ marginBottom: 10, color: '#0f172a' }}>
                    <strong>🌡️ Nhiệt độ:</strong> {temp}°C
                    {Number(temp) > 37.5 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>(cao)</span>}
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                {Object.keys(SCREENING_LABELS).map(k => {
                    const v = d[k];
                    if (v === undefined || v === null) return null;
                    return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6,
                            color: v ? '#dc2626' : '#16a34a', fontSize: 12.5 }}>
                            <span style={{ fontSize: 14 }}>{v ? '✗' : '✓'}</span>
                            <span>{SCREENING_LABELS[k]}: <strong>{v ? 'Có' : 'Không'}</strong></span>
                        </div>
                    );
                })}
            </div>
            {note && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                    <strong style={{ color: '#475569' }}>📝 Ghi chú:</strong> {note}
                </div>
            )}
            {screenedAt && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                    Ghi nhận lúc: {new Date(screenedAt).toLocaleString('vi-VN')}
                </div>
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
function ActionBtn({ color, bg, border, onClick, children, disabled }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            onMouseEnter={() => !disabled && setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '5px 13px', borderRadius: '8px', fontSize: '12px',
                fontWeight: '600', border: `1.5px solid ${hov ? color : (border || color)}`,
                background: hov ? color : (bg || 'transparent'),
                color: hov ? '#fff' : color,
                cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                opacity: disabled ? 0.6 : 1,
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

/* ── helper to check if customer is allowed to pay online ── */
function canPayOnline(item) {
    if (item.statusCustomerSchedule !== 'pending_payment') return false;
    if (!item.createdDate) return false;
    const createdTime = new Date(item.createdDate).getTime();
    const nowTime = new Date().getTime();
    const diffMinutes = (nowTime - createdTime) / (1000 * 60);
    return diffMinutes < 30; // 30 phút giữ chỗ
}

/* ── helper to check if customer is allowed to reschedule ── */
function canReschedule(item) {
    if (item.statusCustomerSchedule !== 'confirmed' && item.statusCustomerSchedule !== 'pending' && item.statusCustomerSchedule !== 'not_injected') {
        return false;
    }
    if (!item.vaccineScheduleTime || !item.vaccineScheduleTime.injectDate) return false;

    const now = new Date();
    const injectDateStr = item.vaccineScheduleTime.injectDate;
    const startStr = item.vaccineScheduleTime.start || "00:00:00";
    const endStr = item.vaccineScheduleTime.end || "23:59:59";

    const startAt = new Date(`${injectDateStr}T${startStr}`);
    const endAt = new Date(`${injectDateStr}T${endStr}`);

    if (now < startAt) {
        // Tương lai: phải trước giờ tiêm ít nhất 24h
        const diffHours = (startAt - now) / (1000 * 60 * 60);
        return diffHours >= 24;
    } else {
        // Quá khứ: trong vòng 24h từ lúc kết thúc ca
        const diffHours = (now - endAt) / (1000 * 60 * 60);
        return diffHours <= 24;
    }
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
    const [refundItem,       setRefundItem]       = useState(null);
    const [bookingForOtherFilter, setBookingForOtherFilter] = useState(false);
    const [paymentItem,      setPaymentItem]      = useState(null);
    const [showPayModal,     setShowPayModal]     = useState(false);
    const [paypalProcessing, setPaypalProcessing] = useState(false);

    function openPaymentModal(item) {
        setPaymentItem(item);
        setShowPayModal(true);
    }

    function convertVndToUsd(vnd) {
        if (!vnd) return '0.00';
        return (vnd / 23500).toFixed(2);
    }

    async function requestPayMentVnpay(item) {
        const urlmain    = window.location.origin;
        const returnurl  = urlmain + '/thong-bao';
        const paymentDto = { 
            content: 'Thanh toán', 
            returnUrl: returnurl, 
            notifyUrl: returnurl, 
            idScheduleTime: item.vaccineScheduleTime.id,
            customerScheduleId: item.id
        };
        localStorage.setItem('thongtindangky', JSON.stringify({
            fullName: item.fullName,
            dob: item.dob,
            phone: item.phone,
            idCard: item.idCard,
            address: item.address,
            note: item.note,
            bookingForOther: item.bookingForOther,
            vaccineScheduleTime: item.vaccineScheduleTime,
            customerScheduleId: item.id
        }));
        const res    = await postMethodPayload('/api/vnpay/urlpayment', paymentDto);
        const result = await res.json();
        if (res.status < 300) {
            window.open(result.url, '_blank');
            setShowPayModal(false);
            toast.info("Đã mở trang thanh toán VNPay! Vui lòng hoàn tất giao dịch.");
        } else if (res.status === 417) {
            toast.warning(result.defaultMessage);
        } else {
            toast.error("Không tạo được link thanh toán VNPay");
        }
    }
    // (removed showPaymentModal/paypalProcessing — pay-later đã bị bỏ)

    /* ── State + handler cho modal Lịch sử đổi lịch ── */
    const [historyItem, setHistoryItem] = useState(null);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    async function openHistory(it) {
        setHistoryItem(it);
        setHistoryList([]);
        setHistoryLoading(true);
        try {
            const res = await getMethod(`/api/customer-schedule/customer/change-history/${it.id}`);
            if (res.status < 300) {
                setHistoryList(await res.json());
            } else {
                toast.error('Không tải được lịch sử');
            }
        } catch (e) {
            toast.error('Lỗi kết nối');
        } finally {
            setHistoryLoading(false);
        }
    }

    useEffect(() => {
        const getItem = async () => {
            var response = await getMethod('/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&bookingForOther=' + bookingForOtherFilter + '&page=' + 0);
            var result   = await response.json();
            setCustomerSchedule(result.content);
            setpageCount(result.totalPages);
            url = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&bookingForOther=' + bookingForOtherFilter + '&page=';
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
    }, [bookingForOtherFilter]);

    /* ── reload schedule list ────────────────── */
    const reloadSchedule = async () => {
        var response = await getMethod('/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&bookingForOther=' + bookingForOtherFilter + '&page=0');
        var result   = await response.json();
        setCustomerSchedule(result.content);
        setpageCount(result.totalPages);
        url = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&bookingForOther=' + bookingForOtherFilter + '&page=';
    };

    /* ── Tải giấy xác nhận tiêm chủng (PDF) ─── */
    const [downloadingCertId, setDownloadingCertId] = useState(null);
    async function downloadCert(item) {
        try {
            setDownloadingCertId(item.id);
            const res = await getMethod(`/api/certificate/customer/by-schedule/${item.id}`);
            if (res.status >= 300) {
                const j = await res.json().catch(() => ({}));
                toast.error(j.defaultMessage || 'Không tải được giấy xác nhận!');
                return;
            }
            const cert = await res.json();
            await downloadCertificatePdf(cert);
            toast.success('Đã tải giấy xác nhận!');
        } catch (err) {
            console.error('downloadCert error:', err);
            const msg = err?.message || String(err);
            toast.error(`Tạo PDF thất bại: ${msg}`);
        } finally {
            setDownloadingCertId(null);
        }
    }

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
        var curUrl = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&bookingForOther=' + bookingForOtherFilter;
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
        url = '/api/customer-schedule/customer/my-schedule?&size=' + size + '&sort=id,desc&bookingForOther=' + bookingForOtherFilter + '&page=';
        var response = await getMethod(url + 0);
        var result   = await response.json();
        setCustomerSchedule(result.content);
        setpageCount(result.totalPages);
        document.getElementById('search').value = '';
        document.getElementById('from').value   = '';
        document.getElementById('to').value     = '';
    }

    async function submitRefundBank(event) {
        event.preventDefault();
        const body = {
            bankName: event.target.elements.bankName.value,
            bankAccount: event.target.elements.bankAccount.value,
            bankAccountName: event.target.elements.bankAccountName.value,
        };
        if (!body.bankName || !body.bankAccount || !body.bankAccountName) {
            toast.warning('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng');
            return;
        }
        try {
            const res = await postMethodPayload(`/api/customer-schedule/customer/submit-refund-bank/${refundItem.id}`, body);
            if (res.status < 300) {
                toast.success('Gửi thông tin ngân hàng thành công! Vui lòng chờ Admin chuyển tiền.');
                setRefundItem(null);
                await reloadSchedule();
            } else {
                toast.error('Gửi thông tin thất bại. Vui lòng thử lại.');
            }
        } catch (e) {
            toast.error('Lỗi kết nối');
        }
    }

    /* ── render ───────────────────────────────── */
    return (
        <>
            {/* ── Tabs Navigation ────────────────────── */}
            <div style={{
                display: 'flex', gap: '8px', marginBottom: '16px',
                borderBottom: `1px solid ${BORDER}`, paddingBottom: '12px'
            }}>
                <button
                    onClick={() => setBookingForOtherFilter(false)}
                    style={{
                        padding: '10px 20px', borderRadius: '8px',
                        border: 'none',
                        background: !bookingForOtherFilter ? `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` : '#f1f5f9',
                        color: !bookingForOtherFilter ? '#fff' : TEXT_2,
                        fontWeight: '700', fontSize: '13.5px', cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: !bookingForOtherFilter ? '0 4px 6px -1px rgba(14, 165, 233, 0.2)' : 'none'
                    }}
                >
                    👤 Lịch tiêm của tôi
                </button>
                <button
                    onClick={() => setBookingForOtherFilter(true)}
                    style={{
                        padding: '10px 20px', borderRadius: '8px',
                        border: 'none',
                        background: bookingForOtherFilter ? `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` : '#f1f5f9',
                        color: bookingForOtherFilter ? '#fff' : TEXT_2,
                        fontWeight: '700', fontSize: '13.5px', cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: bookingForOtherFilter ? '0 4px 6px -1px rgba(14, 165, 233, 0.2)' : 'none'
                    }}
                >
                    👶 Lịch đặt hộ người thân
                </button>
            </div>

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
                            {['Mã ĐK', 'Người được tiêm', 'Vaccine', 'Trung tâm', 'Ngày đăng ký', 'Ngày tiêm', 'Thanh toán', 'Trạng thái', 'Tình trạng SK', 'Chức năng', 'Phản hồi', 'Giấy xác nhận', 'Hủy lịch'].map((h, i) => (
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
                                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontWeight: '600', color: TEXT }}>{item.fullName}</div>
                                        <div style={{ color: TEXT_2, fontSize: '12px', marginTop: '2px' }}>
                                            🎂 {formatDate(item.dob)}
                                        </div>
                                        {item.phone && (
                                            <div style={{ color: TEXT_2, fontSize: '12.5px', marginTop: '2px' }}>
                                                📞 {item.phone}
                                            </div>
                                        )}
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
                                        <PayBadge status={item.payStatus} />
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <StatusBadge status={item.statusCustomerSchedule} />
                                    </td>
                                    <td style={{ padding: '12px 14px', minWidth: '150px', maxWidth: '210px' }}>
                                        <HealthStatusCell item={item} onViewMore={setHealthItem} />
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                            {canReschedule(item) && (
                                                <ActionBtnBs
                                                    color="#6366f1"
                                                    onClick={() => setItem(item)}
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#modeldoilich"
                                                >
                                                    🔄 Đổi lịch
                                                </ActionBtnBs>
                                            )}
                                            {canPayOnline(item) && (
                                                <ActionBtn
                                                    color="#10b981"
                                                    onClick={() => openPaymentModal(item)}
                                                >
                                                    💵 Thanh toán ngay
                                                </ActionBtn>
                                            )}
                                            {item.payStatus === 'REFUND_PENDING' && (
                                                item.bankAccount ? (
                                                    <span style={{ fontSize: '11px', color: TEXT_2, fontStyle: 'italic', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                                        🏦 Đã gửi thông tin nhận hoàn tiền
                                                    </span>
                                                ) : (
                                                    <ActionBtnBs
                                                        color="#f59e0b"
                                                        onClick={() => setRefundItem(item)}
                                                    >
                                                        🏦 Nhập STK hoàn tiền
                                                    </ActionBtnBs>
                                                )
                                            )}
                                            {(item.counterChange ?? 0) > 0 && (
                                                <button
                                                    onClick={() => openHistory(item)}
                                                    title={`Đã đổi ${item.counterChange} lần — Xem lịch sử`}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 8, fontSize: 12,
                                                        fontWeight: 600, border: `1.5px solid #94a3b8`,
                                                        background: 'transparent', color: '#64748b',
                                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    📋 LS ({item.counterChange})
                                                </button>
                                            )}
                                        </div>
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
                                        {(item.statusCustomerSchedule === 'injected' ||
                                          item.statusCustomerSchedule === 'finished') && (
                                            <ActionBtn
                                                color="#0284c7"
                                                onClick={() => downloadCert(item)}
                                                disabled={downloadingCertId === item.id}
                                            >
                                                {downloadingCertId === item.id ? '⏳ Đang tải...' : '📄 Tải PDF'}
                                            </ActionBtn>
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
                                <td colSpan={13} style={{ padding: '48px', textAlign: 'center', color: TEXT_2 }}>
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
                                    <p style={{ fontWeight: 700, marginBottom: 8, color: '#1890ff' }}>📋 Tình trạng trước tiêm (sàng lọc)</p>
                                    <ScreeningDetail text={healthItem.healthStatusBefore} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, marginBottom: 8, color: '#52c41a' }}>🩺 Theo dõi sau tiêm</p>
                                    <ScreeningDetail text={healthItem.healthStatusAfter} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setHealthItem(null)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal lịch sử đổi lịch */}
            {historyItem && (
                <div
                    className="modal fade show"
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.4)' }}
                    tabIndex="-1"
                    onClick={() => setHistoryItem(null)}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header" style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`, color: '#fff' }}>
                                <h5 className="modal-title" style={{ color: '#fff' }}>
                                    📋 Lịch sử đổi lịch — Mã ĐK #{historyItem.id}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setHistoryItem(null)}></button>
                            </div>
                            <div className="modal-body">
                                {historyLoading ? (
                                    <div style={{ textAlign: 'center', padding: 30, color: TEXT_2 }}>Đang tải...</div>
                                ) : historyList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 30, color: TEXT_2 }}>
                                        <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                                        Chưa có lịch sử đổi
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {historyList.map((h, idx) => (
                                            <div key={h.id} style={{
                                                background: BG_ROW, borderRadius: 10,
                                                border: `1px solid ${BORDER}`, padding: '14px 16px',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <strong style={{ color: PRIMARY }}>Lần đổi #{historyList.length - idx}</strong>
                                                    <span style={{ fontSize: 12, color: TEXT_2 }}>
                                                        🕒 {formatDateTime(h.changedAt)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                                                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                                                        <div style={{ fontSize: 11, color: TEXT_2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                                            Slot cũ
                                                        </div>
                                                        <div style={{ fontWeight: 600, color: TEXT }}>
                                                            {formatDate(h.fromInjectDate)}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: TEXT_2 }}>
                                                            {formatTime(h.fromStart)} – {formatTime(h.fromEnd)}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 24, color: ACCENT, textAlign: 'center' }}>→</div>
                                                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: `1px solid ${SUCCESS}55` }}>
                                                        <div style={{ fontSize: 11, color: SUCCESS, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                                            Slot mới
                                                        </div>
                                                        <div style={{ fontWeight: 600, color: TEXT }}>
                                                            {formatDate(h.toInjectDate)}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: TEXT_2 }}>
                                                            {formatTime(h.toStart)} – {formatTime(h.toEnd)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setHistoryItem(null)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nhập STK Hoàn tiền */}
            {refundItem && (
                <div
                    className="modal fade show"
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
                    tabIndex="-1"
                    onClick={() => setRefundItem(null)}
                >
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content" style={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                            <div className="modal-header" style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`, color: '#fff', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title" style={{ color: '#fff', fontWeight: '700' }}>
                                    🏦 Nhập thông tin hoàn tiền
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setRefundItem(null)}></button>
                            </div>
                            <form onSubmit={submitRefundBank}>
                                <div className="modal-body" style={{ padding: '24px' }}>
                                    <p style={{ fontSize: '13.5px', color: TEXT_2, marginBottom: '16px', lineHeight: '1.5' }}>
                                        Lịch hẹn <strong>#{refundItem.id}</strong> đã thanh toán của bạn đã bị hủy. Vui lòng cung cấp số tài khoản để trung tâm hoàn lại tiền (chiết khấu 5% hoặc nguyên giá tùy giao dịch).
                                    </p>
                                    
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: TEXT, marginBottom: '6px' }}>
                                            Tên ngân hàng <span style={{ color: DANGER }}>*</span>
                                        </label>
                                        <select 
                                            name="bankName" 
                                            defaultValue=""
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER}`, fontSize: '14px', outline: 'none' }}
                                        >
                                            <option value="" disabled>-- Chọn ngân hàng --</option>
                                            <option value="Vietcombank">Vietcombank (VCB)</option>
                                            <option value="Techcombank">Techcombank (TCB)</option>
                                            <option value="MB Bank">MB Bank (MB)</option>
                                            <option value="BIDV">BIDV</option>
                                            <option value="VietinBank">VietinBank</option>
                                            <option value="Agribank">Agribank</option>
                                            <option value="ACB">ACB</option>
                                            <option value="TPBank">TPBank</option>
                                            <option value="VPBank">VPBank</option>
                                            <option value="VIB">VIB</option>
                                            <option value="Sacombank">Sacombank</option>
                                            <option value="DongA Bank">DongA Bank</option>
                                        </select>
                                    </div>
                                    
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: TEXT, marginBottom: '6px' }}>
                                            Số tài khoản nhận tiền <span style={{ color: DANGER }}>*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            name="bankAccount" 
                                            required 
                                            placeholder="Nhập số tài khoản ngân hàng..."
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: TEXT, marginBottom: '6px' }}>
                                            Tên chủ tài khoản <span style={{ color: DANGER }}>*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            name="bankAccountName" 
                                            required 
                                            placeholder="Ví dụ: NGUYEN VAN A"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 24px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setRefundItem(null)} style={{ borderRadius: '8px' }}>Hủy</button>
                                    <button type="submit" className="btn btn-primary" style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`, border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: '600' }}>Gửi thông tin</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Thanh toán ────────────────────── */}
            {showPayModal && paymentItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', width: '100%',
                        maxWidth: '480px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setShowPayModal(false)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'none', border: 'none', fontSize: '20px',
                                color: TEXT_2, cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                        
                        <h4 style={{ fontWeight: 700, color: PRIMARY, marginBottom: '8px', fontSize: '18px' }}>
                            Thanh toán lịch hẹn #{paymentItem.id}
                        </h4>
                        <p style={{ color: TEXT_2, fontSize: '13.5px', marginBottom: '20px' }}>
                            Vui lòng hoàn tất thanh toán trong thời gian giữ chỗ (30 phút từ lúc đăng ký) để hưởng ưu đãi giảm 5%.
                        </p>

                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                <span style={{ color: TEXT_2 }}>Vaccine:</span>
                                <strong style={{ color: TEXT, textAlign: 'right', maxWidth: '240px', wordBreak: 'break-word' }}>{paymentItem.vaccineScheduleTime.vaccineSchedule.vaccine.name}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                <span style={{ color: TEXT_2 }}>Người được tiêm:</span>
                                <span style={{ color: TEXT, fontWeight: 600 }}>{paymentItem.fullName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px dashed ${BORDER}`, fontSize: '15px' }}>
                                <span style={{ color: TEXT, fontWeight: 700 }}>Số tiền cần đóng:</span>
                                <strong style={{ color: SUCCESS, fontSize: '17px' }}>
                                    {paymentItem.price?.toLocaleString('vi-VN')} đ <span style={{ fontSize: '11px', color: TEXT_2, fontWeight: 'normal' }}>(Giảm 5%)</span>
                                </strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => requestPayMentVnpay(paymentItem)}
                                style={{
                                    padding: '12px', borderRadius: '10px',
                                    background: '#0284c7', color: '#fff', border: 'none',
                                    fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#0369a1'}
                                onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
                            >
                                💳 Thanh toán qua VNPay
                            </button>

                            <div style={{ borderTop: `1px solid ${BORDER}`, margin: '8px 0', position: 'relative', textAlign: 'center' }}>
                                <span style={{ background: '#fff', padding: '0 8px', fontSize: '12px', color: TEXT_2, position: 'relative', top: '-10px' }}>Hoặc</span>
                            </div>

                            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons', environment: 'sandbox' }}>
                                <div style={{ minHeight: '80px' }}>
                                    {paypalProcessing ? (
                                        <div style={{ textAlign: 'center', padding: '12px', color: TEXT_2, fontSize: '13.5px' }}>
                                            ⏳ Đang xử lý giao dịch PayPal...
                                        </div>
                                    ) : (
                                        <PayPalButtons
                                            style={{ layout: 'vertical', label: 'paypal', height: 42 }}
                                            createOrder={(data, actions) => {
                                                return actions.order.create({
                                                    purchase_units: [{
                                                        amount: {
                                                            value: convertVndToUsd(paymentItem.price),
                                                            currency_code: 'USD',
                                                        },
                                                        description: paymentItem.vaccineScheduleTime.vaccineSchedule.vaccine.name || 'Vaccine',
                                                    }],
                                                    application_context: { shipping_preference: 'NO_SHIPPING' },
                                                });
                                            }}
                                            onApprove={async (data, actions) => {
                                                setPaypalProcessing(true);
                                                try {
                                                    const orderId = data?.orderID;
                                                    if (!orderId) throw new Error('Không lấy được orderID từ PayPal');
                                                    
                                                    const res = await postMethodPayload(
                                                        `/api/customer-schedule/customer/finish-payment-schedule?id=${paymentItem.id}`,
                                                        { orderId, payType: 'PAYPAL' }
                                                    );
                                                    
                                                    if (res.status < 300) {
                                                        setShowPayModal(false);
                                                        import('sweetalert2').then((module) => {
                                                            const Swal = module.default;
                                                            Swal.fire({
                                                                title: 'Thanh toán thành công! 🎉',
                                                                text: 'Đăng ký và thanh toán tiêm chủng thành công.',
                                                                icon: 'success',
                                                                preConfirm: () => { reloadSchedule(); },
                                                            });
                                                        });
                                                    } else {
                                                        const text = await res.text();
                                                        toast.error(`Xử lý thanh toán thất bại: ${text}`);
                                                    }
                                                } catch (err) {
                                                    console.error('[PayPal] error:', err);
                                                    toast.error(`Lỗi PayPal: ${err?.message || String(err)}`);
                                                } finally {
                                                    setPaypalProcessing(false);
                                                }
                                            }}
                                            onError={(err) => {
                                                console.error('[PayPal SDK] error:', err);
                                                toast.error('Lỗi khởi tạo PayPal SDK');
                                            }}
                                        />
                                    )}
                                </div>
                            </PayPalScriptProvider>
                        </div>
                    </div>
                </div>
            )}

            <DoiLich customerSchedule={item} onChanged={reloadSchedule} />
        </>
    );
}

export default LichDaDangKy;
