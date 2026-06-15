import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getMethod } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots, faStar, faEye, faArrowsRotate,
  faUserMd, faSearch, faFilter, faX,
} from '@fortawesome/free-solid-svg-icons';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';

/* ── Stars ── */
function Stars({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <FontAwesomeIcon key={i} icon={faStar}
          style={{ fontSize: size, color: i < rating ? W : '#e2e8f0' }} />
      ))}
    </span>
  );
}

/* ── Avatar ── */
function Avatar({ name }) {
  const ch = (name || '?')[0].toUpperCase();
  const hue = ch.charCodeAt(0) * 47 % 360;
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, fontSize: 14, fontWeight: 800,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `hsl(${hue},60%,48%)` }}>
      {ch}
    </div>
  );
}

/* ── Modal ── */
function ModalOverlay({ open, onClose, title, children, footer, size = 600 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 18,
        width: '92%', maxWidth: size, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: T2, fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
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

/* ════════════════════════════════════ */
const AdminPhanHoi = () => {
  const [items,      setItems]      = useState([]);
  const [filterStar, setFilterStar] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [selected,   setSelected]   = useState(null);

  useEffect(() => { fetchFeedbacks(); }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await getMethod('/api/feedback/admin/all');
      if (res.status < 300) setItems(await res.json());
      else toast.error('Không thể tải danh sách phản hồi');
    } catch { toast.error('Có lỗi xảy ra'); }
    finally { setLoading(false); }
  };

  const filtered = items.filter(item => {
    if (filterStar !== 'all' && Number(item.rating) !== Number(filterStar)) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const customerName = (item.customerSchedule?.fullName || '').toLowerCase();
      const doctorName = (item.doctor?.fullName || '').toLowerCase();
      if (!customerName.includes(term) && !doctorName.includes(term)) return false;
    }
    return true;
  });



  /* avg rating */
  const avgRating = items.length
    ? (items.reduce((s, i) => s + (i.rating || 0), 0) / items.length).toFixed(1)
    : '—';

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const typeColor = { general: A, doctor: S };
  const typeLabel = { general: 'Chung', doctor: 'Bác sĩ' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${P},${A})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
            <FontAwesomeIcon icon={faCommentDots} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Phản hồi khách hàng</h2>
            <div style={{ fontSize: 13, color: T2 }}>{items.length} phản hồi · Điểm đánh giá trung bình: {avgRating} ⭐</div>
          </div>
        </div>
        <button onClick={fetchFeedbacks} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          borderRadius: 10, border: `1.5px solid ${B}`, background: '#fff',
          color: T2, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = P; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = B; e.currentTarget.style.color = T2; }}>
          <FontAwesomeIcon icon={faArrowsRotate} /> Làm mới
        </button>
      </div>



      {/* ── filter bar ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        border: `1px solid ${B}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {/* search */}
        <div style={{ flex: 2, minWidth: 260, display: 'flex', alignItems: 'center', gap: 8,
          border: `1.5px solid ${B}`, borderRadius: 10, padding: '8px 14px', background: '#fff' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khách hàng hoặc bác sĩ..."
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }} />
          {searchTerm && <button onClick={() => setSearchTerm('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2 }}>
            <FontAwesomeIcon icon={faX} />
          </button>}
        </div>

        {/* star filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}>
          <span style={{ fontSize: 13, color: T2, whiteSpace: 'nowrap' }}>Đánh giá:</span>
          <select value={filterStar} onChange={e => setFilterStar(e.target.value)}
            style={{ border: `1.5px solid ${B}`, borderRadius: 10, padding: '8px 12px',
              fontSize: 13.5, color: T, outline: 'none', cursor: 'pointer', background: '#fff', flex: 1 }}>
            <option value="all">Tất cả sao</option>
            <option value="5">5 ⭐ (Xuất sắc)</option>
            <option value="4">4 ⭐ (Tốt)</option>
            <option value="3">3 ⭐ (Bình thường)</option>
            <option value="2">2 ⭐ (Kém)</option>
            <option value="1">1 ⭐ (Rất kém)</option>
          </select>
        </div>

        {/* reset btn */}
        {(filterStar !== 'all' || searchTerm.trim() !== '') && (
          <button onClick={() => { setFilterStar('all'); setSearchTerm(''); }}
            style={{ padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${B}`,
              background: '#fff', color: T2, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = D; e.currentTarget.style.color = D; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = B; e.currentTarget.style.color = T2; }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ── table card ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Khách hàng','Đánh giá','Nội dung','Bác sĩ','Ngày tạo','Chi tiết'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '.4px',
                    borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 52, textAlign: 'center', color: T2 }}>Không có phản hồi nào</td></tr>
              ) : filtered.map((item, idx) => (
                <tr key={item.id}
                  style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 18px', color: T2, fontWeight: 600, fontSize: 13 }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={item.customerSchedule?.fullName} />
                      <div>
                        <div style={{ fontWeight: 700, color: T, fontSize: 13.5 }}>
                          {item.customerSchedule?.fullName || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: T2 }}>{item.customerSchedule?.phone || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div>
                      <Stars rating={item.rating} />
                      <div style={{ fontSize: 11, color: T2, marginTop: 2 }}>{item.rating}/5</div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', color: T2, fontSize: 13,
                    maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.content || '—'}
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13 }}>
                    {item.doctor?.fullName && (
                      <div style={{ color: S, fontWeight: 600 }}>
                        <FontAwesomeIcon icon={faUserMd} style={{ marginRight: 4 }} />
                        {item.doctor.fullName}
                      </div>
                    )}
                    {!item.doctor && <span style={{ color: T2 }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 18px', color: T2, fontSize: 13 }}>{fmtDate(item.createdDate)}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <button onClick={() => { setSelected(item); setShowDetail(true); }} title="Xem chi tiết" style={{
                      width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${A}22`, background: `${A}11`, color: A, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${A}11`; e.currentTarget.style.color = A; }}>
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      <ModalOverlay open={showDetail} onClose={() => setShowDetail(false)}
        title={`Chi tiết phản hồi #${selected?.id}`} size={580}
        footer={
          <button onClick={() => setShowDetail(false)} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Đóng</button>
        }>
        {selected && (
          <div>
            {/* customer info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
              padding: '14px 18px', background: '#f8fafc', borderRadius: 12 }}>
              <Avatar name={selected.customerSchedule?.fullName} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T }}>
                  {selected.customerSchedule?.fullName || '—'}
                </div>
                {selected.customerSchedule?.phone && (
                  <div style={{ fontSize: 13, color: T2 }}>{selected.customerSchedule.phone}</div>
                )}
              </div>
            </div>

            {/* rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
              padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: `1px solid ${W}44` }}>
              <Stars rating={selected.rating} size={20} />
              <span style={{ fontSize: 16, fontWeight: 800, color: W }}>{selected.rating} / 5</span>
            </div>

            {/* content */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Nội dung phản hồi
              </div>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10,
                fontSize: 14, color: T, lineHeight: 1.65, border: `1px solid ${B}` }}>
                {selected.content || '(Không có nội dung)'}
              </div>
            </div>

            {/* details */}
            {[
              ['Loại phản hồi', selected.feedbackType ? typeLabel[selected.feedbackType] || selected.feedbackType : null],
              ['Bác sĩ', selected.doctor?.fullName],
              ['ID lịch đăng ký', selected.customerSchedule?.id],
              ['Ngày tạo', selected.createdDate ? new Date(selected.createdDate).toLocaleString('vi-VN') : null],
            ].map(([k, v]) => v != null ? (
              <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${B}` }}>
                <span style={{ minWidth: 140, fontSize: 13, fontWeight: 700, color: T2 }}>{k}</span>
                <span style={{ fontSize: 13.5, color: T, flex: 1 }}>{v}</span>
              </div>
            ) : null)}
          </div>
        )}
      </ModalOverlay>
    </div>
  );
};

export default AdminPhanHoi;
