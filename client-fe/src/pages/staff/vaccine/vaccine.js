import React, { useEffect, useState } from 'react';
import { VaccineApi } from '../../../services/staff/Vaccine.api';
import { ManufacturerApi } from '../../../services/staff/Manufacturer.api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSyringe, faPlus, faSearch, faX } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { AppNotification } from '../../../components/AppNotification';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';

const pgCSS = `
.pg-vac{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap;align-items:center}
.pg-vac button{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;background:#fff;transition:all .15s}
.pg-vac button:hover{border-color:#2A388F;color:#2A388F;background:#eff6ff}
.pg-vac button.active{background:linear-gradient(135deg,#2A388F,#0ea5e9);border-color:#2A388F;color:#fff}
.pg-vac button:disabled{opacity:.4;cursor:not-allowed}
`;

const formatMoney = (v) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '—';

const Vaccine = () => {
  const [total,       setTotal]       = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [vaccines,    setVaccines]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [formSearch,  setFormSearch]  = useState({ name: '', price: '', manufacturer: '', page: 1, limit: 10 });
  const [manufacturers, setManufacturers] = useState([]);

  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => { handleGetVaccines(formSearch); }, [formSearch]);
  useEffect(() => { handleGetVaccines({ ...formSearch, page: currentPage, limit: pageSize }); }, [currentPage, pageSize]);

  /* ─── Load danh sách nhà sản xuất 1 lần ─────────────────── */
  useEffect(() => {
    ManufacturerApi.manufacturers()
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        setManufacturers(list);
      })
      .catch(err => console.error('load manufacturers:', err));
  }, []);

  const handleGetVaccines = async (params) => {
    setLoading(true);
    try {
      const res = await VaccineApi.vaccines(params);
      setTotal(res.data.totalElements);
      setCurrentPage(res.data.pageable.pageNumber + 1);
      setPageSize(res.data.size);
      setVaccines(
        res.data.content.map((item, i) => ({ ...item, stt: (params.page - 1) * params.limit + i + 1 }))
      );
    } catch (err) { console.error(err); }
    finally { setTimeout(() => setLoading(false), 300); }
  };

  const handleDelete = async (id, name) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Xóa vaccine?', html: `Bạn có chắc muốn xóa <strong>${name}</strong>?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: D, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    VaccineApi.deleteVaccine({ id })
      .then(() => {
        setVaccines(v => v.filter(x => x.id !== id));
        AppNotification.success('Xóa thành công');
      })
      .catch(err => {
        const msg = err?.response?.data?.defaultMessage;
        AppNotification.error(msg || 'Xóa thất bại');
      });
  };


  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${P},${A})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
            <FontAwesomeIcon icon={faSyringe} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Quản lý Vaccine</h2>
            <div style={{ fontSize: 13, color: T2 }}>Tổng {total} vaccine trong hệ thống</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="add-vaccine" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
            color: '#fff', background: `linear-gradient(135deg,${P},${A})`,
            boxShadow: `0 4px 14px rgba(42,56,143,.3)`,
          }}>
            <FontAwesomeIcon icon={faPlus} /> Thêm mới
          </a>
        </div>
      </div>

      {/* ── filters ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 18,
        border: `1px solid ${B}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px' }}>
            <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
            <input placeholder="Tìm theo tên vaccine..."
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }}
              onChange={e => setFormSearch(f => ({ ...f, name: e.target.value, page: 1 }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${B}`, borderRadius: 9, padding: '7px 12px' }}>
            <input type="number" placeholder="Tìm theo giá..."
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: T, background: 'transparent' }}
              onChange={e => setFormSearch(f => ({ ...f, price: e.target.value, page: 1 }))} />
          </div>
          <select style={{ border: `1.5px solid ${B}`, borderRadius: 9, padding: '8px 12px', fontSize: 13.5, color: T, outline: 'none', background: '#fff' }}
            value={formSearch.manufacturer}
            onChange={e => setFormSearch(f => ({ ...f, manufacturer: e.target.value, page: 1 }))}>
            <option value="">Tất cả nhà sản xuất</option>
            {manufacturers.map(m => (
              <option key={m.id ?? m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Tên Vaccine','Giá','Loại','Nhà sản xuất','Độ tuổi','Ngày nhập','Trạng thái','Hành động'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
                    color: T2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : vaccines.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 52, textAlign: 'center', color: T2 }}>Không có vaccine nào</td></tr>
              ) : vaccines.map((item) => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 16px', color: T2, fontWeight: 600, fontSize: 13 }}>{item.stt}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: T }}>{item.nameVaccine || item.name}</div>
                      {item.status === 'INACTIVE' && (
                        <span style={{ fontSize: 11, color: D, background: `${D}11`, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>Ngừng kinh doanh</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: S, fontWeight: 700, fontSize: 13 }}>{formatMoney(item.price)}</td>
                  <td style={{ padding: '13px 16px' }}>
                    {item.vaccineType?.typeName ? (
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `rgba(42,56,143,.08)`, color: P }}>{item.vaccineType.typeName}</span>
                    ) : <span style={{ color: T2 }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', color: T2, fontSize: 13 }}>{item.manufacturer?.name || '—'}</td>
                  <td style={{ padding: '13px 16px', color: T2, fontSize: 13 }}>{item.ageGroup?.ageRange || '—'}</td>
                  <td style={{ padding: '13px 16px', color: T2, fontSize: 13 }}>
                    {item.createdDate ? dayjs(item.createdDate).format('DD/MM/YYYY') : '—'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                      background: item.status === 'ACTIVE' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                      color: item.status === 'ACTIVE' ? S : D }}>
                      {item.status === 'ACTIVE' ? 'Kinh doanh' : 'Ngừng kinh doanh'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`add-vaccine?id=${item.id}`} title="Sửa" style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${W}22`, background: `${W}11`, color: W, textDecoration: 'none', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = W; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${W}11`; e.currentTarget.style.color = W; }}>
                        <FontAwesomeIcon icon={faEdit} />
                      </a>
                      <button onClick={() => handleDelete(item.id, item.nameVaccine || item.name)} title="Xóa" style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${D}22`, background: `${D}11`, color: D, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = D; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${D}11`; e.currentTarget.style.color = D; }}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: T2 }}>
              Trang {currentPage} / {totalPages} &nbsp;·&nbsp; Tổng {total} vaccine
            </span>
            <div className="pg-vac">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Trước</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = totalPages <= 7 ? i + 1
                  : currentPage <= 4 ? i + 1
                  : currentPage >= totalPages - 3 ? totalPages - 6 + i
                  : currentPage - 3 + i;
                return (
                  <button key={page} className={currentPage === page ? 'active' : ''}
                    onClick={() => setCurrentPage(page)}>{page}</button>
                );
              })}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Sau →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vaccine;
