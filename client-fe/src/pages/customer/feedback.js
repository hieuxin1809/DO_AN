import { useState, useEffect } from 'react';
import { getMethod } from '../../services/request';

/* ── palette ──────────────────────────────────── */
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';
const BORDER  = '#e2e8f0';
const BG_ROW  = '#f8fafc';
const ACCENT  = '#0ea5e9';
const PRIMARY = '#2A388F';
const GOLD    = '#f59e0b';

/* ── format "2024-05-10T14:30:00.000" → "10/05/2024" */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr.split('T')[0];
}

/* ── Star display ─────────────────────────────── */
function StarDisplay({ rating }) {
    return (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ fontSize: '14px', color: i <= rating ? GOLD : '#d1d5db' }}>★</span>
            ))}
            <span style={{ fontSize: '12px', color: TEXT_2, marginLeft: '4px' }}>({rating}/5)</span>
        </div>
    );
}

/* ════════════════════════════════════════════════ */
function FeedBack() {
    const [item, setItem] = useState([]);

    useEffect(() => {
        const getItem = async () => {
            var response = await getMethod('/api/feedback/customer/my-feedback');
            var result   = await response.json();
            setItem(result);
        };
        getItem();
    }, []);

    /* empty state */
    if (item.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: TEXT_2 }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>💬</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: TEXT, marginBottom: '8px' }}>
                    Chưa có phản hồi nào
                </div>
                <p style={{ fontSize: '14px', color: TEXT_2 }}>
                    Sau khi hoàn thành tiêm chủng, bạn có thể gửi phản hồi từ tab <strong>Lịch tiêm</strong>.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* summary bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '18px', padding: '12px 18px',
                background: 'rgba(14,165,233,0.06)', borderRadius: '12px',
                border: `1px solid rgba(14,165,233,0.18)`,
            }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                <span style={{ fontSize: '14px', color: PRIMARY, fontWeight: '700' }}>
                    {item.length} phản hồi của bạn
                </span>
            </div>

            {/* table */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${BORDER}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', color: TEXT }}>
                    <thead>
                        <tr style={{ background: `linear-gradient(90deg, ${PRIMARY} 0%, #1e4fad 100%)`, color: '#fff' }}>
                            {['Nội dung phản hồi', 'Ngày gửi', 'Đánh giá', 'Mã đăng ký', 'Bác sĩ', 'Y tá'].map((h, i) => (
                                <th key={i} style={{
                                    padding: '12px 16px', fontWeight: '700', textAlign: 'left',
                                    fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {item.map((fb, index) => (
                            <tr
                                key={fb.id}
                                style={{
                                    background: index % 2 === 0 ? '#fff' : BG_ROW,
                                    borderBottom: `1px solid ${BORDER}`,
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? '#fff' : BG_ROW}
                            >
                                {/* content */}
                                <td style={{ padding: '14px 16px', maxWidth: '260px' }}>
                                    <div style={{
                                        background: '#f8fafc', borderRadius: '8px',
                                        padding: '10px 12px', borderLeft: `3px solid ${ACCENT}`,
                                        fontSize: '13.5px', lineHeight: '1.6', color: TEXT,
                                    }}>
                                        {fb.content}
                                    </div>
                                </td>

                                {/* date */}
                                <td style={{ padding: '14px 16px', color: TEXT_2, whiteSpace: 'nowrap', fontSize: '13px' }}>
                                    <div>📅 {formatDate(fb.createdDate)}</div>
                                </td>

                                {/* stars */}
                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                    <StarDisplay rating={fb.rating} />
                                </td>

                                {/* schedule id */}
                                <td style={{ padding: '14px 16px' }}>
                                    <span style={{
                                        background: 'rgba(42,56,143,0.08)', color: PRIMARY,
                                        padding: '4px 10px', borderRadius: '20px',
                                        fontSize: '12px', fontWeight: '700',
                                    }}>
                                        #{fb.customerSchedule.id}
                                    </span>
                                </td>

                                {/* doctor */}
                                <td style={{ padding: '14px 16px', color: TEXT_2, fontSize: '13px', whiteSpace: 'nowrap' }}>
                                    {fb.doctor ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '15px' }}>👨‍⚕️</span>
                                            {fb.doctor.fullName}
                                        </div>
                                    ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>

                                {/* nurse */}
                                <td style={{ padding: '14px 16px', color: TEXT_2, fontSize: '13px', whiteSpace: 'nowrap' }}>
                                    {fb.nurse ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '15px' }}>👩‍⚕️</span>
                                            {fb.nurse.fullName}
                                        </div>
                                    ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default FeedBack;
