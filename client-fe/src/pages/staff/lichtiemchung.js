import { useState, useEffect } from 'react';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { getMethod, deleteMethod } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faCalendarAlt,
  faSearch, faFilter, faX, faClock, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import AdminGioTiemChung from './giotiem';
import AdminBacSiNgayTiem from './doctorinjectdate';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';
const PAGE_SIZE = 10;

const pgCSS = `
.pg-s-lich{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.pg-s-lich li a{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s}
.pg-s-lich li a:hover{border-color:#2A388F;color:#2A388F;background:#eff6ff}
.pg-s-lich li.active a{background:linear-gradient(135deg,#2A388F,#0ea5e9);border-color:#2A388F;color:#fff}
.pg-s-lich li.disabled a{opacity:.4;cursor:not-allowed}
`;

const StaffLichTiemChung = () => {
  const [items,    setItems]    = useState([]);
  const [pageCount,setPageCount]= useState(0);
  const [curPage,  setCurPage]  = useState(0);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [lichTiem, setLichTiem] = useState(null);
  const [search,   setSearch]   = useState('');
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');

  useEffect(() => { load(0); }, []);

  const load = async (page) => {
    setLoading(true);
    try {
      let url = `/api/vaccine-schedule/all/find-all-page?page=${page}&size=${PAGE_SIZE}&sort=id,desc`;
      if (from && to) url += `&from=${from}&to=${to}`;
      if (search)     url += `&search=${encodeURIComponent(search)}`;
      const res  = await getMethod(url);
      const data = await res.json();
      setItems(data.content || []);
      setPageCount(data.totalPages || 0);
      setTotal(data.totalElements || 0);
      setCurPage(page);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally  { setLoading(false); }
  };

  const handlePageClick = ({ selected }) => load(selected);

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Xóa lịch tiêm?', html: 'Bạn có chắc muốn xóa lịch tiêm này?',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: D, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    const res = await deleteMethod('/api/vaccine-schedule/admin/delete?id=' + id);
    if (res.status < 300)       { toast.success('Xóa thành công!'); load(0); }
    else if (res.status === 417){ const d = await res.json(); toast.warning(d.defaultMessage); }
    else                         toast.error('Xóa thất bại!');
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
  const getStatus = (start, end) => {
    if (!start || !end) return { text: '—', color: T2, bg: 'rgba(100,116,139,.1)' };
    const getLocalDateString = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateString(new Date());
    const startStr = start.substring(0, 10);
    const endStr = end.substring(0, 10);
    if (todayStr < startStr) {
      return { text: 'Sắp diễn ra', color: W, bg: 'rgba(245,158,11,.1)' };
    } else if (todayStr > endStr) {
      return { text: 'Đã kết thúc', color: D, bg: 'rgba(239,68,68,.1)' };
    } else {
      return { text: 'Đang diễn ra', color: S, bg: 'rgba(16,185,129,.1)' };
    }
  };

  const IconBtn = ({ onClick, color, icon, title, btnProps = {} }) => (
    <button onClick={onClick} title={title} {...btnProps} style={{
      width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1.5px solid ${color}22`, background: `${color}11`, color, cursor: 'pointer', fontSize: 13,
      transition: 'all .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}11`; e.currentTarget.style.color = color; }}>
      <FontAwesomeIcon icon={icon} />
    </button>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${P},${A})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
            <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Lịch tiêm chủng</h2>
            <div style={{ fontSize: 13, color: T2 }}>Tổng {total} lịch trong hệ thống</div>
          </div>
        </div>
        <a href="add-lich-tiem-chung" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
          color: '#fff', background: `linear-gradient(135deg,${P},${A})`,
          boxShadow: `0 4px 14px rgba(42,56,143,.3)`,
        }}>
          <FontAwesomeIcon icon={faPlus} /> Thêm lịch tiêm
        </a>
      </div>

      {/* ── filter ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        border: `1px solid ${B}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
          border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(0)}
            placeholder="Tìm theo tên vaccine..."
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }} />
          {search && <button onClick={() => { setSearch(''); load(0); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2 }}>
            <FontAwesomeIcon icon={faX} />
          </button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T2 }}>Từ:</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 10px', fontSize: 13.5, color: T, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T2 }}>Đến:</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 10px', fontSize: 13.5, color: T, outline: 'none' }} />
        </div>
        <button onClick={() => load(0)} style={{
          padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg,${P},${A})`, color: '#fff',
          fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <FontAwesomeIcon icon={faFilter} /> Lọc
        </button>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); load(0); }} style={{
            padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Xóa lọc</button>
        )}
      </div>

      {/* ── table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Vaccine','Trung tâm','Người tạo','Ngày tạo','Bắt đầu','Kết thúc','Giới hạn','Trạng thái','Hành động'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11.5,
                    fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '.4px',
                    borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 52, textAlign: 'center', color: T2 }}>Không có lịch tiêm nào</td></tr>
              ) : items.map((item, idx) => {
                const status = getStatus(item.startDate, item.endDate);
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', color: T2, fontWeight: 600, fontSize: 13 }}>{curPage * PAGE_SIZE + idx + 1}</td>
                    <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 700, color: T }}>{item.vaccine?.name || '—'}</span></td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `rgba(14,165,233,.08)`, color: A }}>{item.center?.centerName || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: T2, fontSize: 13 }}>{item.user?.email || '—'}</td>
                    <td style={{ padding: '12px 14px', color: T2, fontSize: 13 }}>{fmtDate(item.createdDate)}</td>
                    <td style={{ padding: '12px 14px', color: T2, fontSize: 13 }}>{fmtDate(item.startDate)}</td>
                    <td style={{ padding: '12px 14px', color: T2, fontSize: 13 }}>{fmtDate(item.endDate)}</td>
                    <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 800, color: P }}>{item.limitPeople}</span></td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                        background: status.bg,
                        color: status.color }}>
                        {status.text}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <a href={`add-lich-tiem-chung?id=${item.id}`} title="Sửa" style={{
                          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${W}22`, background: `${W}11`, color: W, textDecoration: 'none', fontSize: 13, transition: 'all .15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = W; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${W}11`; e.currentTarget.style.color = W; }}>
                          <FontAwesomeIcon icon={faEdit} />
                        </a>
                        <IconBtn onClick={() => handleDelete(item.id)} color={D} icon={faTrash} title="Xóa" />
                        <IconBtn onClick={() => setLichTiem(item)} color={S} icon={faClock} title="Giờ tiêm"
                          btnProps={{ 'data-bs-toggle': 'modal', 'data-bs-target': '#modalGioTiem' }} />
                        <IconBtn onClick={() => setLichTiem(item)} color={A} icon={faUsers} title="Bác sĩ / Ngày tiêm"
                          btnProps={{ 'data-bs-toggle': 'modal', 'data-bs-target': '#modalDoctorInjectdate' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: T2 }}>Trang {curPage + 1} / {pageCount} &nbsp;·&nbsp; Tổng {total} lịch</span>
            <ReactPaginate pageCount={pageCount} marginPagesDisplayed={1} pageRangeDisplayed={5}
              onPageChange={handlePageClick} forcePage={curPage}
              containerClassName="pg-s-lich" activeClassName="active" disabledClassName="disabled"
              previousLabel="← Trước" nextLabel="Sau →" />
          </div>
        )}
      </div>

      <AdminGioTiemChung lichtiem={lichTiem} />
      <AdminBacSiNgayTiem lichtiem={lichTiem} />
    </div>
  );
};

export default StaffLichTiemChung;
