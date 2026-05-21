import { useState, useEffect, useRef } from 'react';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { getMethod, deleteMethod, putMethod, uploadSingleFile } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserMd, faSearch, faEdit, faTrash, faEye, faX,
  faStar, faBriefcase, faUserNurse,
} from '@fortawesome/free-solid-svg-icons';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';
const PAGE_SIZE = 10;

const pgCSS = `
.pg-emp{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.pg-emp li a{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s}
.pg-emp li a:hover{border-color:#2A388F;color:#2A388F;background:#eff6ff}
.pg-emp li.active a{background:linear-gradient(135deg,#2A388F,#0ea5e9);border-color:#2A388F;color:#fff}
.pg-emp li.disabled a{opacity:.4;cursor:not-allowed}
`;

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
const Employee = () => {
  const [activeTab,   setActiveTab]   = useState('doctors');
  const [items,       setItems]       = useState([]);
  const [pageCount,   setPageCount]   = useState(0);
  const [curPage,     setCurPage]     = useState(0);
  const [total,       setTotal]       = useState(0);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [loading,     setLoading]     = useState(true);

  const [showDetail,  setShowDetail]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [editItem,    setEditItem]    = useState(null);

  const avatarRef = useRef(null);

  const isDoctors = activeTab === 'doctors';

  useEffect(() => { setCurPage(0); loadData(0); }, [activeTab, searchTerm]);

  const loadData = async (page) => {
    setLoading(true);
    try {
      const base = isDoctors ? '/api/doctor/admin/list-doctor' : '/api/nurse/admin/list-nurse';
      const url  = `${base}?page=${page}&size=${PAGE_SIZE}&sort=id,asc${searchTerm ? '&q=' + encodeURIComponent(searchTerm) : ''}`;
      const res  = await getMethod(url);
      const data = await res.json();
      setItems(data.content || []);
      setPageCount(data.totalPages || 0);
      setTotal(data.totalElements || 0);
      setCurPage(page);
    } catch { toast.error('Có lỗi khi tải dữ liệu'); }
    finally  { setLoading(false); }
  };

  const handlePageClick = ({ selected }) => loadData(selected);

  const handleDelete = async (id, name) => {
    const { isConfirmed } = await Swal.fire({
      title: `Xóa ${isDoctors ? 'bác sĩ' : 'y tá'}?`,
      html: `Bạn có chắc muốn xóa <strong>${name}</strong>?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: D, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    const baseUrl = isDoctors ? `/api/doctor/admin/delete/${id}` : `/api/nurse/admin/delete/${id}`;
    const res = await deleteMethod(baseUrl);
    if (res.status < 300)       { toast.success('Xóa thành công!'); loadData(0); }
    else if (res.status === 417){ const d = await res.json(); toast.warning(d.defaultMessage); }
    else                         toast.error('Có lỗi khi xóa');
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    if (avatarRef.current?.files.length > 0) {
      const url = await uploadSingleFile(avatarRef.current);
      if (url) editItem.avatar = url;
    }
    const baseUrl = isDoctors
      ? `/api/doctor/admin/update/${editItem.id}`
      : `/api/nurse/admin/update/${editItem.id}`;
    const res = await putMethod(baseUrl, editItem);
    if (res.status < 300) {
      toast.success('Cập nhật thành công!');
      loadData(curPage);
      setShowEdit(false);
    } else {
      const d = await res.json();
      toast.error(d.defaultMessage || 'Có lỗi xảy ra');
    }
  };

  const tabConfig = [
    { key: 'doctors', label: 'Bác sĩ', icon: faUserMd, color: P },
    { key: 'nurses',  label: 'Y tá',   icon: faUserNurse, color: S },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg,${P},${A})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
          <FontAwesomeIcon icon={faUserMd} style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Nhân viên y tế</h2>
          <div style={{ fontSize: 13, color: T2 }}>Quản lý bác sĩ và y tá</div>
        </div>
      </div>

      {/* ── tabs ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {tabConfig.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '9px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all .15s',
            background: activeTab === tab.key
              ? `linear-gradient(135deg,${tab.color},${tab.color}cc)`
              : '#fff',
            color: activeTab === tab.key ? '#fff' : T2,
            boxShadow: activeTab === tab.key
              ? `0 4px 12px ${tab.color}44`
              : `0 1px 4px rgba(0,0,0,.06)`,
            border: activeTab === tab.key ? 'none' : `1px solid ${B}`,
          }}>
            <FontAwesomeIcon icon={tab.icon} />
            {tab.label}
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
              background: activeTab === tab.key ? 'rgba(255,255,255,.25)' : `rgba(42,56,143,.08)`,
              color: activeTab === tab.key ? '#fff' : P,
            }}>{activeTab === tab.key ? total : ''}</span>
          </button>
        ))}
      </div>

      {/* ── table card ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        {/* search */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${B}`,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 14, flexShrink: 0 }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Tìm ${isDoctors ? 'bác sĩ' : 'y tá'} theo tên, email...`}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: T, background: 'transparent' }} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2 }}>
              <FontAwesomeIcon icon={faX} />
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', isDoctors ? 'Bác sĩ' : 'Y tá',
                  isDoctors ? 'Chuyên môn' : 'Trình độ',
                  'Kinh nghiệm', 'Mô tả', 'Hành động'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '.4px',
                    borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 52, textAlign: 'center', color: T2 }}>
                  {searchTerm ? `Không tìm thấy "${searchTerm}"` : `Chưa có ${isDoctors ? 'bác sĩ' : 'y tá'} nào`}
                </td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id}
                  style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 18px', color: T2, fontWeight: 600, fontSize: 13 }}>
                    {curPage * PAGE_SIZE + idx + 1}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.avatar
                        ? <img src={item.avatar} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                        : <Avatar name={item.fullName} />
                      }
                      <div>
                        <div style={{ fontWeight: 700, color: T }}>{item.fullName}</div>
                        {item.email && <div style={{ fontSize: 12, color: T2 }}>{item.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    {(isDoctors ? item.specialization : item.qualification) ? (
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `rgba(42,56,143,.08)`, color: P }}>
                        {isDoctors ? item.specialization : item.qualification}
                      </span>
                    ) : <span style={{ color: T2 }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    {item.experienceYears != null ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontWeight: 700, color: W, fontSize: 13.5 }}>
                        <FontAwesomeIcon icon={faStar} style={{ fontSize: 11 }} />
                        {item.experienceYears} năm
                      </span>
                    ) : <span style={{ color: T2 }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 18px', color: T2, fontSize: 13,
                    maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.bio || '—'}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setSelected(item); setShowDetail(true); }} title="Xem chi tiết" style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${A}22`, background: `${A}11`, color: A, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${A}11`; e.currentTarget.style.color = A; }}>
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button onClick={() => { setEditItem({ ...item }); setShowEdit(true); }} title="Sửa" style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${W}22`, background: `${W}11`, color: W, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = W; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${W}11`; e.currentTarget.style.color = W; }}>
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.fullName)} title="Xóa" style={{
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
        {pageCount > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: T2 }}>
              Trang {curPage + 1} / {pageCount} &nbsp;·&nbsp; Tổng {total} {isDoctors ? 'bác sĩ' : 'y tá'}
            </span>
            <ReactPaginate
              pageCount={pageCount} marginPagesDisplayed={1} pageRangeDisplayed={5}
              onPageChange={handlePageClick} forcePage={curPage}
              containerClassName="pg-emp"
              activeClassName="active" disabledClassName="disabled"
              previousLabel="← Trước" nextLabel="Sau →"
            />
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <ModalOverlay open={showDetail} onClose={() => setShowDetail(false)}
        title={`Chi tiết ${isDoctors ? 'bác sĩ' : 'y tá'}`} size={540}
        footer={
          <button onClick={() => setShowDetail(false)} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Đóng</button>
        }>
        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
              padding: '16px 18px', background: '#f8fafc', borderRadius: 12 }}>
              {selected.avatar
                ? <img src={selected.avatar} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover' }} />
                : <div style={{ width: 64, height: 64, borderRadius: 14, fontSize: 22, fontWeight: 800,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg,${P},${A})` }}>
                    {(selected.fullName || '?')[0].toUpperCase()}
                  </div>
              }
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: T }}>{selected.fullName}</div>
                <div style={{ fontSize: 13, color: T2, marginTop: 4 }}>
                  {isDoctors ? selected.specialization : selected.qualification}
                </div>
                {selected.experienceYears != null && (
                  <div style={{ fontSize: 12, color: W, fontWeight: 700, marginTop: 3 }}>
                    ⭐ {selected.experienceYears} năm kinh nghiệm
                  </div>
                )}
              </div>
            </div>
            {[
              ['Email', selected.email],
              ['Điện thoại', selected.phone],
              [isDoctors ? 'Chuyên môn' : 'Trình độ', isDoctors ? selected.specialization : selected.qualification],
              ['Mô tả', selected.bio],
            ].map(([k, v]) => v ? (
              <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${B}` }}>
                <span style={{ minWidth: 120, fontSize: 13, fontWeight: 700, color: T2 }}>{k}</span>
                <span style={{ fontSize: 13.5, color: T, flex: 1 }}>{v}</span>
              </div>
            ) : null)}
          </div>
        )}
      </ModalOverlay>

      {/* ── Edit Modal ── */}
      <ModalOverlay open={showEdit} onClose={() => setShowEdit(false)}
        title={`Cập nhật ${isDoctors ? 'bác sĩ' : 'y tá'}: ${editItem?.fullName || ''}`} size={560}
        footer={<>
          <button onClick={() => setShowEdit(false)} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Hủy</button>
          <button onClick={handleUpdate} style={{
            padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${P},${A})`, color: '#fff', fontWeight: 700, fontSize: 14,
          }}>Cập nhật</button>
        </>}>
        {editItem && (
          <div>
            <Field label="Họ tên" required>
              <input style={inpStyle(false)} value={editItem.fullName || ''}
                onChange={e => setEditItem({ ...editItem, fullName: e.target.value })} />
            </Field>
            <Field label={isDoctors ? 'Chuyên môn' : 'Trình độ'}>
              <input style={inpStyle(false)}
                value={isDoctors ? (editItem.specialization || '') : (editItem.qualification || '')}
                onChange={e => setEditItem(isDoctors
                  ? { ...editItem, specialization: e.target.value }
                  : { ...editItem, qualification: e.target.value }
                )} />
            </Field>
            <Field label="Năm kinh nghiệm">
              <input type="number" min={0} style={inpStyle(false)} value={editItem.experienceYears ?? ''}
                onChange={e => setEditItem({ ...editItem, experienceYears: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="Mô tả">
              <textarea rows={3} style={{ ...inpStyle(false), resize: 'vertical' }}
                value={editItem.bio || ''}
                onChange={e => setEditItem({ ...editItem, bio: e.target.value })} />
            </Field>
            <Field label="Ảnh đại diện">
              <input type="file" ref={avatarRef} accept="image/*" style={{ ...inpStyle(false), padding: '7px 12px' }} />
              {editItem.avatar && (
                <img src={editItem.avatar} alt="Avatar" style={{ maxWidth: 120, marginTop: 10, borderRadius: 10 }} />
              )}
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: `rgba(42,56,143,.05)`, borderRadius: 10 }}>
              <FontAwesomeIcon icon={faBriefcase} style={{ color: P, fontSize: 13 }} />
              <span style={{ fontSize: 13, color: T2 }}>
                ID: <strong style={{ color: T }}>{editItem.id}</strong>
              </span>
            </div>
          </div>
        )}
      </ModalOverlay>
    </div>
  );
};

export default Employee;
