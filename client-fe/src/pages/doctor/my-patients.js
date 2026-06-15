import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faSearch, faX, faSyringe, faClock,
  faCheckCircle, faXmarkCircle, faPhone, faIdCard,
} from '@fortawesome/free-solid-svg-icons';

const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const WARNING = '#f59e0b';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const BASE = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url) =>
  fetch(BASE + url, { headers: { Authorization: `Bearer ${token()}` } });

const STATUS_VI = {
  pending_payment: { label: 'Chờ thanh toán', color: WARNING, bg: 'rgba(245,158,11,.1)' },
  pending:      { label: 'Chờ duyệt',  color: WARNING, bg: 'rgba(245,158,11,.1)' },
  confirmed:    { label: 'Đã duyệt',   color: ACCENT,  bg: 'rgba(14,165,233,.1)' },
  injected:     { label: 'Đã tiêm',    color: SUCCESS, bg: 'rgba(16,185,129,.1)' },
  finished:     { label: 'Hoàn thành', color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
  not_injected: { label: 'Đã hoãn',    color: DANGER,  bg: 'rgba(239,68,68,.1)' },
  cancelled:    { label: 'Hủy',        color: TEXT_2,  bg: 'rgba(100,116,139,.1)' },
};

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('vi-VN');
}

const labelStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: TEXT_2,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '4px',
};
const inputContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: `1.5px solid ${BORDER}`,
  borderRadius: '9px',
  padding: '8px 12px',
  background: '#fff',
};
const filterInputStyle = {
  border: 'none',
  outline: 'none',
  fontSize: '13.5px',
  color: TEXT,
  background: 'transparent',
  width: '100%',
};
const selectStyle = {
  border: `1.5px solid ${BORDER}`,
  borderRadius: '9px',
  padding: '8px 12px',
  fontSize: '13.5px',
  color: TEXT,
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  width: '100%',
};
const dateInputStyle = {
  border: `1.5px solid ${BORDER}`,
  borderRadius: '9px',
  padding: '8px 12px',
  fontSize: '13.5px',
  color: TEXT,
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  width: '100%',
};
const clearBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: TEXT_2,
  padding: 0,
};

const DoctorMyPatients = () => {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selVaccine, setSelVaccine] = useState('');
  const [selStatus, setSelStatus]   = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/doctor/doctor/my-patients');
        if (res.ok) setItems(await res.json());
        else toast.error('Không tải được danh sách');
      } catch { toast.error('Lỗi kết nối'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleResetFilters = () => {
    setSearch('');
    setSelVaccine('');
    setSelStatus('');
    setFromDate('');
    setToDate('');
  };

  const uniqueVaccines = Array.from(
    new Set(
      items
        .map(i => i.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name)
        .filter(Boolean)
    )
  ).sort();

  const filtered = items.filter(i => {
    if (search) {
      const q = search.toLowerCase();
      const matchText = (i.fullName || '').toLowerCase().includes(q)
          || (i.phone || '').includes(q)
          || (i.idCard || '').includes(q);
      if (!matchText) return false;
    }

    if (selVaccine) {
      const vacName = i.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name;
      if (vacName !== selVaccine) return false;
    }

    if (selStatus) {
      if (i.statusCustomerSchedule !== selStatus) return false;
    }

    const injectDateStr = i.vaccineScheduleTime?.injectDate;
    if (injectDateStr) {
      if (fromDate && injectDateStr < fromDate) return false;
      if (toDate && injectDateStr > toDate) return false;
    } else {
      if (fromDate || toDate) return false;
    }

    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg,${ACCENT},#0369a1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(14,165,233,.3)' }}>
          <FontAwesomeIcon icon={faUsers} style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>
            Bệnh nhân của tôi
          </h2>
          <div style={{ fontSize: 13, color: TEXT_2 }}>
            Tổng {items.length} ca đã/đang phụ trách {filtered.length !== items.length && `(Đang lọc hiển thị ${filtered.length})`}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 18,
        border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px',
      }}>
        {/* Search */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Tìm kiếm</label>
          <div style={inputContainerStyle}>
            <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 13 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Họ tên, SĐT, CCCD..."
              style={filterInputStyle}
            />
            {search && (
              <button onClick={() => setSearch('')} style={clearBtnStyle}>
                <FontAwesomeIcon icon={faX} style={{ fontSize: 10 }} />
              </button>
            )}
          </div>
        </div>

        {/* Vaccine Filter */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Vắc-xin</label>
          <select
            value={selVaccine} onChange={e => setSelVaccine(e.target.value)}
            style={selectStyle}
          >
            <option value="">Tất cả vắc-xin</option>
            {uniqueVaccines.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Trạng thái</label>
          <select
            value={selStatus} onChange={e => setSelStatus(e.target.value)}
            style={selectStyle}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.keys(STATUS_VI).map(k => (
              <option key={k} value={k}>{STATUS_VI[k].label}</option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Từ ngày</label>
          <input
            type="date"
            value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>

        {/* To Date */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Đến ngày</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={toDate} onChange={e => setToDate(e.target.value)}
              style={dateInputStyle}
            />
            {(search || selVaccine || selStatus || fromDate || toDate) && (
              <button
                onClick={handleResetFilters}
                style={{
                  padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
                  background: '#f8fafc', color: TEXT_2, cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s', height: '38px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = TEXT; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = TEXT_2; }}
                title="Xóa tất cả bộ lọc"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Bệnh nhân', 'Vaccine', 'Ngày tiêm', 'Trạng thái'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={tdCenter}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={tdCenter}>
                  {search ? `Không tìm thấy "${search}"` : 'Chưa có bệnh nhân nào'}
                </td></tr>
              ) : filtered.map(item => {
                const st = STATUS_VI[item.statusCustomerSchedule] || STATUS_VI.confirmed;
                const time = item.vaccineScheduleTime;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>
                        {item.fullName || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_2, marginTop: 3,
                        display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {item.idCard && (<span><FontAwesomeIcon icon={faIdCard} /> {item.idCard}</span>)}
                        {item.phone && (<span><FontAwesomeIcon icon={faPhone} /> {item.phone}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: TEXT, fontSize: 13.5 }}>
                        {time?.vaccineSchedule?.vaccine?.name || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_2 }}>
                        {time?.vaccineSchedule?.center?.centerName || ''}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: TEXT_2 }}>
                      {fmtDate(time?.injectDate)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 16, fontSize: 12,
                        fontWeight: 700, background: st.bg, color: st.color, whiteSpace: 'nowrap',
                      }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const th = {
  padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
  color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.4px',
  borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
};
const tdCenter = { padding: '40px 16px', textAlign: 'center', color: TEXT_2 };

export default DoctorMyPatients;
