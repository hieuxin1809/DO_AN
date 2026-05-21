import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import { getMethod, postMethodPayload } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarPlus, faCalendarCheck, faSyringe, faLocationDot,
  faUsers, faCalendarAlt, faArrowLeft, faCircleInfo, faBoxOpen,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

/* ── design tokens ─────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const SUCCESS  = '#10b981';
const DANGER   = '#ef4444';
const WARNING  = '#f59e0b';
const BORDER   = '#e2e8f0';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BG       = '#f8fafc';

/* ── react-select styles ───────────────────────── */
const rsStyles = {
  control: (b, s) => ({
    ...b,
    borderRadius: 10,
    borderColor: s.isFocused ? ACCENT : BORDER,
    boxShadow: s.isFocused ? `0 0 0 3px rgba(14,165,233,0.15)` : 'none',
    minHeight: 44,
    fontSize: 14,
    '&:hover': { borderColor: ACCENT },
  }),
  placeholder: (b) => ({ ...b, color: '#94a3b8', fontSize: 14 }),
  singleValue: (b) => ({ ...b, color: TEXT, fontWeight: 600 }),
  option: (b, s) => ({
    ...b,
    background: s.isSelected ? PRIMARY : s.isFocused ? '#eff6ff' : '#fff',
    color: s.isSelected ? '#fff' : TEXT,
    fontWeight: s.isSelected ? 700 : 400,
    cursor: 'pointer',
  }),
  menuPortal: (b) => ({ ...b, zIndex: 99999 }),
  menu: (b) => ({ ...b, zIndex: 99999, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }),
};

