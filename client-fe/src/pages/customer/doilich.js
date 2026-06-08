import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { getMethod, postMethod } from '../../services/request';

const MAX_CHANGE = 3;

function DoiLich({ customerSchedule, onChanged }) {
    const [dates, setDates]       = useState([]);
    const [times, setTimes]       = useState([]);
    const [selectedTime, setSelectedTime] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    /* mỗi lần modal mở (customerSchedule đổi reference) → reset + load list ngày */
    useEffect(() => {
        if (!customerSchedule) return;
        setSelectedTime(null);
        setTimes([]);
        const loadDates = async () => {
            try {
                const res = await getMethod(
                    `/api/vaccine-schedule-time/public/find-date-by-vaccine-schedule?idSchedule=${customerSchedule.vaccineScheduleTime.vaccineSchedule.id}`
                );
                const data = await res.json();
                setDates(data || []);
            } catch (e) {
                console.error('load dates failed:', e);
            }
        };
        loadDates();
    }, [customerSchedule]);

    const loadTimes = async (opt) => {
        try {
            const res = await getMethod(
                `/api/vaccine-schedule-time/public/find-time-by-vaccine-schedule?date=${opt.value}&idSchedule=${customerSchedule.vaccineScheduleTime.vaccineSchedule.id}`
            );
            const data = await res.json();
            setTimes(data || []);
            setSelectedTime(null);
        } catch (e) {
            console.error('load times failed:', e);
        }
    };

    const fmtTime = (t) => {
        if (!t) return '';
        const parts = String(t).split(':');
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
    };

    const confirmChange = async () => {
        if (!selectedTime) { toast.warning('Hãy chọn 1 khung giờ tiêm'); return; }
        if (!window.confirm('Xác nhận đổi sang slot này?')) return;

        setSubmitting(true);
        try {
            const res = await postMethod(
                `/api/customer-schedule/customer/change-schedule?id=${customerSchedule.id}&timeId=${selectedTime.id}`
            );
            if (res.status < 300) {
                toast.success('Đổi lịch thành công!');
                // close modal (bootstrap)
                try {
                    const closeBtn = document.querySelector('#modeldoilich [data-bs-dismiss="modal"]');
                    if (closeBtn) closeBtn.click();
                } catch {}
                onChanged?.();
            } else {
                let msg = 'Đổi lịch thất bại';
                try {
                    const j = await res.json();
                    msg = j.defaultMessage || msg;
                } catch {}
                toast.warning(msg);
            }
        } catch (e) {
            toast.error('Lỗi kết nối khi đổi lịch');
        } finally {
            setSubmitting(false);
        }
    };

    const used = customerSchedule?.counterChange || 0;
    const remaining = Math.max(0, MAX_CHANGE - used);
    const exhausted = remaining <= 0;

    return (
        <div className="modal fade" id="modeldoilich" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            🔄 Đổi lịch tiêm — {customerSchedule?.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name}
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <div className="modal-body">
                        {/* counter banner */}
                        <div style={{
                            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                            background: exhausted ? '#fee2e2' : (remaining === 1 ? '#fef3c7' : '#eff6ff'),
                            border: `1px solid ${exhausted ? '#fecaca' : (remaining === 1 ? '#fde68a' : '#dbeafe')}`,
                            color: exhausted ? '#991b1b' : (remaining === 1 ? '#92400e' : '#1e40af'),
                            fontSize: 13, fontWeight: 600,
                        }}>
                            {exhausted
                                ? '⛔ Đã đạt giới hạn — bạn không thể đổi lịch tiếp.'
                                : `Bạn còn ${remaining}/${MAX_CHANGE} lần đổi lịch. Lưu ý: chỉ được đổi khi còn ít nhất 24h trước ngày tiêm.`}
                        </div>

                        {!exhausted && (
                            <div className="row">
                                <div className="col-sm-4">
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b',
                                        textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'block' }}>
                                        Chọn ngày tiêm
                                    </label>
                                    <Select
                                        options={dates.map(d => ({ label: d, value: d }))}
                                        onChange={loadTimes}
                                        placeholder="Chọn ngày..."
                                        isSearchable
                                    />
                                </div>
                                <div className="col-sm-8">
                                    {times.length > 0 && (
                                        <>
                                            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b',
                                                textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'block' }}>
                                                Chọn khung giờ
                                            </label>
                                            <div className="row">
                                                {times.map((t, idx) => {
                                                    const full = t.quantity === t.limitPeople;
                                                    const active = selectedTime?.id === t.id;
                                                    return (
                                                        <div className="col-sm-4" key={t.id} style={{ marginBottom: 10 }}>
                                                            <div
                                                                onClick={() => { if (!full) setSelectedTime(t); }}
                                                                style={{
                                                                    border: `2px solid ${active ? '#0ea5e9' : '#e2e8f0'}`,
                                                                    borderRadius: 10, padding: '10px 12px',
                                                                    cursor: full ? 'not-allowed' : 'pointer',
                                                                    background: active ? '#eff6ff' : (full ? '#f1f5f9' : '#fff'),
                                                                    color: full ? '#94a3b8' : '#1e293b',
                                                                    fontSize: 13, textAlign: 'center',
                                                                    transition: 'all .15s',
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: 700 }}>
                                                                    {fmtTime(t.start)} - {fmtTime(t.end)}
                                                                </div>
                                                                <div style={{ fontSize: 11, marginTop: 4 }}>
                                                                    {full ? '⛔ Đã đầy' : `Còn ${t.limitPeople - t.quantity} chỗ`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        {!exhausted && (
                            <button onClick={confirmChange} type="button" className="btn btn-primary"
                                disabled={submitting || !selectedTime}>
                                {submitting ? 'Đang đổi...' : 'Xác nhận đổi'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DoiLich;
