import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus, faEdit, faTrash, faLock, faUnlockAlt,
  faSearch, faUsers, faShieldAlt, faX, faUser,
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

const BASE = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(BASE + url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

/* ── role config ── */
const ROLE_MAP = {
  Admin:          { label: 'Quản trị viên', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  Doctor:         { label: 'Bác sĩ',        color: ACCENT,    bg: 'rgba(14,165,233,0.1)'  },
  Nurse:          { label: 'Y tá',           color: SUCCESS,   bg: 'rgba(16,185,129,0.1)'  },
  Customer:       { label: 'Khách hàng',     color: WARNING,   bg: 'rgba(245,158,11,0.1)'  },
  'Support Staff':{ label: 'Nhân viên HT',   color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
};
const ALL_ROLES = Object.keys(ROLE_MAP);

/* ── helpers ── */
function RoleBadge({ role }) {
  const cfg = ROLE_MAP[role] || { label: role, color: TEXT_2, bg: '#f1f5f9' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}
function Avatar({ name, email }) {
  const letter = (name || email || '?')[0].toUpperCase();
  const colors = ['#2A388F','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444'];
  const bg     = colors[(letter.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>
      {letter}
    </div>
  );
}
function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
function StyledInput(props) {
  return (
    <input {...props} style={{
      width: '100%', height: 42, padding: '0 12px', boxSizing: 'border-box',
      borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 14, color: TEXT,
      outline: 'none', fontFamily: 'inherit', background: '#fff',
      transition: 'border-color .15s, box-shadow .15s',
      ...props.style,
    }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(14,165,233,0.12)`; }}
      onBlur={e  => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none'; }}
    />
  );
}

/* ── Modal ── */
function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16,
        width: Math.min(width, window.innerWidth - 32), maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.22)' }}>
        <div style={{ background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
          padding: '16px 22px', borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none',
            color: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faX} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ */
const AdminUser = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  /* add modal */
  const [addOpen,  setAddOpen]  = useState(false);
  const [addForm,  setAddForm]  = useState({ fullname:'', email:'', phone:'', password:'', repassword:'' });
  const [addSaving, setAddSaving] = useState(false);
  const [addErrors, setAddErrors] = useState({});

  /* edit modal */
  const [editOpen,  setEditOpen]  = useState(false);
  const [editUser,  setEditUser]  = useState(null);
  const [editForm,  setEditForm]  = useState({ fullname:'', email:'', phone:'' });
  const [editSaving, setEditSaving] = useState(false);

  /* load */
  const loadUsers = async (role = '') => {
    setLoading(true);
    try {
      const url = '/api/user/admin/get-user-by-role' + (role ? `?role=${role}` : '');
      const res  = await authFetch(url);
      setItems(await res.json());
    } catch { toast.error('Không thể tải danh sách người dùng'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(''); }, []);

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    loadUsers(role);
  };

  /* filtered list */
  const filtered = items.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.email || '').toLowerCase().includes(q) || (u.fullname || '').toLowerCase().includes(q);
  });

  /* ── add account ── */
  const validateAdd = () => {
    const e = {};
    if (!addForm.fullname.trim()) e.fullname = 'Vui lòng nhập họ tên';
    if (!addForm.email.trim())    e.email    = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(addForm.email)) e.email = 'Email không hợp lệ';
    if (!addForm.phone.trim())    e.phone    = 'Vui lòng nhập số điện thoại';
    if (!addForm.password)        e.password = 'Vui lòng nhập mật khẩu';
    else if (addForm.password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự';
    if (addForm.password !== addForm.repassword) e.repassword = 'Mật khẩu không khớp';
    setAddErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddSubmit = async () => {
    if (!validateAdd()) return;
    setAddSaving(true);
    try {
      const res = await authFetch('/api/user/admin/addaccount', {
        method: 'POST',
        body: JSON.stringify({ fullname: addForm.fullname, email: addForm.email,
          phone: addForm.phone, password: addForm.password }),
      });
      const result = await res.json();
      if (res.status === 417) {
        toast.error(result.defaultMessage);
      } else if (res.ok) {
        toast.success('Tạo tài khoản thành công!');
        setAddOpen(false);
        setAddForm({ fullname:'', email:'', phone:'', password:'', repassword:'' });
        loadUsers(roleFilter);
      } else {
        toast.error(result.defaultMessage || 'Tạo tài khoản thất bại');
      }
    } catch { toast.error('Đã xảy ra lỗi'); }
    finally { setAddSaving(false); }
  };

  /* ── edit user ── */
  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ fullname: user.fullname || '', email: user.email || '', phone: user.phone || '' });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    setEditSaving(true);
    try {
      const res = await authFetch('/api/user/admin/all/update-infor', {
        method: 'POST',
        body: JSON.stringify({ id: editUser.id, ...editForm }),
      });
      if (res.ok) {
        toast.success('Cập nhật thành công!');
        setItems(prev => prev.map(u => u.id === editUser.id ? { ...u, ...editForm } : u));
        setEditOpen(false);
      } else {
        const d = await res.json();
        toast.error(d.message || 'Cập nhật thất bại');
      }
    } catch { toast.error('Đã xảy ra lỗi'); }
    finally { setEditSaving(false); }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Xóa tài khoản?', text: 'Hành động này không thể hoàn tác.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: DANGER, cancelButtonColor: TEXT_2,
      confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    const res = await authFetch(`/api/user/admin/delete?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Xóa thành công!'); setItems(p => p.filter(u => u.id !== id)); }
    else toast.error('Xóa thất bại');
  };

  /* ── lock/unlock ── */
  const handleLock = async (user) => {
    const { isConfirmed } = await Swal.fire({
      title: user.actived ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
      text: `Bạn có chắc muốn ${user.actived ? 'khóa' : 'mở khóa'} tài khoản này?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: user.actived ? DANGER : SUCCESS,
      confirmButtonText: user.actived ? 'Khóa' : 'Mở khóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    const res = await authFetch(`/api/user/admin/lockOrUnlockUser?id=${user.id}`, { method: 'POST' });
    if (res.ok) {
      toast.success(user.actived ? 'Đã khóa tài khoản' : 'Đã mở khóa');
      setItems(p => p.map(u => u.id === user.id ? { ...u, actived: !u.actived } : u));
    } else toast.error('Thất bại');
  };

  /* ── change role ── */
  const handleRoleChange = async (userId, newRole, oldRole, e) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Đổi quyền?', text: `${ROLE_MAP[oldRole]?.label || oldRole} → ${ROLE_MAP[newRole]?.label || newRole}`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: PRIMARY, confirmButtonText: 'Xác nhận', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) { e.target.value = oldRole; return; }
    const res = await authFetch(`/api/user/admin/change-role?id=${userId}&role=${newRole}`, { method: 'POST' });
    if (res.ok) {
      toast.success('Cập nhật quyền thành công!');
      setItems(p => p.map(u => u.id === userId ? { ...u, authorities: { ...u.authorities, name: newRole } } : u));
    } else { toast.error('Cập nhật thất bại'); e.target.value = oldRole; }
  };

  /* ── stats ── */
  const stats = ALL_ROLES.map(r => ({
    role: r, count: items.filter(u => u.authorities?.name === r).length,
  }));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(42,56,143,0.3)` }}>
            <FontAwesomeIcon icon={faUsers} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>Quản lý tài khoản</h2>
            <div style={{ fontSize: 13, color: TEXT_2 }}>Tổng {items.length} tài khoản trong hệ thống</div>
          </div>
        </div>
        <button onClick={() => { setAddForm({ fullname:'',email:'',phone:'',password:'',repassword:'' }); setAddErrors({}); setAddOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            color: '#fff', background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
            boxShadow: `0 4px 14px rgba(42,56,143,0.3)` }}>
          <FontAwesomeIcon icon={faUserPlus} /> Thêm tài khoản
        </button>
      </div>

      {/* ── role stat chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => handleRoleFilter('')} style={{
          padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 13,
          border: `2px solid ${roleFilter === '' ? PRIMARY : BORDER}`,
          background: roleFilter === '' ? `rgba(42,56,143,0.08)` : '#fff',
          color: roleFilter === '' ? PRIMARY : TEXT_2,
        }}>
          Tất cả ({items.length})
        </button>
        {stats.map(s => {
          const cfg = ROLE_MAP[s.role];
          const active = roleFilter === s.role;
          return (
            <button key={s.role} onClick={() => handleRoleFilter(s.role)} style={{
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              border: `2px solid ${active ? cfg.color : BORDER}`,
              background: active ? cfg.bg : '#fff',
              color: active ? cfg.color : TEXT_2,
            }}>
              {cfg.label} ({s.count})
            </button>
          );
        })}
      </div>

      {/* ── search + table card ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {/* search bar */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 14, flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo email hoặc họ tên..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: TEXT, background: 'transparent' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_2 }}>
              <FontAwesomeIcon icon={faX} />
            </button>
          )}
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Người dùng', 'Email', 'Số ĐT', 'Ngày tạo', 'Quyền', 'Trạng thái', 'Hành động'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: TEXT_2, textTransform: 'uppercase',
                    letterSpacing: '0.4px', borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: TEXT_2 }}>
                  Đang tải...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: TEXT_2 }}>
                  Không tìm thấy tài khoản
                </td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* user */}
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={user.fullname} email={user.email} />
                      <div>
                        <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>
                          {user.fullname || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: TEXT_2 }}>#{user.id}</div>
                      </div>
                    </div>
                  </td>
                  {/* email */}
                  <td style={{ padding: '12px 18px', color: TEXT_2, fontSize: 13.5 }}>{user.email}</td>
                  {/* phone */}
                  <td style={{ padding: '12px 18px', color: TEXT_2, fontSize: 13.5 }}>{user.phone || '—'}</td>
                  {/* created */}
                  <td style={{ padding: '12px 18px', color: TEXT_2, fontSize: 13 }}>
                    {user.createdDate ? user.createdDate.split('T')[0] : '—'}
                  </td>
                  {/* role select */}
                  <td style={{ padding: '12px 18px' }}>
                    <select
                      value={user.authorities?.name || ''}
                      onChange={e => handleRoleChange(user.id, e.target.value, user.authorities?.name, e)}
                      style={{
                        padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${BORDER}`,
                        fontSize: 12.5, fontWeight: 700, cursor: 'pointer', outline: 'none',
                        color: ROLE_MAP[user.authorities?.name]?.color || TEXT_2,
                        background: ROLE_MAP[user.authorities?.name]?.bg || '#f8fafc',
                      }}
                    >
                      {ALL_ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_MAP[r]?.label || r}</option>
                      ))}
                    </select>
                  </td>
                  {/* status */}
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: user.actived ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: user.actived ? SUCCESS : DANGER,
                    }}>
                      {user.actived ? '● Hoạt động' : '● Đã khóa'}
                    </span>
                  </td>
                  {/* actions */}
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      <ActionBtn icon={faEdit} color={WARNING} title="Sửa" onClick={() => openEdit(user)} />
                      <ActionBtn icon={faTrash} color={DANGER} title="Xóa" onClick={() => handleDelete(user.id)} />
                      <ActionBtn
                        icon={user.actived ? faLock : faUnlockAlt}
                        color={user.actived ? '#64748b' : SUCCESS}
                        title={user.actived ? 'Khóa' : 'Mở khóa'}
                        onClick={() => handleLock(user)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Modal Thêm tài khoản ══ */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="➕ Thêm tài khoản mới">
        <FieldRow label="Họ và tên *">
          <StyledInput placeholder="Nguyễn Văn A" value={addForm.fullname}
            onChange={e => setAddForm(f => ({...f, fullname: e.target.value}))} />
          {addErrors.fullname && <ErrMsg msg={addErrors.fullname} />}
        </FieldRow>
        <FieldRow label="Email *">
          <StyledInput type="email" placeholder="example@gmail.com" value={addForm.email}
            onChange={e => setAddForm(f => ({...f, email: e.target.value}))} />
          {addErrors.email && <ErrMsg msg={addErrors.email} />}
        </FieldRow>
        <FieldRow label="Số điện thoại *">
          <StyledInput placeholder="0909 123 456" value={addForm.phone}
            onChange={e => setAddForm(f => ({...f, phone: e.target.value}))} />
          {addErrors.phone && <ErrMsg msg={addErrors.phone} />}
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FieldRow label="Mật khẩu *">
            <StyledInput type="password" placeholder="••••••" value={addForm.password}
              onChange={e => setAddForm(f => ({...f, password: e.target.value}))} />
            {addErrors.password && <ErrMsg msg={addErrors.password} />}
          </FieldRow>
          <FieldRow label="Xác nhận mật khẩu *">
            <StyledInput type="password" placeholder="••••••" value={addForm.repassword}
              onChange={e => setAddForm(f => ({...f, repassword: e.target.value}))} />
            {addErrors.repassword && <ErrMsg msg={addErrors.repassword} />}
          </FieldRow>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => setAddOpen(false)} style={cancelBtnStyle}>Hủy</button>
          <button onClick={handleAddSubmit} disabled={addSaving} style={submitBtnStyle(addSaving)}>
            {addSaving ? 'Đang lưu...' : '✓ Tạo tài khoản'}
          </button>
        </div>
      </Modal>

      {/* ══ Modal Sửa tài khoản ══ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="✏️ Cập nhật thông tin">
        {editUser && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: '#f8fafc', borderRadius: 10, marginBottom: 20, border: `1px solid ${BORDER}` }}>
              <Avatar name={editUser.fullname} email={editUser.email} />
              <div>
                <div style={{ fontWeight: 700, color: TEXT }}>{editUser.fullname || editUser.email}</div>
                <RoleBadge role={editUser.authorities?.name} />
              </div>
            </div>
            <FieldRow label="Họ và tên">
              <StyledInput value={editForm.fullname}
                onChange={e => setEditForm(f => ({...f, fullname: e.target.value}))} />
            </FieldRow>
            <FieldRow label="Email">
              <StyledInput type="email" value={editForm.email}
                onChange={e => setEditForm(f => ({...f, email: e.target.value}))} />
            </FieldRow>
            <FieldRow label="Số điện thoại">
              <StyledInput value={editForm.phone}
                onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} />
            </FieldRow>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button onClick={() => setEditOpen(false)} style={cancelBtnStyle}>Hủy</button>
              <button onClick={handleEditSubmit} disabled={editSaving} style={submitBtnStyle(editSaving)}>
                {editSaving ? 'Đang lưu...' : '✓ Lưu thay đổi'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

/* ── small helpers ── */
function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${color}22`,
      background: `${color}11`, color, cursor: 'pointer', fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}11`; e.currentTarget.style.color = color; }}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}
function ErrMsg({ msg }) {
  return <div style={{ color: DANGER, fontSize: 12, marginTop: 4 }}>⚠ {msg}</div>;
}
const cancelBtnStyle = {
  padding: '9px 20px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
  background: '#fff', color: TEXT_2, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
};
const submitBtnStyle = (disabled) => ({
  padding: '9px 24px', borderRadius: 9, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#94a3b8' : `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
  color: '#fff', fontSize: 13.5, fontWeight: 700,
  boxShadow: disabled ? 'none' : `0 4px 14px rgba(42,56,143,0.3)`,
});

export default AdminUser;
