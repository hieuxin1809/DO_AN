import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSearch, faEye, faX } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { VaccineScheduleApi } from '../../../services/staff/VaccineSchedule.api';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';

const pgCSS = `
.pg-csv{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap;align-items:center}
.pg-csv button{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;background:#fff;transition:all .15s}
.pg-csv button:hover{border-color:#2A388F;color:#2A388F;background:#eff6ff}
.pg-csv button.active{background:linear-gradient(135deg,#2A388F,#0ea5e9);border-color:#2A388F;color:#fff}
.pg-csv button:disabled{opacity:.4;cursor:not-allowed}
`;

const sizeOptions = [10, 20, 50, 100];

export default function CustomerScheduleView() {
  const nav = useNavigate();
  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [size,        setSize]        = useState(10);
  const [formSearch,  setFormSearch]  = useState({ vaccineName: '', centerName: '', startDate: null, endDate: null });

  const totalPages = Math.ceil(total / size);

  useEffect(() => { load(); }, [formSearch, currentPage, size]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await VaccineScheduleApi.findByFilters({
        page: currentPage, size,
        vaccineName: formSearch.vaccineName,
        centerName: formSearch.centerName,
        startDate: formSearch.startDate ? dayjs(formSearch.startDate).format('YYYY-MM-DD') : null,
        endDate:   formSearch.endDate   ? dayjs(formSearch.endDate).format('YYYY-MM-DD')   : null,
      });
      setItems(result.content.map((item, i) => ({ ...item, stt: (currentPage - 1) * size + i + 1 })));
      setTotal(result.totalElements);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const isActive = (start, end) => {
    const now = new Date(); return new Date(start) <= now && now <= new Date(end);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${P},${A})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
          <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Quản lý đợt tiêm</h2>
          <div style={{ fontSize: 13, color: T2 }}>Danh sách các đợt vaccine đã mở — tổng {total} đợt</div>
        </div>
      </div>

      {/* ── filters ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        border: `1px solid ${B}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8,
          border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
          <input placeholder="Tên vaccine..." value={formSearch.vaccineName}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }}
            onChange={e => { setFormSearch(f => ({ ...f, vaccineName: e.target.value })); setCurrentPage(1); }} />
          {formSearch.vaccineName && <button onClick={() => setFormSearch(f => ({ ...f, vaccineName: '' }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2 }}>
            <FontAwesomeIcon icon={faX} /></button>}
        </div>
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8,
          border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px' }}>
          <input placeholder="Tên trung tâm..." value={formSearch.centerName}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }}
            onChange={e => { setFormSearch(f => ({ ...f, centerName: e.target.value })); setCurrentPage(1); }} />
          {formSearch.centerName && <button onClick={() => setFormSearch(f => ({ ...f, centerName: '' }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2 }}>
            <FontAwesomeIcon icon={faX} /></button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T2 }}>Từ:</span>
          <input type="date" value={formSearch.startDate || ''}
            style={{ border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 10px', fontSize: 13.5, color: T, outline: 'none' }}
            onChange={e => { setFormSearch(f => ({ ...f, startDate: e.target.value || null })); setCurrentPage(1); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T2 }}>Đến:</span>
          <input type="date" value={formSearch.endDate || ''}
            style={{ border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 10px', fontSize: 13.5, color: T, outline: 'none' }}
            onChange={e => { setFormSearch(f => ({ ...f, endDate: e.target.value || null })); setCurrentPage(1); }} />
        </div>
        <select value={size} onChange={e => { setSize(Number(e.target.value)); setCurrentPage(1); }}
          style={{ border: `1.5px solid ${B}`, borderRadius: 9, padding: '8px 12px', fontSize: 13.5, color: T, outline: 'none', background: '#fff' }}>
          {sizeOptions.map(s => <option key={s} value={s}>{s} / trang</option>)}
        </select>
      </div>

      {/* ── table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Tên Vaccine','Trung tâm','Bắt đầu','Kết thúc','Ngày tạo','Trạng thái','Chi tiết'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
                    color: T2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 52, textAlign: 'center', color: T2 }}>Không có lịch tiêm nào</td></tr>
              ) : items.map(item => {
                const active = isActive(item.startDate, item.endDate);
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: T2, fontWeight: 600, fontSize: 13 }}>{item.stt}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: T }}>{item.vaccine?.name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `rgba(14,165,233,.08)`, color: A }}>{item.center?.centerName || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: T2, fontSize: 13 }}>
                      {item.startDate ? dayjs(item.startDate).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: T2, fontSize: 13 }}>
                      {item.endDate ? dayjs(item.endDate).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: T2, fontSize: 13 }}>
                      {item.createdDate ? dayjs(item.createdDate).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                        background: active ? 'rgba(16,185,129,.1)' : 'rgba(100,116,139,.1)',
                        color: active ? S : T2 }}>
                        {active ? 'Đang diễn ra' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => nav('/staff/customer-schedule-1-detail', { state: item.id })}
                        title="Chi tiết" style={{
                          width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${A}22`, background: `${A}11`, color: A, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${A}11`; e.currentTarget.style.color = A; }}>
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: T2 }}>Trang {currentPage} / {totalPages} &nbsp;·&nbsp; Tổng {total} lịch</span>
            <div className="pg-csv">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Trước</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                return <button key={page} className={currentPage === page ? 'active' : ''} onClick={() => setCurrentPage(page)}>{page}</button>;
              })}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Sau →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
