import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus, faEdit, faTrash, faLock, faUnlockAlt,
  faSearch, faUsers, faX, faChevronDown, faUserMd, faUserNurse, faUser, faCamera,
} from '@fortawesome/free-solid-svg-icons';
import { uploadSingleFile } from '../../services/request';

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
  const cfg = ROLE_MAP[role] || { label: role || '—', color: TEXT_2, bg: '#f1f5f9' };
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}
function Avatar({ name, email, src }) {
  if (src) {
    return (
      <img src={src} alt="" style={{
        width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
        flexShrink: 0, border: `2px solid ${BORDER}`,
      }} />
    );
  }
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
    <div style={{ marginBottom: 14 }}>
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
function StyledTextarea(props) {
  return (
    <textarea {...props} style={{
      width: '100%', minHeight: 70, padding: '10px 12px', boxSizing: 'border-box',
      borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 14, color: TEXT,
      outline: 'none', fontFamily: 'inherit', background: '#fff', resize: 'vertical',
      ...props.style,
    }} />
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

/* ── Avatar uploader ── */
function AvatarUpload({ src, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleChange = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const link = await uploadSingleFile(fileRef.current);
      if (link) onUploaded(link);
      else toast.error('Tải ảnh thất bại');
    } catch { toast.error('Tải ảnh thất bại'); }
    finally { setUploading(false); }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
      <div style={{ position: 'relative' }}>
        {src
          ? <img src={src} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${ACCENT}` }} />
          : <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px dashed ${BORDER}`, color: TEXT_2 }}>
              <FontAwesomeIcon icon={faUser} style={{ fontSize: 28 }} />
            </div>
        }
        <button type="button" onClick={() => fileRef.current?.click()} title="Tải ảnh"
          style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 30, height: 30, borderRadius: '50%',
            border: '2.5px solid #fff', background: ACCENT, color: '#fff',
            cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <FontAwesomeIcon icon={faCamera} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
      </div>
      <div style={{ fontSize: 13, color: TEXT_2 }}>
        {uploading ? 'Đang tải ảnh...' : 'Nhấn nút camera để chọn ảnh đại diện'}
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

  /* dropdown thêm tài khoản */
  const [addMenu, setAddMenu] = useState(false);
  const addMenuRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* modal state — phân biệt theo role đang tạo */
  const [createRole, setCreateRole]   = useState(null);   // 'Customer' | 'Doctor' | 'Nurse' | null
  const [form,       setForm]         = useState({});
  const [errors,     setErrors]       = useState({});
  const [saving,     setSaving]       = useState(false);

  /* edit modal */
  const [editOpen,   setEditOpen]    = useState(false);
  const [editUser,   setEditUser]    = useState(null);
  const [editForm,   setEditForm]    = useState({ phoneNumber: '', email: '' });
  const [editSaving, setEditSaving]  = useState(false);

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

  const handleRoleFilter = (role) => { setRoleFilter(role); loadUsers(role); };

  /* filtered list */
  const filtered = items.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.email || '').toLowerCase().includes(q);
  });

  /* ─── Mở modal tạo theo role ─── */
  const openCreate = (role) => {
    setAddMenu(false);
    setCreateRole(role);
    setForm({
      email: '', password: '', repassword: '',
      fullName: '', phone: '',
      specialization: '', qualification: '',
      experienceYears: '', bio: '', avatar: '',
    });
    setErrors({});
  };
  const closeCreate = () => { setCreateRole(null); setForm({}); setErrors({}); };

  /* ─── Validate form tạo ─── */
  const validateCreate = () => {
    const e = {};
    if (!form.email?.trim()) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.repassword) e.repassword = 'Mật khẩu không khớp';

    if (createRole === 'Doctor' || createRole === 'Nurse') {
      if (!form.fullName?.trim()) e.fullName = 'Vui lòng nhập họ tên';
      if (!form.phone?.trim()) e.phone = 'Vui lòng nhập SĐT';
      else if (!/^(0|\+84)\d{9,10}$/.test(form.phone.trim())) e.phone = 'SĐT không hợp lệ';
      if (form.experienceYears && (isNaN(form.experienceYears) || Number(form.experienceYears) < 0))
        e.experienceYears = 'Năm kinh nghiệm phải là số dương';
    }
    if (createRole === 'Customer' && form.phone && !/^(0|\+84)\d{9,10}$/.test(form.phone.trim()))
      e.phone = 'SĐT không hợp lệ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ─── Submit tạo ─── */
  const handleCreateSubmit = async () => {
    if (!validateCreate()) return;
    const endpointMap = {
      Customer: '/api/user/admin/create-customer',
      Doctor:   '/api/user/admin/create-doctor',
      Nurse:    '/api/user/admin/create-nurse',
    };
    setSaving(true);
    try {
      const body = {
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName?.trim() || '',
        phone: form.phone?.trim() || '',
        specialization: form.specialization?.trim() || null,
        qualification:  form.qualification?.trim() || null,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        bio: form.bio?.trim() || null,
        avatar: form.avatar || null,
      };
      const res = await authFetch(endpointMap[createRole], { method: 'POST', body: JSON.stringify(body) });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Tạo tài khoản ${ROLE_MAP[createRole].label} thành công!`);
        closeCreate();
        loadUsers(roleFilter);
      } else {
        toast.error(result.defaultMessage || result.message || 'Tạo tài khoản thất bại');
      }
    } catch { toast.error('Đã xảy ra lỗi'); }
    finally { setSaving(false); }
  };

  /* ── edit user ── */
  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ phoneNumber: user.phoneNumber || '', email: user.email || '' });
    setEditOpen(true);
  };
  const handleEditSubmit = async () => {
    setEditSaving(true);
    try {
      const res = await authFetch('/api/user/all/update-infor', {
        method: 'POST',
        body: JSON.stringify({ id: editUser.id, ...editForm }),
      });
      if (res.ok) {
        toast.success('Cập nhật thành công!');
        setItems(prev => prev.map(u => u.id === editUser.id ? { ...u, ...editForm } : u));
        setEditOpen(false);
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.defaultMessage || d.message || 'Cập nhật thất bại');
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
    else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.defaultMessage || 'Xóa thất bại');
    }
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

  /* ── stats ── */
  const stats = ALL_ROLES.map(r => ({
    role: r, count: items.filter(u => u.authorities?.name === r).length,
  }));

  /* Modal title icon */
  const roleIcon = { Customer: faUser, Doctor: faUserMd, Nurse: faUserNurse }[createRole];

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

        {/* ── Dropdown thêm tài khoản ── */}
        <div ref={addMenuRef} style={{ position: 'relative' }}>
          <button onClick={() => setAddMenu(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              color: '#fff', background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
              boxShadow: `0 4px 14px rgba(42,56,143,0.3)` }}>
            <FontAwesomeIcon icon={faUserPlus} /> Thêm tài khoản
            <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 11 }} />
          </button>
          {addMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 220,
              background: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
              border: `1px solid ${BORDER}`, zIndex: 100, overflow: 'hidden',
            }}>
              {[
                { role: 'Customer', icon: faUser,      desc: 'Tài khoản khách hàng' },
                { role: 'Doctor',   icon: faUserMd,    desc: 'Tài khoản bác sĩ + hồ sơ' },
                { role: 'Nurse',    icon: faUserNurse, desc: 'Tài khoản y tá + hồ sơ' },
              ].map(opt => {
                const cfg = ROLE_MAP[opt.role];
                return (
                  <button key={opt.role} onClick={() => openCreate(opt.role)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      border: 'none', background: '#fff', width: '100%', cursor: 'pointer',
                      textAlign: 'left', borderBottom: `1px solid ${BORDER}`, transition: 'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0,
                    }}>
                      <FontAwesomeIcon icon={opt.icon} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{cfg.label}</div>
                      <div style={{ fontSize: 12, color: TEXT_2 }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
            placeholder="Tìm theo email..."
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
                        <div style={{ fontSize: 12, color: TEXT_2 }}>#{user.id}</div>
                      </div>
                    </div>
                  </td>
                  {/* email */}
                  <td style={{ padding: '12px 18px', color: TEXT, fontSize: 13.5, fontWeight: 600 }}>{user.email}</td>
                  {/* phone */}
                  <td style={{ padding: '12px 18px', color: TEXT_2, fontSize: 13.5 }}>{user.phoneNumber || '—'}</td>
                  {/* created */}
                  <td style={{ padding: '12px 18px', color: TEXT_2, fontSize: 13 }}>
                    {user.createdDate ? String(user.createdDate).split('T')[0] : '—'}
                  </td>
                  {/* role badge (read-only) */}
                  <td style={{ padding: '12px 18px' }}>
                    <RoleBadge role={user.authorities?.name} />
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

      {/* ══ Modal Tạo tài khoản (theo role) ══ */}
      <Modal open={!!createRole} onClose={closeCreate}
        title={createRole ? `${roleIcon ? '' : ''}Thêm ${ROLE_MAP[createRole]?.label || ''}` : ''}
        width={createRole === 'Customer' ? 480 : 580}>
        {createRole && (
          <>
            {/* Avatar (chỉ Doctor / Nurse) */}
            {(createRole === 'Doctor' || createRole === 'Nurse') && (
              <AvatarUpload src={form.avatar} onUploaded={(link) => setForm(f => ({ ...f, avatar: link }))} />
            )}

            <FieldRow label="Email *">
              <StyledInput type="email" placeholder="example@gmail.com" value={form.email || ''}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <ErrMsg msg={errors.email} />}
            </FieldRow>

            {(createRole === 'Doctor' || createRole === 'Nurse') && (
              <FieldRow label="Họ và tên *">
                <StyledInput placeholder="Nguyễn Văn A" value={form.fullName || ''}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                {errors.fullName && <ErrMsg msg={errors.fullName} />}
              </FieldRow>
            )}

            <FieldRow label={createRole === 'Customer' ? 'Số điện thoại' : 'Số điện thoại *'}>
              <StyledInput placeholder="0912345678" value={form.phone || ''}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              {errors.phone && <ErrMsg msg={errors.phone} />}
            </FieldRow>

            {createRole === 'Customer' && (
              <FieldRow label="Họ và tên">
                <StyledInput placeholder="Nguyễn Văn A" value={form.fullName || ''}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </FieldRow>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FieldRow label="Mật khẩu *">
                <StyledInput type="password" placeholder="••••••" value={form.password || ''}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                {errors.password && <ErrMsg msg={errors.password} />}
              </FieldRow>
              <FieldRow label="Xác nhận mật khẩu *">
                <StyledInput type="password" placeholder="••••••" value={form.repassword || ''}
                  onChange={e => setForm(f => ({ ...f, repassword: e.target.value }))} />
                {errors.repassword && <ErrMsg msg={errors.repassword} />}
              </FieldRow>
            </div>

            {/* Doctor-specific */}
            {createRole === 'Doctor' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <FieldRow label="Chuyên khoa">
                    <StyledInput placeholder="VD: Nhi khoa, Tiêm chủng..." value={form.specialization || ''}
                      onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />
                  </FieldRow>
                  <FieldRow label="Số năm kinh nghiệm">
                    <StyledInput type="number" min="0" placeholder="5" value={form.experienceYears || ''}
                      onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} />
                    {errors.experienceYears && <ErrMsg msg={errors.experienceYears} />}
                  </FieldRow>
                </div>
                <FieldRow label="Giới thiệu / Tiểu sử">
                  <StyledTextarea placeholder="Bác sĩ chuyên về..." value={form.bio || ''}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
                </FieldRow>
              </>
            )}

            {/* Nurse-specific */}
            {createRole === 'Nurse' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <FieldRow label="Bằng cấp / Chứng chỉ">
                    <StyledInput placeholder="VD: Cử nhân điều dưỡng..." value={form.qualification || ''}
                      onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
                  </FieldRow>
                  <FieldRow label="Số năm kinh nghiệm">
                    <StyledInput type="number" min="0" placeholder="3" value={form.experienceYears || ''}
                      onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} />
                    {errors.experienceYears && <ErrMsg msg={errors.experienceYears} />}
                  </FieldRow>
                </div>
                <FieldRow label="Giới thiệu / Tiểu sử">
                  <StyledTextarea placeholder="Y tá có chuyên môn về..." value={form.bio || ''}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
                </FieldRow>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button onClick={closeCreate} style={cancelBtnStyle}>Hủy</button>
              <button onClick={handleCreateSubmit} disabled={saving} style={submitBtnStyle(saving)}>
                {saving ? 'Đang lưu...' : `✓ Tạo ${ROLE_MAP[createRole]?.label || ''}`}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ══ Modal Sửa tài khoản ══ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="✏️ Cập nhật thông tin">
        {editUser && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: '#f8fafc', borderRadius: 10, marginBottom: 20, border: `1px solid ${BORDER}` }}>
              <Avatar email={editUser.email} />
              <div>
                <div style={{ fontWeight: 700, color: TEXT }}>{editUser.email}</div>
                <RoleBadge role={editUser.authorities?.name} />
              </div>
            </div>
            <FieldRow label="Email">
              <StyledInput type="email" value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </FieldRow>
            <FieldRow label="Số điện thoại">
              <StyledInput value={editForm.phoneNumber}
                onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))} />
            </FieldRow>
            <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8,
              fontSize: 12.5, color: '#92400e', marginBottom: 14, lineHeight: 1.5 }}>
              💡 Lưu ý: thông tin chuyên môn (chuyên khoa, kinh nghiệm, avatar...) chỉnh ở trang Quản lý Bác sĩ / Y tá.
            </div>
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
