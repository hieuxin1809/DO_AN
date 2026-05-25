import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import { getMethod, deleteMethod, postMethodPayload } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faLayerGroup,
  faSearch, faCheckCircle, faX, faTag, faSave,
} from '@fortawesome/free-solid-svg-icons';

/* ── tokens ── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const WARNING = '#f59e0b';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const PAGE_SIZE = 10;

const paginationCSS = `
.admin-dm-pagination { display:flex; gap:6px; list-style:none; padding:0; margin:0; flex-wrap:wrap; justify-content:flex-end; }
.admin-dm-pagination li a {
  display:flex; align-items:center; justify-content:center;
  min-width:34px; height:34px; padding:0 10px;
  border-radius:8px; border:1.5px solid #e2e8f0;
  color:#64748b; font-size:13px; font-weight:600;
  cursor:pointer; text-decoration:none; transition:all .15s;
}
.admin-dm-pagination li a:hover { border-color:#2A388F; color:#2A388F; background:#eff6ff; }
.admin-dm-pagination li.active a { background:linear-gradient(135deg,#2A388F,#0ea5e9); border-color:#2A388F; color:#fff; }
.admin-dm-pagination li.disabled a { opacity:0.4; cursor:not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
`;

const AdminDanhMuc = () => {
  const [items,     setItems]     = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [curPage,   setCurPage]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [total,     setTotal]     = useState(0);
  const [parents,   setParents]   = useState([]);  // danh mục chính (cho dropdown cha)

  /* ── modal state ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState({ typeName: '', isPrimary: false, parent: null });
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState({});

  /* ── fetch ── */
  const fetchPage = async (page = 0) => {
    setLoading(true);
    try {
      const url  = `/api/vaccine-type/find-all-admin?size=${PAGE_SIZE}&sort=isPrimary,desc&page=${page}`;
      const res  = await getMethod(url);
      const data = await res.json();
      setItems(data.content || []);
      setPageCount(data.totalPages || 0);
      setTotal(data.totalElements || 0);
    } catch { toast.error('Không thể tải danh mục'); }
    finally { setLoading(false); }
  };

  const fetchParents = async () => {
    try {
      const res = await getMethod('/api/vaccine-type/find-primary');
      setParents(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchPage(0); fetchParents(); }, []);

  const handlePageClick = ({ selected }) => {
    setCurPage(selected);
    fetchPage(selected);
  };

  /* ── delete ── */
  const handleDelete = async (id, name) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Xóa danh mục?',
      html: `Bạn có chắc muốn xóa <strong>${name}</strong>? Hành động này không thể hoàn tác.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: DANGER, cancelButtonColor: TEXT_2,
      confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    const res = await deleteMethod(`/api/vaccine-type/delete?id=${id}`);
    if (res.status < 300) { toast.success('Xóa thành công!'); fetchPage(curPage); }
    else if (res.status === 417) {
      const d = await res.json();
      toast.warning(d.defaultMessage || 'Không thể xóa danh mục này');
    } else toast.error('Xóa thất bại');
  };

  /* ── add / edit modal ── */
  const openAdd = () => {
    setEditId(null);
    setForm({ typeName: '', isPrimary: false, parent: null });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      typeName: item.typeName || '',
      isPrimary: !!item.isPrimary,
      parent: item.vaccineType || null,
    });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setSaving(false); };

  const validate = () => {
    const e = {};
    if (!form.typeName.trim()) e.typeName = 'Vui lòng nhập tên danh mục';
    else if (form.typeName.trim().length < 2) e.typeName = 'Tên quá ngắn (≥2 ký tự)';
    if (!form.isPrimary && !form.parent) e.parent = 'Danh mục con phải chọn danh mục cha';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const obj = {
        id: editId,
        typeName: form.typeName.trim(),
        isPrimary: form.isPrimary,
      };
      if (form.parent && !form.isPrimary) obj.vaccineType = { id: form.parent.id };

      const res = await postMethodPayload('/api/vaccine-type/add', obj);
      if (res.status < 300) {
        toast.success(editId ? 'Cập nhật thành công!' : 'Thêm danh mục thành công!');
        closeModal();
        fetchPage(curPage);
        fetchParents();
      } else if (res.status === 417) {
        const d = await res.json();
        toast.warning(d.defaultMessage || 'Lưu thất bại');
      } else toast.error('Lưu thất bại');
    } catch { toast.error('Đã xảy ra lỗi'); }
    finally { setSaving(false); }
  };

  /* ── filtered (client-side search) ── */
  const filtered = search
    ? items.filter(i => (i.typeName || '').toLowerCase().includes(search.toLowerCase()))
    : items;

  /* ── stats ── */
  const primaryCount = items.filter(i => i.isPrimary).length;
  const childCount   = items.filter(i => !i.isPrimary).length;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <style>{paginationCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(42,56,143,0.3)` }}>
            <FontAwesomeIcon icon={faLayerGroup} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>Quản lý danh mục</h2>
            <div style={{ fontSize: 13, color: TEXT_2 }}>Phân loại vaccine theo nhóm</div>
          </div>
        </div>
        <button onClick={openAdd} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
          border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          color: '#fff', background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
          boxShadow: `0 4px 14px rgba(42,56,143,0.3)`,
        }}>
          <FontAwesomeIcon icon={faPlus} /> Thêm danh mục
        </button>
      </div>

      {/* ── stat chips ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatChip label="Tổng danh mục" value={total} color={PRIMARY} />
        <StatChip label="Danh mục chính" value={primaryCount} color={SUCCESS} icon={faCheckCircle} />
        <StatChip label="Danh mục con" value={childCount} color={WARNING} icon={faTag} />
      </div>

      {/* ── table card ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 14, flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên danh mục..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: TEXT, background: 'transparent' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_2, padding: 4 }}>
              <FontAwesomeIcon icon={faX} />
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Tên danh mục', 'Phân loại', 'Danh mục cha', 'Hành động'].map(h => (
                  <th key={h} style={{
                    padding: '12px 18px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: TEXT_2, textTransform: 'uppercase',
                    letterSpacing: '0.4px', borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 52, textAlign: 'center', color: TEXT_2 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`,
                      borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                    Đang tải...
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 52, textAlign: 'center', color: TEXT_2 }}>
                  {search ? `Không tìm thấy danh mục "${search}"` : 'Chưa có danh mục nào'}
                </td></tr>
              ) : filtered.map((item, idx) => (
                <tr key={item.id}
                  style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 18px', color: TEXT_2, fontWeight: 600, fontSize: 13 }}>
                    {curPage * PAGE_SIZE + idx + 1}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: item.isPrimary ? `rgba(42,56,143,0.1)` : `rgba(14,165,233,0.1)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesomeIcon icon={faLayerGroup}
                          style={{ color: item.isPrimary ? PRIMARY : ACCENT, fontSize: 13 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: TEXT }}>{item.typeName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {item.isPrimary ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: 'rgba(16,185,129,0.1)', color: SUCCESS }}>
                        <FontAwesomeIcon icon={faCheckCircle} /> Danh mục chính
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: 'rgba(14,165,233,0.08)', color: ACCENT }}>
                        <FontAwesomeIcon icon={faTag} /> Danh mục con
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {item.vaccineType ? (
                      <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 12.5,
                        fontWeight: 600, background: '#f1f5f9', color: TEXT_2 }}>
                        {item.vaccineType.typeName}
                      </span>
                    ) : (
                      <span style={{ color: TEXT_2, fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button title="Sửa" onClick={() => openEdit(item)} style={{
                        width: 34, height: 34, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${WARNING}22`, background: `${WARNING}11`,
                        color: WARNING, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = WARNING; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${WARNING}11`; e.currentTarget.style.color = WARNING; }}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button title="Xóa" onClick={() => handleDelete(item.id, item.typeName)} style={{
                        width: 34, height: 34, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${DANGER}22`, background: `${DANGER}11`,
                        color: DANGER, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = DANGER; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${DANGER}11`; e.currentTarget.style.color = DANGER; }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: TEXT_2 }}>
              Trang {curPage + 1} / {pageCount} &nbsp;·&nbsp; Tổng {total} danh mục
            </span>
            <ReactPaginate
              pageCount={pageCount}
              marginPagesDisplayed={1}
              pageRangeDisplayed={5}
              onPageChange={handlePageClick}
              forcePage={curPage}
              containerClassName="admin-dm-pagination"
              activeClassName="active"
              disabledClassName="disabled"
              previousLabel="← Trước"
              nextLabel="Sau →"
            />
          </div>
        )}
      </div>

      {/* ══ Modal Thêm / Sửa danh mục ══ */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(3px)' }} onClick={closeModal} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 16,
            width: '100%', maxWidth: 480, boxShadow: '0 24px 48px rgba(0,0,0,0.22)' }}>

            {/* header gradient */}
            <div style={{
              background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
              padding: '16px 22px', borderRadius: '16px 16px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 15,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={editId ? faEdit : faPlus} />
                {editId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </span>
              <button onClick={closeModal} style={{
                background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
                borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>

            {/* body */}
            <div style={{ padding: 24 }}>
              {/* Tên */}
              <FieldRow label="Tên danh mục" required>
                <StyledInput value={form.typeName}
                  onChange={e => setForm(f => ({ ...f, typeName: e.target.value }))}
                  placeholder="VD: Vaccine 6in1, Vaccine cúm..." autoFocus />
                {errors.typeName && <ErrMsg msg={errors.typeName} />}
              </FieldRow>

              {/* Phân loại */}
              <FieldRow label="Phân loại">
                <div style={{ display: 'flex', gap: 12 }}>
                  <RadioCard
                    selected={form.isPrimary}
                    color={SUCCESS}
                    icon={faCheckCircle}
                    title="Danh mục chính"
                    onClick={() => setForm(f => ({ ...f, isPrimary: true, parent: null }))}
                  />
                  <RadioCard
                    selected={!form.isPrimary}
                    color={ACCENT}
                    icon={faTag}
                    title="Danh mục con"
                    desc="Thuộc 1 danh mục cha"
                    onClick={() => setForm(f => ({ ...f, isPrimary: false }))}
                  />
                </div>
              </FieldRow>

              {/* Danh mục cha — chỉ hiện khi là con */}
              {!form.isPrimary && (
                <FieldRow label="Danh mục cha" required>
                  <Select
                    options={parents}
                    value={form.parent}
                    onChange={p => setForm(f => ({ ...f, parent: p }))}
                    getOptionLabel={(o) => o.typeName}
                    getOptionValue={(o) => o.id}
                    placeholder="Chọn danh mục cha"
                    isClearable
                    styles={{
                      control: (base, s) => ({
                        ...base, minHeight: 42, borderRadius: 10,
                        borderColor: errors.parent ? DANGER : (s.isFocused ? ACCENT : BORDER),
                        boxShadow: s.isFocused ? `0 0 0 3px ${ACCENT}33` : 'none',
                        '&:hover': { borderColor: ACCENT },
                      }),
                    }}
                  />
                  {errors.parent && <ErrMsg msg={errors.parent} />}
                </FieldRow>
              )}

              {/* footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button onClick={closeModal} style={btnSecondary}>Hủy</button>
                <button onClick={handleSave} disabled={saving} style={btnPrimary(saving)}>
                  <FontAwesomeIcon icon={faSave} /> {saving ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── helpers ─── */
function StatChip({ label, value, color, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', background: '#fff', borderRadius: 10,
      border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {icon && <FontAwesomeIcon icon={icon} style={{ color, fontSize: 13 }} />}
      {!icon && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />}
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 12.5, color: TEXT_2 }}>{label}</span>
    </div>
  );
}

function FieldRow({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7 }}>
        {label}{required && <span style={{ color: DANGER, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StyledInput({ ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props} style={{
      width: '100%', boxSizing: 'border-box', padding: '11px 14px',
      borderRadius: 10, border: `1.5px solid ${focused ? ACCENT : BORDER}`,
      background: '#fff', fontSize: 14, color: TEXT, outline: 'none',
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: focused ? `0 0 0 3px ${ACCENT}33` : 'none',
      ...props.style,
    }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function RadioCard({ selected, color, icon, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
      background: selected ? `${color}10` : '#fff',
      border: `2px solid ${selected ? color : BORDER}`,
      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
      transition: 'all .15s', boxShadow: selected ? `0 2px 8px ${color}22` : 'none',
    }}>
      <FontAwesomeIcon icon={icon} style={{ color, fontSize: 18, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? color : TEXT }}>{title}</div>
        <div style={{ fontSize: 11.5, color: TEXT_2, marginTop: 1 }}>{desc}</div>
      </div>
    </button>
  );
}

function ErrMsg({ msg }) {
  return <div style={{ color: DANGER, fontSize: 12, marginTop: 4 }}>⚠ {msg}</div>;
}

const btnSecondary = {
  padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
  background: '#fff', color: TEXT_2, fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
};
const btnPrimary = (disabled) => ({
  padding: '10px 22px', borderRadius: 10, border: 'none',
  background: disabled ? '#94a3b8' : `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
  color: '#fff', fontWeight: 700, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 8,
  boxShadow: disabled ? 'none' : `0 4px 14px rgba(42,56,143,0.3)`,
});

export default AdminDanhMuc;
