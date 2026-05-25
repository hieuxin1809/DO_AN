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

const DoctorMyPatients = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

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

  const filtered = search
    ? items.filter(i => {
        const q = search.toLowerCase();
        return (i.fullName || '').toLowerCase().includes(q)
            || (i.phone || '').includes(q)
            || (i.idCard || '').includes(q);
      })
    : items;

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
            Tổng {items.length} ca đã/đang phụ trách
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '12px 16px', marginBottom: 18,
        border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 13 }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, SĐT, CCCD..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: TEXT, background: 'transparent' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_2 }}>
            <FontAwesomeIcon icon={faX} />
          </button>
        )}
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
