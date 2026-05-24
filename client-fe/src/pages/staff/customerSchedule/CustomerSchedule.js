import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark, faSyringe, faUserPlus, faSearch, faX, faUsers } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { AppNotification } from '../../../components/AppNotification';
import { CustomerScheduleApi } from '../../../services/staff/CustomerSchedule.api';
import { VaccineScheduleApi } from '../../../services/staff/VaccineSchedule.api';
import { getMethod, postMethodPayload } from '../../../services/request';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';

const pgCSS = `
.pg-cs{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap;align-items:center}
.pg-cs button{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;background:#fff;transition:all .15s}
.pg-cs button:hover{border-color:#2A388F;color:#2A388F;background:#eff6ff}
.pg-cs button.active{background:linear-gradient(135deg,#2A388F,#0ea5e9);border-color:#2A388F;color:#fff}
.pg-cs button:disabled{opacity:.4;cursor:not-allowed}
`;

const STATUS_COLOR = { confirmed:'#10b981', pending:'#f59e0b', cancelled:'#ef4444', injected:'#0ea5e9', finished:'#6366f1', not_injected:'#f97316' };
const STATUS_LABEL = { confirmed:'Đã duyệt', pending:'Chờ duyệt', cancelled:'Từ chối', injected:'Đã tiêm', finished:'Hoàn thành', not_injected:'Chưa tiêm' };

