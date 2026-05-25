import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faSearch, faPaperPlane, faCheckCircle, faTimesCircle,
  faSyringe, faCalendarDay, faRefresh,
} from '@fortawesome/free-solid-svg-icons';

const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const WARNING = '#f59e0b';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const BASE  = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(BASE + url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

const TYPE_VI = {
  UPCOMING_INJECTION: { label: 'Nhắc lịch tiêm', color: WARNING, icon: faCalendarDay, bg: 'rgba(245,158,11,0.1)' },
  NEXT_DOSE:          { label: 'Nhắc mũi tiếp',  color: ACCENT,  icon: faSyringe,     bg: 'rgba(14,165,233,0.1)' },
};

function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 160,
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 10px rgba(0,0,0,.05)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 17 }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_2, textTransform: 'uppercase',
          letterSpacing: '.4px' }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, lineHeight: 1.2 }}>{value ?? 0}</div>
      </div>
    </div>
  );
}

const AdminReminders = () => {
  const [list, setList]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState({});
  const [page, setPage]     = useState(0);
  const [size]              = useState(20);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword]       = useState('');
  const [typeFlt, setTypeFlt]       = useState('');
  const [successFlt, setSuccessFlt] = useState('');

  const [triggering, setTriggering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim())     params.set('keyword', keyword.trim());
      if (typeFlt)            params.set('type', typeFlt);
      if (successFlt !== '')  params.set('success', successFlt);
      params.set('page', String(page));
      params.set('size', String(size));
      const res = await authFetch(`/api/reminder/admin/log?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setList(data.content || []);
      setTotal(data.totalElements || 0);
      setStats({
        success: data.totalSuccess, fail: data.totalFail,
        upcoming: data.totalUpcoming, nextDose: data.totalNextDose,
      });
    } catch { toast.error('Không tải được nhật ký reminder'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const handleSearch = () => { setPage(0); load(); };
  const handleReset  = () => { setKeyword(''); setTypeFlt(''); setSuccessFlt(''); setPage(0); setTimeout(load, 0); };

  const triggerReminder = async (type) => {
    const opts = type === 'UPCOMING_INJECTION'
      ? { html: 'Gửi reminder cho các lịch tiêm <strong>ngày mai</strong>?<br/>(test thủ công, bỏ qua cron 8h sáng)' }
      : { html: 'Gửi reminder <strong>mũi tiếp theo</strong> cho mọi user có vaccine nhiều mũi đến hạn?' };
    const { isConfirmed } = await Swal.fire({
      title: 'Gửi reminder thủ công?', ...opts, icon: 'question',
      showCancelButton: true, confirmButtonColor: PRIMARY,
      confirmButtonText: 'Gửi ngay', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;

    setTriggering(true);
    try {
      const res = await authFetch('/api/reminder/admin/trigger', {
        method: 'POST', body: JSON.stringify({ type }),
      });
      if (!res.ok) { toast.error('Gửi thất bại'); return; }
      const result = await res.json();
      toast.success(`Đã gửi ${result.sent || 0} reminder`);
      load();
    } catch { toast.error('Đã xảy ra lỗi'); }
    finally { setTriggering(false); }
  };

  const totalPages = Math.ceil(total / size) || 1;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${WARNING},#9a3412)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,.3)' }}>
            <FontAwesomeIcon icon={faBell} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>Hệ thống Reminder</h2>
            <div style={{ fontSize: 12.5, color: TEXT_2 }}>
              Cron tự động chạy mỗi sáng — 8h00 (lịch ngày mai), 8h15 (mũi tiếp theo)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => triggerReminder('UPCOMING_INJECTION')} disabled={triggering}
            style={triggerBtn(triggering, WARNING)}>
            <FontAwesomeIcon icon={faPaperPlane} /> Gửi nhắc ngày mai
          </button>
          <button onClick={() => triggerReminder('NEXT_DOSE')} disabled={triggering}
            style={triggerBtn(triggering, ACCENT)}>
            <FontAwesomeIcon icon={faPaperPlane} /> Gửi nhắc mũi tiếp
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard icon={faCheckCircle} label="Đã gửi thành công" value={stats.success}  color={SUCCESS} />
        <StatCard icon={faTimesCircle} label="Gửi thất bại"      value={stats.fail}     color={DANGER} />
        <StatCard icon={faCalendarDay} label="Nhắc lịch tiêm"     value={stats.upcoming} color={WARNING} />
        <StatCard icon={faSyringe}     label="Nhắc mũi tiếp"      value={stats.nextDose} color={ACCENT} />
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, alignItems: 'center',
      }}>
        <div style={inputBox}>
          <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 13 }} />
          <input placeholder="Tìm theo email / tên / vaccine" value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            style={inputStyle} />
        </div>
        <select value={typeFlt} onChange={e => setTypeFlt(e.target.value)} style={selectStyle}>
          <option value="">Tất cả loại</option>
          <option value="UPCOMING_INJECTION">Nhắc lịch tiêm</option>
          <option value="NEXT_DOSE">Nhắc mũi tiếp</option>
        </select>
        <select value={successFlt} onChange={e => setSuccessFlt(e.target.value)} style={selectStyle}>
          <option value="">Tất cả trạng thái</option>
          <option value="true">✅ Thành công</option>
          <option value="false">❌ Thất bại</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSearch} style={btnPrimary}>🔍 Lọc</button>
          <button onClick={handleReset}  style={btnSecondary}>
            <FontAwesomeIcon icon={faRefresh} />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Loại', 'Người nhận', 'Vaccine', 'Chi tiết', 'Thời điểm', 'Trạng thái'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={tdCenter}>Đang tải...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} style={tdCenter}>Chưa có reminder nào</td></tr>
              ) : list.map(r => {
                const t = TYPE_VI[r.type] || { label: r.type, color: TEXT_2, icon: faBell, bg: '#f1f5f9' };
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12,
                        fontWeight: 700, background: t.bg, color: t.color,
                        display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        <FontAwesomeIcon icon={t.icon} style={{ fontSize: 11 }} /> {t.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: TEXT, fontSize: 13.5 }}>{r.recipientName || '—'}</div>
                      <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>{r.recipientEmail || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: TEXT }}>{r.vaccineName || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: TEXT_2, maxWidth: 280 }}>
                      {r.subjectInfo || '—'}
                      {!r.success && r.errorMessage && (
                        <div style={{ color: DANGER, marginTop: 4, fontSize: 11 }}>
                          ⚠️ {r.errorMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: TEXT_2, whiteSpace: 'nowrap' }}>
                      {fmtDateTime(r.sentAt)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.success
                        ? <span style={pill(SUCCESS, 'rgba(16,185,129,.1)')}>✅ Thành công</span>
                        : <span style={pill(DANGER,  'rgba(239,68,68,.1)')}>❌ Thất bại</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '14px 18px', borderTop: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: TEXT_2 }}>Trang {page + 1} / {totalPages} · Tổng {total} bản ghi</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnPage(page === 0)}>← Trước</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ ...btnPage(false),
                      background: p === page ? `linear-gradient(135deg,${PRIMARY},${ACCENT})` : '#fff',
                      color: p === page ? '#fff' : TEXT_2, fontWeight: 700 }}>{p + 1}</button>
                );
              })}
              <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnPage(page === totalPages - 1)}>Sau →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── styles ─── */
const th = { padding: '12px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
  color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.4px',
  borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' };
const tdCenter = { padding: '40px 14px', textAlign: 'center', color: TEXT_2 };
const inputBox = { display: 'flex', alignItems: 'center', gap: 8,
  border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: '7px 12px' };
const inputStyle = { border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: TEXT, background: 'transparent' };
const selectStyle = { border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: '8px 12px',
  fontSize: 13.5, color: TEXT, outline: 'none', background: '#fff' };
const btnPrimary = { padding: '9px 16px', borderRadius: 9, border: 'none',
  background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnSecondary = { padding: '9px 14px', borderRadius: 9,
  border: `1.5px solid ${BORDER}`, background: '#fff',
  color: TEXT_2, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const triggerBtn = (disabled, color) => ({
  padding: '9px 16px', borderRadius: 9, border: 'none',
  background: disabled ? '#94a3b8' : color, color: '#fff',
  fontWeight: 700, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 7,
});
const btnPage = (disabled) => ({
  minWidth: 36, height: 36, padding: '0 10px', borderRadius: 8,
  border: `1.5px solid ${BORDER}`, background: '#fff',
  color: TEXT_2, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? .4 : 1, fontWeight: 600,
});
const pill = (color, bg) => ({ padding: '4px 12px', borderRadius: 16, fontSize: 12,
  fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' });

export default AdminReminders;
