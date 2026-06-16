import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDay, faSyringe, faClock, faPhone, faIdCard,
  faStethoscope, faRefresh, faCheckCircle, faXmark, faSearch, faX, faEye,
} from '@fortawesome/free-solid-svg-icons';
import ScreeningModal from './components/ScreeningModal';
import FollowupModal from './components/FollowupModal';
import PatientHistoryModal from './components/PatientHistoryModal';

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
const authFetch = (url, opts = {}) =>
  fetch(BASE + url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

const STATUS_VI = {
  pending:      { label: 'Chờ duyệt',  color: WARNING, bg: 'rgba(245,158,11,.1)' },
  confirmed:    { label: 'Đã duyệt',   color: ACCENT,  bg: 'rgba(14,165,233,.1)' },
  injected:     { label: 'Đã tiêm',    color: SUCCESS, bg: 'rgba(16,185,129,.1)' },
  finished:     { label: 'Hoàn thành', color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
  not_injected: { label: 'Đã hoãn',    color: DANGER,  bg: 'rgba(239,68,68,.1)' },
  cancelled:    { label: 'Hủy',        color: TEXT_2,  bg: 'rgba(100,116,139,.1)' },
};

function fmtTime(s) {
  if (!s) return '—';
  const parts = String(s).split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : s;
}

const DoctorTodayQueue = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [screeningTarget, setScreeningTarget] = useState(null);
  const [followupTarget, setFollowupTarget] = useState(null);
  const [historyTarget, setHistoryTarget]     = useState(null);
  const [filterDate, setFilterDate] = useState('');  // yyyy-MM-dd; trống = mặc định (hôm nay + tương lai)
  const [search, setSearch]       = useState('');
  const [selVaccine, setSelVaccine] = useState('');
  const [selStatus, setSelStatus]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const url = filterDate
        ? `/api/doctor/doctor/today-queue?date=${filterDate}`
        : '/api/doctor/doctor/today-queue';
      const res = await authFetch(url);
      if (res.ok) {
        setItems(await res.json());
      } else {
        toast.error('Không tải được lịch tiêm');
      }
    } catch { toast.error('Lỗi kết nối'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterDate]);

  const todayStr = new Date().toLocaleDateString('vi-VN');

  /* Stats */
  const totalCount     = items.length;
  const injectedCount  = items.filter(i => i.statusCustomerSchedule === 'injected'
                                       || i.statusCustomerSchedule === 'finished').length;
  const pendingCount   = items.filter(i => i.statusCustomerSchedule === 'confirmed').length;
  const deferredCount  = items.filter(i => i.statusCustomerSchedule === 'not_injected').length;

  const uniqueVaccines = Array.from(
    new Set(
      items
        .map(i => i.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name)
        .filter(Boolean)
    )
  ).sort();

  const filteredItems = items.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      const matchText = (item.fullName || '').toLowerCase().includes(q)
          || (item.phone || '').includes(q)
          || (item.idCard || '').includes(q);
      if (!matchText) return false;
    }
    if (selVaccine) {
      if (item.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name !== selVaccine) return false;
    }
    if (selStatus) {
      if (item.statusCustomerSchedule !== selStatus) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${WARNING},#9a3412)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,.3)' }}>
            <FontAwesomeIcon icon={faCalendarDay} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>
              {filterDate ? 'Lịch tiêm theo ngày' : 'Lịch tiêm sắp tới'}
            </h2>
            <div style={{ fontSize: 13, color: TEXT_2 }}>
              {filterDate
                ? `Ngày ${new Date(filterDate).toLocaleDateString('vi-VN')} · ${totalCount} bệnh nhân`
                : `Hôm nay (${todayStr}) trở đi · ${totalCount} bệnh nhân được gán cho tôi`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={{
            padding: '9px 16px', borderRadius: 10,
            border: `1.5px solid ${BORDER}`, background: '#fff',
            color: TEXT_2, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <FontAwesomeIcon icon={faRefresh} /> Làm mới
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <MiniStat label="Tổng" value={totalCount}    color={PRIMARY} />
        <MiniStat label="Chờ tiêm" value={pendingCount} color={ACCENT} icon="⏳" />
        <MiniStat label="Đã tiêm" value={injectedCount} color={SUCCESS} icon="✅" />
        <MiniStat label="Đã hoãn" value={deferredCount} color={DANGER}  icon="⛔" />
      </div>

      {/* Advanced Filter Bar */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: 18, marginBottom: 20,
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(0,0,0,.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {/* Search by Name/SĐT/CCCD */}
          <div>
            <label style={labelStyle}>Tìm bệnh nhân</label>
            <div style={inputContainerStyle}>
              <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 13 }} />
              <input
                type="text"
                placeholder="Họ tên, SĐT, CCCD..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={filterInputStyle}
              />
              {search && (
                <button onClick={() => setSearch('')} style={clearBtnStyle}>
                  <FontAwesomeIcon icon={faX} style={{ fontSize: 11 }} />
                </button>
              )}
            </div>
          </div>

          {/* Select Vaccine */}
          <div>
            <label style={labelStyle}>Vắc-xin</label>
            <select
              value={selVaccine}
              onChange={e => setSelVaccine(e.target.value)}
              style={selectStyle}
            >
              <option value="">Tất cả vắc-xin</option>
              {uniqueVaccines.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Select Status */}
          <div>
            <label style={labelStyle}>Trạng thái</label>
            <select
              value={selStatus}
              onChange={e => setSelStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="confirmed">Đã duyệt (Chờ tiêm)</option>
              <option value="injected">Đã tiêm</option>
              <option value="finished">Hoàn thành</option>
              <option value="not_injected">Đã hoãn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Select Date */}
          <div>
            <label style={labelStyle}>Ngày tiêm (Dữ liệu mạng)</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={dateInputStyle}
            />
          </div>
        </div>

        {/* Reset button row */}
        {(search || selVaccine || selStatus || filterDate) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              onClick={() => {
                setSearch('');
                setSelVaccine('');
                setSelStatus('');
                setFilterDate('');
              }}
              style={{
                padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
                background: '#fff', color: TEXT_2, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <FontAwesomeIcon icon={faXmark} /> Reset bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Queue table */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Ngày tiêm', 'Giờ', 'Bệnh nhân', 'Vaccine', 'Trạng thái', 'Hành động'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={tdCenter}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={tdCenter}>
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>☕</div>
                    Không có bệnh nhân nào cần tiêm ngày này.<br/>
                  </div>
                </td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} style={tdCenter}>
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                    Không tìm thấy bệnh nhân nào khớp với bộ lọc.<br/>
                  </div>
                </td></tr>
              ) : filteredItems.map(item => {
                const st = STATUS_VI[item.statusCustomerSchedule] || STATUS_VI.confirmed;
                const time = item.vaccineScheduleTime;
                /* ─── Chỉ cho action khi injectDate = today + status confirmed ─── */
                const todayMs = new Date().setHours(0,0,0,0);
                const itemDateMs = time?.injectDate
                  ? new Date(time.injectDate).setHours(0,0,0,0)
                  : null;
                const isToday  = itemDateMs === todayMs;
                const isFuture = itemDateMs > todayMs;
                const isPast   = itemDateMs < todayMs;
                const canScreen = item.statusCustomerSchedule === 'confirmed' && isToday;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Ngày tiêm */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const d = time?.injectDate ? new Date(time.injectDate) : null;
                        if (!d || isNaN(d.getTime())) return <span style={{ color: TEXT_2 }}>—</span>;
                        const todayMs = new Date().setHours(0,0,0,0);
                        const itemMs  = new Date(d).setHours(0,0,0,0);
                        const isToday = itemMs === todayMs;
                        const isPast  = itemMs < todayMs;
                        return (
                          <div>
                            <div style={{ fontWeight: 700, color: isPast ? DANGER : (isToday ? PRIMARY : TEXT), fontSize: 13.5 }}>
                              {String(d.getDate()).padStart(2,'0')}/{String(d.getMonth()+1).padStart(2,'0')}/{d.getFullYear()}
                            </div>
                            {isToday && <div style={{ fontSize: 10.5, color: PRIMARY, fontWeight: 700 }}>HÔM NAY</div>}
                            {isPast && <div style={{ fontSize: 10.5, color: DANGER, fontWeight: 700 }}>QUÁ HẠN</div>}
                          </div>
                        );
                      })()}
                    </td>
                    {/* Giờ */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 800, color: PRIMARY, fontSize: 14 }}>
                        <FontAwesomeIcon icon={faClock} style={{ fontSize: 11, marginRight: 4 }} />
                        {fmtTime(time?.start)} – {fmtTime(time?.end)}
                      </div>
                    </td>
                    {/* Bệnh nhân */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>
                        {item.fullName || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_2, marginTop: 3,
                        display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {item.idCard && (
                          <span><FontAwesomeIcon icon={faIdCard} style={{ marginRight: 3 }} /> {item.idCard}</span>
                        )}
                        {item.phone && (
                          <span><FontAwesomeIcon icon={faPhone} style={{ marginRight: 3 }} /> {item.phone}</span>
                        )}
                      </div>
                    </td>
                    {/* Vaccine */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: TEXT, fontSize: 13.5 }}>
                        {time?.vaccineSchedule?.vaccine?.name || '—'}
                      </div>
                      <div style={{ fontSize: 11.5, color: TEXT_2 }}>
                        {time?.vaccineSchedule?.vaccine?.manufacturer?.name || ''}
                      </div>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 16, fontSize: 12,
                        fontWeight: 700, background: st.bg, color: st.color, whiteSpace: 'nowrap',
                      }}>{st.label}</span>
                    </td>
                    {/* Action */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Nút Xem lịch sử — Bác sĩ được xem bất cứ lúc nào */}
                        <button onClick={() => setHistoryTarget(item)}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = ACCENT;
                            e.currentTarget.style.background = '#f0f9ff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = BORDER;
                            e.currentTarget.style.background = '#fff';
                          }}
                          style={{
                            padding: '7px 12px', borderRadius: 9,
                            border: `1.5px solid ${BORDER}`, background: '#fff',
                            color: PRIMARY, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            transition: 'all .15s',
                          }}>
                          <FontAwesomeIcon icon={faEye} /> Hồ sơ tiêm
                        </button>

                        {/* Nút hành động theo trạng thái lịch */}
                        {item.statusCustomerSchedule === 'injected' ? (
                          item.healthStatusAfter ? (
                            <span style={{ fontSize: 12.5, color: '#6366f1', fontWeight: 700 }}>
                              ✓ Hoàn thành
                            </span>
                          ) : (
                            <button onClick={() => setFollowupTarget(item)}
                              style={{
                                padding: '7px 14px', borderRadius: 9, border: 'none',
                                background: SUCCESS, color: '#fff',
                                fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                              🩺 Theo dõi sau tiêm
                            </button>
                          )
                        ) : item.statusCustomerSchedule === 'finished' ? (
                          <span style={{ fontSize: 12.5, color: '#6366f1', fontWeight: 700 }}>
                            ✓ Hoàn thành
                          </span>
                        ) : item.statusCustomerSchedule === 'not_injected' ? (
                          <span style={{ fontSize: 12.5, color: DANGER, fontWeight: 700 }}>
                            ⛔ Đã hoãn
                          </span>
                        ) : item.statusCustomerSchedule === 'cancelled' ? (
                          <span style={{ fontSize: 12.5, color: TEXT_2, fontWeight: 700 }}>
                            ❌ Đã hủy
                          </span>
                        ) : canScreen ? (
                          /* Hôm nay + confirmed → cho hành động */
                          <button onClick={() => setScreeningTarget(item)}
                            style={{
                              padding: '8px 16px', borderRadius: 9, border: 'none',
                              background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 7,
                            }}>
                            <FontAwesomeIcon icon={faStethoscope} /> Sàng lọc & Tiêm
                          </button>
                        ) : isFuture ? (
                          /* Tương lai → khóa */
                          <span title="Chưa đến ngày tiêm, chỉ có thể xem trước"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 8, fontSize: 12,
                              background: 'rgba(100,116,139,.1)', color: TEXT_2, fontWeight: 600,
                              cursor: 'not-allowed',
                            }}>
                            🔒 Chưa đến ngày
                          </span>
                        ) : isPast ? (
                          /* Quá hạn nhưng còn confirmed → khóa */
                          <span title="Lịch quá hạn, vui lòng yêu cầu KH đặt lại"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 8, fontSize: 12,
                              background: 'rgba(239,68,68,.1)', color: DANGER, fontWeight: 600,
                              cursor: 'not-allowed',
                            }}>
                            ⏰ Quá hạn
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: TEXT_2 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screening Modal */}
      <ScreeningModal
        open={!!screeningTarget}
        target={screeningTarget}
        onClose={() => setScreeningTarget(null)}
        onSuccess={() => { setScreeningTarget(null); load(); }}
      />

      {/* Follow-up Modal */}
      <FollowupModal
        open={!!followupTarget}
        target={followupTarget}
        onClose={() => setFollowupTarget(null)}
        onSuccess={() => { setFollowupTarget(null); load(); }}
      />

      {/* Patient History Modal */}
      <PatientHistoryModal
        open={!!historyTarget}
        target={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: TEXT_2,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '4px',
  display: 'block',
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
  height: '41px',
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
  height: '41px',
};
const clearBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: TEXT_2,
  padding: 0,
};

function MiniStat({ label, value, color, icon }) {
  return (
    <div style={{
      flex: '1 1 140px', minWidth: 140,
      background: '#fff', borderRadius: 12, padding: '12px 16px',
      border: `1px solid ${BORDER}`, boxShadow: '0 1px 5px rgba(0,0,0,.04)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {icon && <div style={{ fontSize: 22 }}>{icon}</div>}
      <div>
        <div style={{ fontSize: 11, color: TEXT_2, fontWeight: 600, textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );
}

const th = {
  padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
  color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.4px',
  borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
};
const tdCenter = { padding: '40px 16px', textAlign: 'center', color: TEXT_2 };

export default DoctorTodayQueue;