const inpStyle = (err) => ({
  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13.5, color: T,
  border: `1.5px solid ${err ? D : B}`, outline: 'none', boxSizing: 'border-box', background: '#fff',
});

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T, marginBottom: 5 }}>
        {label}{required && <span style={{ color: D }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: D, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function ModalOverlay({ open, onClose, title, children, footer, size = 620 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 18,
        width: '92%', maxWidth: size, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${B}`,
            display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const CustomerSchedule = () => {
  const [modalOpen,  setModalOpen]  = useState(false);
  const [formHandle, setFormHandle] = useState({});
  const [total,      setTotal]      = useState(0);
  const [curPage,    setCurPage]    = useState(1);
  const [pageSize]                  = useState(10);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formSearch, setFormSearch] = useState({ fullName: '', status: '', page: 1, limit: 10 });

  /* schedule selection */
  const [vaccineSchedules,  setVaccineSchedules]  = useState([]);
  const [availableDates,    setAvailableDates]     = useState([]);
  const [availableTimes,    setAvailableTimes]     = useState([]);
  const [selectedSchedule,  setSelectedSchedule]  = useState(null);
  const [selectedDate,      setSelectedDate]       = useState(null);
  const [selectedTime,      setSelectedTime]       = useState(null);
  const [loadingSchedules,  setLoadingSchedules]   = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const closeModal = () => {
    setModalOpen(false); setFormHandle({}); setFormErrors({});
    setSelectedSchedule(null); setSelectedDate(null); setSelectedTime(null);
    setAvailableDates([]); setAvailableTimes([]);
  };

  useEffect(() => { if (modalOpen) loadVaccineSchedules(); }, [modalOpen]);
  useEffect(() => { loadData(formSearch); }, [formSearch]);
  useEffect(() => { loadData({ ...formSearch, page: curPage, limit: pageSize }); }, [curPage]);

  const loadData = async (params) => {
    setLoading(true);
    try {
      const res = await CustomerScheduleApi.customerSchedules(params);
      setTotal(res.data.totalElements);
      setItems(res.data.content.map((item, i) => ({ ...item, stt: (params.page - 1) * params.limit + i + 1 })));
    } catch (err) { console.error(err); }
    finally { setTimeout(() => setLoading(false), 300); }
  };

  const loadVaccineSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const [a, b] = await Promise.all([
        VaccineScheduleApi.findByFilters({ status: 'ACTIVE',    size: 100, page: 1 }),
        VaccineScheduleApi.findByFilters({ status: 'UPCOMING',  size: 100, page: 1 }),
      ]);
      setVaccineSchedules([...(a.content || []), ...(b.content || [])]);
    } catch { AppNotification.error('Không tải được danh sách lịch tiêm'); }
    finally { setLoadingSchedules(false); }
  };

  const handleSelectSchedule = async (id) => {
    const sch = vaccineSchedules.find(s => String(s.id) === String(id));
    setSelectedSchedule(sch); setSelectedDate(null); setSelectedTime(null);
    setAvailableDates([]); setAvailableTimes([]);
    handleInput('vaccineScheduleId', id); handleInput('vaccineScheduleTimeId', null);
    const res = await getMethod(`/api/vaccine-schedule-time/public/find-date-by-vaccine-schedule?idSchedule=${id}`);
    const dates = await res.json();
    setAvailableDates(dates);
    if (!dates.length) AppNotification.warning('Lịch này chưa có ngày tiêm nào');
  };

  const handleSelectDate = async (date) => {
    setSelectedDate(date); setSelectedTime(null); setAvailableTimes([]);
    handleInput('vaccineScheduleTimeId', null);
    const res = await getMethod(`/api/vaccine-schedule-time/public/find-time-by-vaccine-schedule?date=${date}&idSchedule=${selectedSchedule.id}`);
    const times = await res.json();
    setAvailableTimes(times);
    if (!times.length) AppNotification.warning('Không có giờ tiêm nào trong ngày này');
  };

  const handleSelectTime = (id) => {
    setSelectedTime(availableTimes.find(t => t.id === id));
    handleInput('vaccineScheduleTimeId', id);
  };

  const handleApprove = (id, status) => {
    CustomerScheduleApi.approveCustomerSchedule({ customerScheduleId: id, status })
      .then(() => { loadData(formSearch); AppNotification.success(status === 'confirmed' ? 'Duyệt thành công' : status === 'injected' ? 'Xác nhận tiêm xong' : 'Từ chối thành công'); })
      .catch(err => { const msg = err.response?.data?.defaultMessage; if (msg) AppNotification.error(msg); });
  };

  const handleInput = (name, value) => {
    setFormHandle(p => ({ ...p, [name]: value }));
    if (formErrors[name]) setFormErrors(p => ({ ...p, [name]: '' }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formHandle.fullName?.trim()) errs.fullName = 'Vui lòng nhập họ tên';
    if (!formHandle.email?.trim())    errs.email    = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(formHandle.email)) errs.email = 'Email không hợp lệ';
    if (!formHandle.phone?.trim())    errs.phone    = 'Vui lòng nhập số điện thoại';
    else if (!/^[0-9]{9,11}$/.test(formHandle.phone)) errs.phone = 'Số điện thoại không hợp lệ';
    if (!formHandle.address?.trim())  errs.address  = 'Vui lòng nhập địa chỉ';
    if (!formHandle.vaccineScheduleId) errs.vaccineScheduleId = 'Vui lòng chọn lịch tiêm';
    if (!formHandle.vaccineScheduleTimeId) errs.vaccineScheduleTimeId = 'Vui lòng chọn giờ tiêm';
    setFormErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    CustomerScheduleApi.createCustomerSchedule(formHandle)
      .then(() => { AppNotification.success('Đăng ký thành công'); loadData(formSearch); closeModal(); })
      .catch(err => AppNotification.error(err.response?.data?.defaultMessage || 'Đăng ký thất bại'));
  };

  const statusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Chờ duyệt', value: 'pending' },
    { label: 'Đã duyệt', value: 'confirmed' },
    { label: 'Từ chối', value: 'cancelled' },
    { label: 'Đã tiêm', value: 'injected' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${P},${A})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
            <FontAwesomeIcon icon={faUsers} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Danh sách đăng ký tiêm</h2>
            <div style={{ fontSize: 13, color: T2 }}>Tổng {total} lượt đăng ký</div>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          color: '#fff', background: `linear-gradient(135deg,${P},${A})`,
          boxShadow: `0 4px 14px rgba(42,56,143,.3)`,
        }}>
          <FontAwesomeIcon icon={faUserPlus} /> Đăng ký cho khách
        </button>
      </div>

      {/* ── filters ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        border: `1px solid ${B}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8,
          border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
          <input placeholder="Tìm theo tên khách hàng..."
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }}
            onChange={e => setFormSearch(f => ({ ...f, fullName: e.target.value, page: 1 }))} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {statusOptions.map(opt => (
            <button key={opt.value} onClick={() => setFormSearch(f => ({ ...f, status: opt.value, page: 1 }))} style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
              transition: 'all .15s',
              background: formSearch.status === opt.value
                ? (opt.value ? STATUS_COLOR[opt.value] || P : P)
                : '#f1f5f9',
              color: formSearch.status === opt.value ? '#fff' : T2,
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Vaccine','Khách hàng','Thanh toán','Ngày tạo','Thời gian KT','Trạng thái','Hành động'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
                    color: T2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 52, textAlign: 'center', color: T2 }}>Không có dữ liệu</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', color: T2, fontWeight: 600, fontSize: 13 }}>{item.stt}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: T }}>
                    {item.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: T }}>{item.fullName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                      background: item.payStatus ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                      color: item.payStatus ? S : D }}>
                      {item.payStatus ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: T2, fontSize: 13 }}>
                    {item.createdDate ? dayjs(item.createdDate).format('HH:mm DD/MM/YY') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: T2, fontSize: 13 }}>
                    {item.completedDate ? dayjs(item.completedDate).format('HH:mm DD/MM/YY') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: `${STATUS_COLOR[item.status] || T2}18`, color: STATUS_COLOR[item.status] || T2 }}>
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {item.status === 'pending' && (<>
                        <button onClick={() => handleApprove(item.id, 'cancelled')} title="Từ chối" style={{
                          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${D}22`, background: `${D}11`, color: D, cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = D; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${D}11`; e.currentTarget.style.color = D; }}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                        <button onClick={() => handleApprove(item.id, 'confirmed')} title="Duyệt" style={{
                          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${S}22`, background: `${S}11`, color: S, cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = S; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${S}11`; e.currentTarget.style.color = S; }}>
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      </>)}
                      {item.status === 'confirmed' && (
                        <button onClick={() => handleApprove(item.id, 'injected')} title="Xác nhận đã tiêm" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
                          border: `1.5px solid ${A}22`, background: `${A}11`, color: A, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, transition: 'all .15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${A}11`; e.currentTarget.style.color = A; }}>
                          <FontAwesomeIcon icon={faSyringe} /> Đã tiêm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: T2 }}>Trang {curPage} / {totalPages} &nbsp;·&nbsp; Tổng {total} đăng ký</span>
            <div className="pg-cs">
              <button disabled={curPage === 1} onClick={() => setCurPage(p => p - 1)}>← Trước</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = totalPages <= 7 ? i + 1 : curPage <= 4 ? i + 1 : curPage >= totalPages - 3 ? totalPages - 6 + i : curPage - 3 + i;
                return <button key={page} className={curPage === page ? 'active' : ''} onClick={() => setCurPage(page)}>{page}</button>;
              })}
              <button disabled={curPage === totalPages} onClick={() => setCurPage(p => p + 1)}>Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Register Modal ── */}
      <ModalOverlay open={modalOpen} onClose={closeModal} title="Đăng ký tiêm cho khách"
        footer={<>
          <button onClick={closeModal} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Hủy</button>
          <button onClick={handleSubmit} style={{
            padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${P},${A})`, color: '#fff', fontWeight: 700, fontSize: 14,
          }}>Đăng ký</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Họ tên" required error={formErrors.fullName}>
            <input style={inpStyle(formErrors.fullName)} placeholder="Nhập họ tên"
              value={formHandle.fullName || ''} onChange={e => handleInput('fullName', e.target.value)} />
          </Field>
          <Field label="Email" required error={formErrors.email}>
            <input style={inpStyle(formErrors.email)} placeholder="Nhập email"
              value={formHandle.email || ''} onChange={e => handleInput('email', e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Số điện thoại" required error={formErrors.phone}>
            <input style={inpStyle(formErrors.phone)} placeholder="Nhập SĐT"
              value={formHandle.phone || ''} onChange={e => handleInput('phone', e.target.value)} />
          </Field>
          <Field label="Địa chỉ" required error={formErrors.address}>
            <input style={inpStyle(formErrors.address)} placeholder="Nhập địa chỉ"
              value={formHandle.address || ''} onChange={e => handleInput('address', e.target.value)} />
          </Field>
        </div>

        <Field label="Lịch tiêm vaccine" required error={formErrors.vaccineScheduleId}>
          <select style={{ ...inpStyle(formErrors.vaccineScheduleId), cursor: 'pointer' }}
            value={formHandle.vaccineScheduleId || ''} onChange={e => handleSelectSchedule(e.target.value)}>
            <option value="">{loadingSchedules ? 'Đang tải...' : '-- Chọn lịch tiêm --'}</option>
            {vaccineSchedules.map(s => (
              <option key={s.id} value={s.id}>
                {s.vaccine?.name || '?'} — {s.center?.centerName || '?'} ({dayjs(s.startDate).format('DD/MM/YY')} - {dayjs(s.endDate).format('DD/MM/YY')})
              </option>
            ))}
          </select>
        </Field>

        {availableDates.length > 0 && (
          <Field label="Ngày tiêm" required>
            <select style={{ ...inpStyle(false), cursor: 'pointer' }}
              value={selectedDate || ''} onChange={e => handleSelectDate(e.target.value)}>
              <option value="">-- Chọn ngày tiêm --</option>
              {availableDates.map(d => <option key={d} value={d}>{dayjs(d).format('DD/MM/YYYY')}</option>)}
            </select>
          </Field>
        )}

        {availableTimes.length > 0 && (
          <Field label="Giờ tiêm" required error={formErrors.vaccineScheduleTimeId}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableTimes.map(t => {
                const isFull = t.quantity >= t.limitPeople;
                const isSel  = selectedTime?.id === t.id;
                return (
                  <div key={t.id} onClick={() => !isFull && handleSelectTime(t.id)} style={{
                    padding: '8px 14px', borderRadius: 9, cursor: isFull ? 'not-allowed' : 'pointer',
                    border: `2px solid ${isSel ? P : isFull ? B : B}`,
                    background: isSel ? `rgba(42,56,143,.08)` : isFull ? '#f9fafb' : '#fff',
                    color: isFull ? T2 : T, fontSize: 13, userSelect: 'none', transition: 'all .15s',
                  }}>
                    <div style={{ fontWeight: 700 }}>{t.start?.slice(0,5)} – {t.end?.slice(0,5)}</div>
                    <div style={{ fontSize: 11, color: isFull ? D : S, marginTop: 2 }}>
                      {t.quantity}/{t.limitPeople} chỗ
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        )}
      </ModalOverlay>
    </div>
  );
};

export default CustomerSchedule;
