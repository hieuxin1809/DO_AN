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
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [formHandle, setFormHandle] = useState({});
  const [total,      setTotal]      = useState(0);
  const [curPage,    setCurPage]    = useState(1);
  const [pageSize]                  = useState(10);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formSearch, setFormSearch] = useState({ fullName: '', status: '', payStatus: '', vaccineScheduleId: '', page: 1, limit: 10 });
  const [activeTab,  setActiveTab]  = useState('schedules'); // 'schedules' or 'refunds'
  const [confirmRefundItem, setConfirmRefundItem] = useState(null);
  const [refundNotes, setRefundNotes] = useState('');

  /* schedule selection */
  const [vaccineSchedules,  setVaccineSchedules]  = useState([]);
  const [doctors, setDoctors] = useState([]);
  /* Detect context: admin xem qua /admin/registrations hay staff xem qua /staff/customer-schedule */
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/');
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

  useEffect(() => { loadVaccineSchedules(); }, []);

  /* Load list doctor cho dropdown gán */
  useEffect(() => {
    fetch('http://localhost:8080/api/doctor/public/find-all', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setDoctors)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'refunds') {
      setFormSearch(f => ({ ...f, status: '', payStatus: 'REFUND_PENDING', vaccineScheduleId: '', page: 1 }));
    } else {
      setFormSearch(f => ({ ...f, status: '', payStatus: '', vaccineScheduleId: '', page: 1 }));
    }
    setCurPage(1);
  }, [activeTab]);

  const handleOpenConfirmRefund = (item) => {
    setConfirmRefundItem(item);
    setRefundNotes('');
  };

  const handleConfirmRefundSubmit = async () => {
    if (!refundNotes.trim()) {
      AppNotification.warning('Vui lòng nhập ghi chú hoặc mã giao dịch hoàn tiền');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8080/api/customer-schedule/admin/confirm-refund-done/${confirmRefundItem.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refundNotes }),
      });
      if (res.ok) {
        AppNotification.success('Đã xác nhận hoàn tiền thành công');
        setConfirmRefundItem(null);
        loadData(formSearch);
      } else {
        AppNotification.error('Xác nhận hoàn tiền thất bại');
      }
    } catch {
      AppNotification.error('Lỗi kết nối');
    }
  };

  /* Gán bác sĩ cho 1 lịch tiêm */
  const handleAssignDoctor = async (customerScheduleId, doctorId) => {
    try {
      const url = isAdmin
        ? '/api/customer-schedule/admin/assign-doctor'
        : '/api/customer-schedule/staff/assign-doctor-nurse';
      const res = await fetch('http://localhost:8080' + url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ customerScheduleId, doctorId, nurseId: null }),
      });
      if (res.ok) {
        AppNotification.success('Đã gán bác sĩ thành công');
        loadData(formSearch);
      } else {
        AppNotification.error('Gán bác sĩ thất bại');
      }
    } catch {
      AppNotification.error('Lỗi kết nối');
    }
  };
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

  const handleConfirmPayment = (id) => {
    if (!window.confirm('Xác nhận khách hàng đã thanh toán trực tiếp tại quầy?')) return;
    CustomerScheduleApi.updatePaymentStatus(id, isAdmin)
      .then(() => {
        AppNotification.success('Xác nhận thanh toán thành công');
        loadData(formSearch);
      })
      .catch(err => {
        const msg = err.response?.data?.defaultMessage || 'Xác nhận thanh toán thất bại';
        AppNotification.error(msg);
      });
  };

  const handleOpenReschedule = async (item) => {
    setRescheduleItem(item);
    setRescheduleOpen(true);
    const schId = item.vaccineScheduleTime?.vaccineSchedule?.id;
    if (schId) {
      setSelectedSchedule(item.vaccineScheduleTime.vaccineSchedule);
      setSelectedDate(null);
      setSelectedTime(null);
      setAvailableDates([]);
      setAvailableTimes([]);
      try {
        const res = await getMethod(`/api/vaccine-schedule-time/public/find-date-by-vaccine-schedule?idSchedule=${schId}`);
        if (res.ok) {
          const dates = await res.json();
          setAvailableDates(dates || []);
        } else {
          AppNotification.error('Không tải được ngày tiêm');
        }
      } catch {
        AppNotification.error('Không tải được ngày tiêm');
      }
    } else {
      AppNotification.error('Lịch tiêm không hợp lệ');
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedTime) {
      AppNotification.warning('Vui lòng chọn giờ tiêm mới');
      return;
    }
    try {
      const res = await postMethodPayload(`/api/customer-schedule/customer/change-schedule?id=${rescheduleItem.id}&timeId=${selectedTime.id}`, {});
      if (res.ok) {
        AppNotification.success('Đổi lịch hộ thành công');
        setRescheduleOpen(false);
        setRescheduleItem(null);
        loadData(formSearch);
      } else {
        let msg = 'Đổi lịch thất bại';
        try {
          const j = await res.json();
          msg = j.defaultMessage || msg;
        } catch {}
        AppNotification.error(msg);
      }
    } catch {
      AppNotification.error('Lỗi kết nối khi đổi lịch');
    }
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
    { label: 'Đã hoãn', value: 'not_injected' },
  ];

  const refundStatusOptions = [
    { label: 'Chờ hoàn tiền', value: 'REFUND_PENDING' },
    { label: 'Đã hoàn tiền', value: 'REFUNDED' },
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

      {/* ── Navigation Tabs ── */}
      {isAdmin && (
        <div style={{ display: 'flex', borderBottom: `2.5px solid ${B}`, marginBottom: 20, gap: 24 }}>
          <button
            onClick={() => setActiveTab('schedules')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              color: activeTab === 'schedules' ? P : T2,
              borderBottom: activeTab === 'schedules' ? `3px solid ${P}` : 'none',
              cursor: 'pointer',
              marginBottom: '-2.5px',
              transition: 'all 0.15s',
            }}
          >
            📋 Quản lý Lịch Đăng Ký
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              color: activeTab === 'refunds' ? P : T2,
              borderBottom: activeTab === 'refunds' ? `3px solid ${P}` : 'none',
              cursor: 'pointer',
              marginBottom: '-2.5px',
              transition: 'all 0.15s',
            }}
          >
            💸 Danh Sách Hoàn Tiền Trực Tuyến
          </button>
        </div>
      )}

      {/* ── Advanced Filter Bar ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20,
        border: `1px solid ${B}`, boxShadow: '0 2px 8px rgba(0,0,0,.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {/* Tìm kiếm */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>
              Tìm kiếm khách hàng
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px', background: '#fff'
            }}>
              <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
              <input
                placeholder="Họ tên khách hàng..."
                value={formSearch.fullName}
                onChange={e => setFormSearch(f => ({ ...f, fullName: e.target.value, page: 1 }))}
                style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }}
              />
              {formSearch.fullName && (
                <button onClick={() => setFormSearch(f => ({ ...f, fullName: '', page: 1 }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2, padding: 0 }}>
                  <FontAwesomeIcon icon={faX} style={{ fontSize: 11 }} />
                </button>
              )}
            </div>
          </div>

          {/* Lịch tiêm / Vaccine */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>
              Chiến dịch / Lịch tiêm
            </label>
            <select
              value={formSearch.vaccineScheduleId || ''}
              onChange={e => setFormSearch(f => ({ ...f, vaccineScheduleId: e.target.value ? Number(e.target.value) : '', page: 1 }))}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13.5, color: T,
                border: `1.5px solid ${B}`, outline: 'none', background: '#fff', cursor: 'pointer'
              }}
            >
              <option value="">Tất cả lịch tiêm</option>
              {vaccineSchedules.map(s => (
                <option key={s.id} value={s.id}>
                  {s.vaccine?.name || '?'} — {s.center?.centerName || '?'} ({dayjs(s.startDate).format('DD/MM')} - {dayjs(s.endDate).format('DD/MM')})
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái lịch tiêm (Chỉ hiện khi không ở tab Hoàn tiền) */}
          {activeTab !== 'refunds' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>
                Trạng thái lịch hẹn
              </label>
              <select
                value={formSearch.status || ''}
                onChange={e => setFormSearch(f => ({ ...f, status: e.target.value, page: 1 }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13.5, color: T,
                  border: `1.5px solid ${B}`, outline: 'none', background: '#fff', cursor: 'pointer'
                }}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Trạng thái thanh toán */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>
              Trạng thái thanh toán
            </label>
            <select
              value={formSearch.payStatus || ''}
              onChange={e => setFormSearch(f => ({ ...f, payStatus: e.target.value, page: 1 }))}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13.5, color: T,
                border: `1.5px solid ${B}`, outline: 'none', background: '#fff', cursor: 'pointer'
              }}
              disabled={activeTab === 'refunds'}
            >
              {activeTab === 'refunds' ? (
                <>
                  <option value="REFUND_PENDING">Chờ hoàn tiền</option>
                  <option value="REFUNDED">Đã hoàn tiền</option>
                </>
              ) : (
                <>
                  <option value="">Tất cả trạng thái</option>
                  <option value="CHUA_THANH_TOAN">Chưa thanh toán</option>
                  <option value="DA_THANH_TOAN">Đã thanh toán</option>
                  <option value="REFUND_PENDING">Chờ hoàn tiền</option>
                  <option value="REFUNDED">Đã hoàn tiền</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Reset button row */}
        {(formSearch.fullName || formSearch.vaccineScheduleId || (activeTab !== 'refunds' && formSearch.status) || (activeTab !== 'refunds' && formSearch.payStatus)) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              onClick={() => {
                setFormSearch({
                  fullName: '',
                  status: '',
                  payStatus: activeTab === 'refunds' ? 'REFUND_PENDING' : '',
                  vaccineScheduleId: '',
                  page: 1,
                  limit: 10
                });
              }}
              style={{
                padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${B}`,
                background: '#fff', color: T2, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <FontAwesomeIcon icon={faXmark} /> Reset bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* ── table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {(activeTab === 'refunds' 
                  ? ['#', 'Khách hàng', 'Vaccine', 'Số tiền hoàn', 'Tên ngân hàng', 'Số tài khoản', 'Chủ tài khoản', 'Ghi chú hoàn tiền', 'Hành động']
                  : ['#','Vaccine','Khách hàng','Thanh toán','Ngày tạo','Thời gian KT','Trạng thái','Bác sĩ phụ trách','Hành động']
                ).map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
                    color: T2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeTab === 'refunds' ? 9 : 9} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={activeTab === 'refunds' ? 9 : 9} style={{ padding: 52, textAlign: 'center', color: T2 }}>Không có dữ liệu</td></tr>
              ) : items.map(item => (
                activeTab === 'refunds' ? (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: T2, fontWeight: 600, fontSize: 13 }}>{item.stt}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: T }}>{item.fullName}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: T }}>
                      {item.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: D }}>
                      {item.price ? `${item.price.toLocaleString('vi-VN')}đ` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: T }}>
                      {item.bankName || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa nhập</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: T }}>
                      {item.bankAccount || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: T, textTransform: 'uppercase' }}>
                      {item.bankAccountName || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: T2, fontSize: 13, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.refundNotes}>
                      {item.refundNotes || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.payStatusName === 'REFUND_PENDING' ? (
                        <button 
                          onClick={() => handleOpenConfirmRefund(item)}
                          disabled={!item.bankAccount}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: !item.bankAccount ? 'not-allowed' : 'pointer',
                            background: !item.bankAccount ? '#cbd5e1' : `linear-gradient(135deg, ${P}, ${A})`, 
                            color: '#fff', fontWeight: 700, fontSize: 12.5,
                            boxShadow: '0 2px 6px rgba(42,56,143,0.15)', transition: 'all 0.15s'
                          }}
                        >
                          💸 Xác nhận đã chuyển tiền
                        </button>
                      ) : (
                        <span style={{ color: S, fontWeight: 700, fontSize: 13 }}>✓ Đã hoàn tiền</span>
                      )}
                    </td>
                  </tr>
                ) : (
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
                        background: item.payStatusName === 'REFUND_PENDING' ? '#fef3c7' : item.payStatusName === 'REFUNDED' ? '#e5e7eb' : item.payStatus ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                        color: item.payStatusName === 'REFUND_PENDING' ? '#b45309' : item.payStatusName === 'REFUNDED' ? '#4b5563' : item.payStatus ? S : D }}>
                        {item.payStatusName === 'REFUND_PENDING' ? 'Chờ hoàn tiền' : item.payStatusName === 'REFUNDED' ? 'Đã hoàn tiền' : item.payStatus ? 'Đã thanh toán' : 'Chưa thanh toán'}
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
                    {/* Bác sĩ phụ trách */}
                    <td style={{ padding: '12px 16px' }}>
                      {item.status === 'cancelled' || item.status === 'finished' ? (
                        <span style={{ fontSize: 13, color: T }}>
                          {item.doctor?.fullName || '—'}
                        </span>
                      ) : (
                        <select
                          value={item.doctor?.id || ''}
                          onChange={(e) => handleAssignDoctor(item.id, e.target.value ? Number(e.target.value) : null)}
                          style={{
                            padding: '6px 10px', borderRadius: 7, fontSize: 12.5,
                            border: `1.5px solid ${B}`, background: '#fff', color: T,
                            outline: 'none', minWidth: 150,
                          }}
                        >
                          <option value="">— Chọn bác sĩ —</option>
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.fullName || d.user?.email || `BS#${d.id}`}
                            </option>
                          ))}
                        </select>
                      )}
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
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11.5, color: T2, fontStyle: 'italic',
                          }} title="Chỉ bác sĩ phụ trách mới có thể đánh dấu đã tiêm sau khi sàng lọc">
                            ⏳ Chờ bác sĩ tiêm
                          </span>
                        )}
                        {!item.payStatus && item.status !== 'cancelled' && (
                          <button onClick={() => handleConfirmPayment(item.id)} title="Xác nhận đã thanh toán tại quầy" style={{
                            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1.5px solid ${W}22`, background: `${W}11`, color: W, cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = W; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${W}11`; e.currentTarget.style.color = W; }}>
                            💵
                          </button>
                        )}
                        {(item.status === 'pending' || item.status === 'confirmed' || item.status === 'cancelled' || item.status === 'not_injected') && (
                          <button onClick={() => handleOpenReschedule(item)} title="Đổi lịch hộ" style={{
                            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1.5px solid ${A}22`, background: `${A}11`, color: A, cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${A}11`; e.currentTarget.style.color = A; }}>
                            🔄
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
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

      {/* ── Reschedule Modal (Đổi lịch hộ) ── */}
      <ModalOverlay open={rescheduleOpen} onClose={() => { setRescheduleOpen(false); setRescheduleItem(null); }} title="Đổi lịch tiêm hộ khách"
        footer={<>
          <button onClick={() => { setRescheduleOpen(false); setRescheduleItem(null); }} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Hủy</button>
          <button onClick={handleRescheduleSubmit} disabled={!selectedTime} style={{
            padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${P},${A})`, color: '#fff', fontWeight: 700, fontSize: 14,
          }}>Xác nhận đổi</button>
        </>}>
        {rescheduleItem && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13.5, color: T2 }}>
              Đang đổi lịch cho khách hàng: <strong style={{ color: T }}>{rescheduleItem.fullName}</strong>
            </div>
            <div style={{ marginBottom: 16, fontSize: 13.5, color: T2 }}>
              Vaccine: <strong style={{ color: T }}>{rescheduleItem.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name}</strong>
            </div>
            
            {availableDates.length > 0 ? (
              <Field label="Chọn ngày tiêm mới" required>
                <select style={{ ...inpStyle(false), cursor: 'pointer' }}
                  value={selectedDate || ''} onChange={e => handleSelectDate(e.target.value)}>
                  <option value="">-- Chọn ngày tiêm --</option>
                  {availableDates.map(d => <option key={d} value={d}>{dayjs(d).format('DD/MM/YYYY')}</option>)}
                </select>
              </Field>
            ) : (
              <div style={{ color: D, fontSize: 13 }}>Lịch tiêm này hiện không có ngày tiêm trống nào.</div>
            )}

            {availableTimes.length > 0 && (
              <Field label="Chọn giờ tiêm mới" required>
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
          </div>
        )}
      </ModalOverlay>

      {/* ── Confirm Refund Modal ── */}
      <ModalOverlay open={!!confirmRefundItem} onClose={() => setConfirmRefundItem(null)} title="Xác nhận đã chuyển tiền hoàn" size={500}>
        <div style={{ fontSize: 14, color: T, lineHeight: 1.5 }}>
          <p>Bạn sắp xác nhận hoàn tất việc chuyển tiền hoàn lại cho khách hàng:</p>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: `1px solid ${B}`, marginBottom: 16 }}>
            <div><strong>Khách hàng:</strong> {confirmRefundItem?.fullName}</div>
            <div><strong>Vaccine:</strong> {confirmRefundItem?.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name}</div>
            <div><strong>Số tiền hoàn:</strong> {confirmRefundItem?.price?.toLocaleString('vi-VN')}đ</div>
            <div style={{ marginTop: 8, borderTop: `1px solid ${B}`, paddingTop: 8 }}>
              <div><strong>Ngân hàng:</strong> {confirmRefundItem?.bankName}</div>
              <div><strong>Số tài khoản:</strong> {confirmRefundItem?.bankAccount}</div>
              <div><strong>Chủ tài khoản:</strong> {confirmRefundItem?.bankAccountName}</div>
            </div>
          </div>
          <Field label="Ghi chú hoàn tiền / Mã giao dịch chuyển khoản" required>
            <input 
              style={inpStyle()} 
              placeholder="Nhập mã giao dịch hoặc ghi chú..."
              value={refundNotes} 
              onChange={e => setRefundNotes(e.target.value)} 
            />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setConfirmRefundItem(null)} style={{
              padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${B}`,
              background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 13
            }}>Hủy</button>
            <button onClick={handleConfirmRefundSubmit} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${P}, ${A})`, color: '#fff', fontWeight: 700, fontSize: 13
            }}>Xác nhận hoàn tất</button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
};

export default CustomerSchedule;
