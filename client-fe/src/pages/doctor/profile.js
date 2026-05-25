import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserMd, faCamera, faSave } from '@fortawesome/free-solid-svg-icons';
import { uploadSingleFile } from '../../services/request';

const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const BASE = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(BASE + url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

const DoctorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/doctor/doctor/profile');
        if (res.ok) setProfile(await res.json());
      } catch { toast.error('Không tải được hồ sơ'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const updateField = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const uploadAvatar = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      const link = await uploadSingleFile(fileRef.current);
      if (link) {
        updateField('avatar', link);
        toast.success('Đã tải ảnh — bấm Lưu để áp dụng');
      }
    } catch { toast.error('Tải ảnh thất bại'); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/doctor/doctor/profile', {
        method: 'POST',
        body: JSON.stringify({
          fullName: profile.fullName,
          specialization: profile.specialization,
          experienceYears: profile.experienceYears,
          bio: profile.bio,
          avatar: profile.avatar,
        }),
      });
      if (res.ok) toast.success('Cập nhật thành công!');
      else toast.error('Lưu thất bại');
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50, color: TEXT_2 }}>Đang tải...</div>;
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: 50, color: TEXT_2 }}>
        Chưa có hồ sơ bác sĩ. Vui lòng liên hệ admin.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(42,56,143,.3)' }}>
          <FontAwesomeIcon icon={faUserMd} style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>
            Hồ sơ cá nhân
          </h2>
          <div style={{ fontSize: 13, color: TEXT_2 }}>Cập nhật thông tin hồ sơ bác sĩ của bạn</div>
        </div>
      </div>

      <div style={{
        background: '#fff', borderRadius: 16, padding: 28,
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)',
      }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="" style={{
                width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${ACCENT}`,
              }} />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 36, fontWeight: 800,
              }}>
                {(profile.fullName || 'BS').charAt(0).toUpperCase()}
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: '50%',
                background: ACCENT, border: '2.5px solid #fff',
                color: '#fff', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <FontAwesomeIcon icon={faCamera} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: TEXT, fontSize: 17 }}>
              BS. {profile.fullName || '—'}
            </div>
            <div style={{ fontSize: 13, color: TEXT_2, marginTop: 4 }}>
              {profile.specialization || 'Chưa cập nhật chuyên khoa'}
            </div>
            <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>
              {profile.experienceYears ? `${profile.experienceYears} năm kinh nghiệm` : ''}
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Họ và tên">
            <input value={profile.fullName || ''} onChange={e => updateField('fullName', e.target.value)}
              style={input} />
          </Field>
          <Field label="Chuyên khoa">
            <input value={profile.specialization || ''} onChange={e => updateField('specialization', e.target.value)}
              placeholder="VD: Nhi khoa, Tiêm chủng..." style={input} />
          </Field>
          <Field label="Số năm kinh nghiệm">
            <input type="number" min="0" value={profile.experienceYears || ''}
              onChange={e => updateField('experienceYears', e.target.value ? Number(e.target.value) : null)}
              style={input} />
          </Field>
          <Field label="Giới thiệu / Tiểu sử">
            <textarea value={profile.bio || ''} onChange={e => updateField('bio', e.target.value)}
              placeholder="Bác sĩ chuyên về..."
              style={{ ...input, minHeight: 80, resize: 'vertical' }} />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button onClick={save} disabled={saving}
            style={{
              padding: '10px 26px', borderRadius: 10, border: 'none',
              background: saving ? '#94a3b8' : `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: saving ? 'none' : `0 4px 14px rgba(42,56,143,.3)`,
            }}>
            <FontAwesomeIcon icon={faSave} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
        textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const input = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${BORDER}`, fontSize: 14, color: TEXT,
  outline: 'none', fontFamily: 'inherit', background: '#fff',
};

export default DoctorProfile;