/* ── helpers ───────────────────────────────────── */
function FieldLabel({ icon, children, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7,
      fontSize: 12, fontWeight: 700, color: TEXT_2, marginBottom: 7,
      letterSpacing: '0.4px', textTransform: 'uppercase' }}>
      {icon && <FontAwesomeIcon icon={icon} style={{ color: ACCENT, fontSize: 11 }} />}
      {children}
      {required && <span style={{ color: DANGER }}>*</span>}
    </div>
  );
}
function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5,
      color: DANGER, fontSize: 12, marginTop: 5, fontWeight: 500 }}>
      <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 10 }} />
      {msg}
    </div>
  );
}
function inputStyle(hasError) {
  return {
    width: '100%', height: 44, padding: '0 14px', boxSizing: 'border-box',
    borderRadius: 10, fontSize: 14, color: TEXT, fontFamily: 'inherit',
    outline: 'none', transition: 'border-color .18s, box-shadow .18s',
    border: `1.5px solid ${hasError ? DANGER : BORDER}`,
    background: hasError ? '#fff5f5' : '#fff',
  };
}
function SectionCard({ icon, title, subtitle, color = PRIMARY, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color === PRIMARY ? ACCENT : color})`,
        padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={icon} style={{ color: '#fff', fontSize: 16 }} />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{title}</div>
          {subtitle && <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: '22px 24px' }}>{children}</div>
    </div>
  );
}

/* ── today string ─────────────────────────────── */
const todayStr = () => new Date().toISOString().split('T')[0];

/* ══════════════════════════════════════════════ */
const AdminAddLichTiemChung = () => {
  const urlId = new URL(document.URL).searchParams.get('id');
  const isEdit = urlId != null;

  /* ── state ── */
  const [form, setForm] = useState({
    startDate: '', endDate: '', limitPeople: '', description: '',
    vaccineId: null, centerId: null,
  });
  const [errors, setErrors]       = useState({});
  const [vaccines, setVaccines]   = useState([]);
  const [centers, setCenters]     = useState([]);
  const [vaccineOpt, setVaccineOpt] = useState(null);
  const [centerOpt, setCenterOpt]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(isEdit);
  /* inventory info for selected vaccine+center */
  const [inventory, setInventory] = useState(null);

  /* ── load data ── */
  useEffect(() => {
    const loadVaccines = async () => {
      const res  = await getMethod('/api/vaccine/all/find-all');
      const data = await res.json();
      setVaccines(data);
    };
    const loadCenters = async () => {
      const res  = await getMethod('/api/center/public/find-all');
      const data = await res.json();
      setCenters(data);
    };
    loadVaccines();
    loadCenters();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const loadEdit = async () => {
      setLoading(true);
      try {
        const res  = await getMethod('/api/vaccine-schedule/all/find-by-id?id=' + urlId);
        const data = await res.json();
        setForm({
          startDate:   data.startDate   || '',
          endDate:     data.endDate     || '',
          limitPeople: data.limitPeople || '',
          description: data.description || '',
          vaccineId:   data.vaccine?.id || null,
          centerId:    data.center?.id  || null,
        });
        if (data.vaccine) {
          setVaccineOpt({ value: data.vaccine.id, label: data.vaccine.name || data.vaccine.nameVaccine });
        }
        if (data.center) {
          setCenterOpt({ value: data.center.id, label: data.center.centerName });
        }
      } catch { toast.error('Không thể tải dữ liệu lịch tiêm'); }
      finally { setLoading(false); }
    };
    loadEdit();
  }, [urlId]); // eslint-disable-line

  /* ── load inventory when vaccine+center selected ── */
  useEffect(() => {
    if (!form.vaccineId || !form.centerId) { setInventory(null); return; }
    const load = async () => {
      try {
        const res  = await getMethod(
          `/api/vaccine-inventory/list?vaccineId=${form.vaccineId}&centerId=${form.centerId}`
        );
        if (!res.ok) { setInventory(null); return; }
        // We use the existing list endpoint with filter
        // fallback: just clear
      } catch { /* ignore */ }
    };
    load();
  }, [form.vaccineId, form.centerId]);

  /* ── field change ── */
  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  /* ── validate ── */
  const validate = () => {
    const e   = {};
    const now = new Date(); now.setHours(0, 0, 0, 0);

    if (!form.startDate) {
      e.startDate = 'Vui lòng chọn ngày bắt đầu';
    } else {
      const start = new Date(form.startDate);
      if (start < now) e.startDate = 'Ngày bắt đầu phải từ hôm nay trở đi';
    }

    if (!form.endDate) {
      e.endDate = 'Vui lòng chọn ngày kết thúc';
    } else if (form.startDate && !e.startDate) {
      const start   = new Date(form.startDate);
      const end     = new Date(form.endDate);
      const diffDay = (end - start) / (1000 * 86400);
      if (end < start)   e.endDate = 'Ngày kết thúc không được trước ngày bắt đầu';
      else if (diffDay > 7) e.endDate = 'Lịch tiêm không được dài quá 7 ngày (đảm bảo bảo quản vaccine)';
    }

    if (!form.limitPeople && form.limitPeople !== 0) {
      e.limitPeople = 'Vui lòng nhập số người giới hạn';
    } else if (Number(form.limitPeople) < 1) {
      e.limitPeople = 'Số người giới hạn phải ít nhất là 1';
    } else if (!Number.isInteger(Number(form.limitPeople))) {
      e.limitPeople = 'Số người phải là số nguyên';
    }

    if (!form.vaccineId) e.vaccineId = 'Vui lòng chọn vaccine';
    if (!form.centerId)  e.centerId  = 'Vui lòng chọn trung tâm tiêm';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning('Vui lòng kiểm tra lại thông tin');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id:          isEdit ? urlId : undefined,
        startDate:   form.startDate,
        endDate:     form.endDate,
        limitPeople: Number(form.limitPeople),
        description: form.description,
        center:   { id: form.centerId },
        vaccine:  { id: form.vaccineId },
      };
      const url = isEdit
        ? '/api/vaccine-schedule/admin/update'
        : '/api/vaccine-schedule/admin/create';
      const res = await postMethodPayload(url, payload);

      if (res.status < 300) {
        toast.success(isEdit ? 'Cập nhật lịch tiêm thành công!' : 'Thêm lịch tiêm thành công!');
        setTimeout(() => { window.location.href = 'lich-tiem-chung'; }, 1200);
      } else {
        const result = await res.json();
        toast.error(result?.defaultMessage || (isEdit ? 'Cập nhật thất bại' : 'Thêm thất bại'));
      }
    } catch {
      toast.error('Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  /* ── derived ── */
  const vaccineOptions = vaccines.map(v => ({ value: v.id, label: v.name || v.nameVaccine }));
  const centerOptions  = centers.map(c => ({ value: c.id, label: c.centerName }));
  const diffDays = form.startDate && form.endDate
    ? Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000)
    : null;

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: 300, flexDirection: 'column', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%',
          border: `3px solid ${BORDER}`, borderTopColor: PRIMARY,
          animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: TEXT_2, fontSize: 14 }}>Đang tải dữ liệu...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '4px 0 40px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(42,56,143,0.3)` }}>
            <FontAwesomeIcon icon={isEdit ? faCalendarCheck : faCalendarPlus}
              style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT }}>
              {isEdit ? 'Cập nhật lịch tiêm chủng' : 'Thêm lịch tiêm chủng'}
            </h2>
            <div style={{ fontSize: 13, color: TEXT_2, marginTop: 3 }}>
              {isEdit
                ? 'Chỉnh sửa thông tin lịch tiêm đã tạo'
                : 'Tạo lịch tiêm vaccine mới cho trung tâm'}
            </div>
          </div>
        </div>
        <a href="lich-tiem-chung" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
          border: `1.5px solid ${BORDER}`, background: '#fff',
          color: TEXT_2, fontSize: 13.5, fontWeight: 600,
          transition: 'all .18s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_2; }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Quay lại danh sách
        </a>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* ── Card trái: Thời gian & Số lượng ── */}
          <SectionCard icon={faCalendarAlt} title="Thời gian & Số lượng" subtitle="Cấu hình thời gian lịch tiêm">
            {/* Ngày bắt đầu */}
            <div style={{ marginBottom: 18 }}>
              <FieldLabel icon={faCalendarAlt} required>Ngày bắt đầu</FieldLabel>
              <input
                type="date"
                min={todayStr()}
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                style={inputStyle(!!errors.startDate)}
                onFocus={e => { if (!errors.startDate) e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(14,165,233,0.15)`; }}
                onBlur={e  => { e.target.style.borderColor = errors.startDate ? DANGER : BORDER; e.target.style.boxShadow = 'none'; }}
              />
              <ErrorMsg msg={errors.startDate} />
            </div>

            {/* Ngày kết thúc */}
            <div style={{ marginBottom: 18 }}>
              <FieldLabel icon={faCalendarAlt} required>Ngày kết thúc</FieldLabel>
              <input
                type="date"
                min={form.startDate || todayStr()}
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                style={inputStyle(!!errors.endDate)}
                onFocus={e => { if (!errors.endDate) e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(14,165,233,0.15)`; }}
                onBlur={e  => { e.target.style.borderColor = errors.endDate ? DANGER : BORDER; e.target.style.boxShadow = 'none'; }}
              />
              <ErrorMsg msg={errors.endDate} />
              {/* Duration badge */}
              {diffDays != null && diffDays >= 0 && !errors.endDate && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: diffDays <= 7 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: diffDays <= 7 ? SUCCESS : DANGER }}>
                  {diffDays === 0 ? '1 ngày' : `${diffDays + 1} ngày`}
                  {diffDays > 7 && ' — vượt quá 7 ngày'}
                </div>
              )}
            </div>

            {/* Số người giới hạn */}
            <div style={{ marginBottom: 4 }}>
              <FieldLabel icon={faUsers} required>Số người giới hạn / lịch</FieldLabel>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="VD: 50"
                value={form.limitPeople}
                onChange={e => set('limitPeople', e.target.value)}
                style={inputStyle(!!errors.limitPeople)}
                onFocus={e => { if (!errors.limitPeople) e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(14,165,233,0.15)`; }}
                onBlur={e  => { e.target.style.borderColor = errors.limitPeople ? DANGER : BORDER; e.target.style.boxShadow = 'none'; }}
              />
              <ErrorMsg msg={errors.limitPeople} />
            </div>

            {/* summary box */}
            {form.startDate && form.endDate && form.limitPeople && !errors.startDate && !errors.endDate && !errors.limitPeople && (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(42,56,143,0.05)', border: `1px solid rgba(42,56,143,0.15)`,
                display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PRIMARY, marginBottom: 2 }}>
                  📋 Tóm tắt
                </div>
                <InfoRow label="Thời gian" value={`${form.startDate} → ${form.endDate}`} />
                <InfoRow label="Kéo dài" value={diffDays != null ? `${diffDays === 0 ? 1 : diffDays + 1} ngày` : '—'} />
                <InfoRow label="Giới hạn" value={`${form.limitPeople} người / lịch`} />
              </div>
            )}
          </SectionCard>

          {/* ── Card phải: Vaccine & Trung tâm ── */}
          <SectionCard icon={faSyringe} title="Vaccine & Địa điểm" subtitle="Chọn vaccine và trung tâm tiêm" color="#0f766e">
            {/* Vaccine */}
            <div style={{ marginBottom: 18 }}>
              <FieldLabel icon={faSyringe} required>Vaccine</FieldLabel>
              <Select
                options={vaccineOptions}
                value={vaccineOpt}
                onChange={opt => {
                  setVaccineOpt(opt);
                  set('vaccineId', opt?.value || null);
                }}
                placeholder="Tìm và chọn vaccine..."
                isSearchable
                isClearable
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  ...rsStyles,
                  control: (b, s) => ({
                    ...rsStyles.control(b, s),
                    borderColor: errors.vaccineId ? DANGER : (s.isFocused ? ACCENT : BORDER),
                    background: errors.vaccineId ? '#fff5f5' : '#fff',
                  }),
                }}
                noOptionsMessage={() => 'Không tìm thấy vaccine'}
              />
              <ErrorMsg msg={errors.vaccineId} />
            </div>

            {/* Trung tâm */}
            <div style={{ marginBottom: 18 }}>
              <FieldLabel icon={faLocationDot} required>Trung tâm tiêm</FieldLabel>
              <Select
                options={centerOptions}
                value={centerOpt}
                onChange={opt => {
                  setCenterOpt(opt);
                  set('centerId', opt?.value || null);
                }}
                placeholder="Chọn trung tâm tiêm..."
                isSearchable
                isClearable
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  ...rsStyles,
                  control: (b, s) => ({
                    ...rsStyles.control(b, s),
                    borderColor: errors.centerId ? DANGER : (s.isFocused ? ACCENT : BORDER),
                    background: errors.centerId ? '#fff5f5' : '#fff',
                  }),
                }}
                noOptionsMessage={() => 'Không tìm thấy trung tâm'}
              />
              <ErrorMsg msg={errors.centerId} />
            </div>

            {/* Mô tả */}
            <div>
              <FieldLabel icon={faCircleInfo}>Mô tả</FieldLabel>
              <textarea
                placeholder="Nhập mô tả lịch tiêm (không bắt buộc)..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px', boxSizing: 'border-box',
                  borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14,
                  color: TEXT, fontFamily: 'inherit', resize: 'vertical',
                  outline: 'none', lineHeight: 1.6, background: '#fff',
                  transition: 'border-color .18s, box-shadow .18s',
                }}
                onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px rgba(14,165,233,0.15)`; }}
                onBlur={e  => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </SectionCard>
        </div>

        {/* ── Info banner: kho theo trung tâm ── */}
        {form.vaccineId && form.centerId && (
          <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 12,
            background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)',
            display: 'flex', alignItems: 'center', gap: 12 }}>
            <FontAwesomeIcon icon={faBoxOpen} style={{ color: ACCENT, fontSize: 18, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.6 }}>
              <strong>Lưu ý về tồn kho:</strong> Hệ thống sẽ kiểm tra số vaccine đã xuất kho tại trung tâm này.
              Nếu chưa đủ số lượng theo giới hạn người, lịch tiêm sẽ không được tạo.
              Vào <strong>Kho Vaccine</strong> → chọn trung tâm → bấm <strong>Xuất kho</strong> trước khi tạo lịch.
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
          <a href="lich-tiem-chung" style={{
            padding: '11px 24px', borderRadius: 10, textDecoration: 'none',
            border: `1.5px solid ${BORDER}`, background: '#fff',
            color: TEXT_2, fontSize: 14, fontWeight: 600, display: 'inline-flex',
            alignItems: 'center', gap: 8, transition: 'all .18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = DANGER; e.currentTarget.style.color = DANGER; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_2; }}
          >
            Hủy
          </a>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '11px 32px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#94a3b8' : `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
              color: '#fff', fontSize: 14, fontWeight: 700, display: 'inline-flex',
              alignItems: 'center', gap: 9,
              boxShadow: saving ? 'none' : `0 4px 16px rgba(42,56,143,0.35)`,
              transition: 'all .18s',
            }}
          >
            {saving ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                Đang lưu...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={isEdit ? faCalendarCheck : faCalendarPlus} />
                {isEdit ? 'Cập nhật lịch tiêm' : 'Thêm lịch tiêm'}
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { opacity: 0.5; }
      `}</style>
    </div>
  );
};

/* ── InfoRow helper ─── */
function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: TEXT_2 }}>{label}</span>
      <span style={{ fontWeight: 700, color: PRIMARY }}>{value}</span>
    </div>
  );
}

export default AdminAddLichTiemChung;
