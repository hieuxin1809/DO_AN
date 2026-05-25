import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStethoscope, faX, faCheck } from '@fortawesome/free-solid-svg-icons';

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

/* Câu hỏi theo dõi sau tiêm — checklist các triệu chứng có thể xuất hiện */
const SYMPTOMS = [
  { key: 'painAtSite',    label: 'Đau, sưng tại chỗ tiêm' },
  { key: 'redness',       label: 'Đỏ tại chỗ tiêm' },
  { key: 'mildFever',     label: 'Sốt nhẹ (<38.5°C)' },
  { key: 'highFever',     label: 'Sốt cao (≥38.5°C)',         danger: true },
  { key: 'fatigue',       label: 'Mệt mỏi, đau cơ' },
  { key: 'rash',          label: 'Phát ban',                  danger: true },
  { key: 'difficultyBreathing', label: 'Khó thở',             danger: true },
  { key: 'severeReaction',      label: 'Phản ứng nặng (sốc, co giật)', danger: true },
];

export default function FollowupModal({ open, target, onClose, onSuccess }) {
  const [symptoms, setSymptoms] = useState({});
  const [observedTemp, setObservedTemp] = useState('');
  const [observationMinutes, setObservationMinutes] = useState('30');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSymptoms({});
      setObservedTemp('');
      setObservationMinutes('30');
      setNote('');
    }
  }, [open]);

  if (!open || !target) return null;

  const hasDanger = SYMPTOMS.filter(s => s.danger && symptoms[s.key] === true).length > 0;
  const allNo = SYMPTOMS.every(s => symptoms[s.key] === false);

  const submit = async () => {
    if (Object.keys(symptoms).length === 0) {
      toast.warning('Vui lòng trả lời các câu hỏi theo dõi');
      return;
    }
    setSaving(true);
    try {
      const body = {
        symptoms,
        observedTemperature: observedTemp ? Number(observedTemp) : null,
        observationMinutes: Number(observationMinutes) || 30,
        note: note.trim() || null,
        observedAt: new Date().toISOString(),
      };
      const res = await authFetch(`/api/doctor/doctor/followup/${target.id}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.defaultMessage || 'Lưu thất bại');
        return;
      }
      toast.success('✅ Đã hoàn tất theo dõi sau tiêm!');
      onSuccess?.();
    } catch {
      toast.error('Lỗi kết nối');
    } finally { setSaving(false); }
  };

  const vaccineName = target.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name || '—';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)' }}
        onClick={saving ? null : onClose} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.22)',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${SUCCESS}, #065f46)`,
          padding: '18px 24px', borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              🩺 Theo dõi sau tiêm
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
              Bệnh nhân: <strong>{target.fullName}</strong> · {vaccineName}
            </div>
          </div>
          <button onClick={onClose} disabled={saving} style={{
            background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
            borderRadius: 8, width: 30, height: 30, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesomeIcon icon={faX} />
          </button>
        </div>

        <div style={{ padding: 24 }}>

          {/* Time observed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Thời gian theo dõi (phút)</label>
              <input type="number" min="0" max="240" value={observationMinutes}
                onChange={e => setObservationMinutes(e.target.value)}
                style={inputStyle} />
              <div style={{ fontSize: 11, color: TEXT_2, marginTop: 4 }}>Khuyến nghị: ≥30 phút</div>
            </div>
            <div>
              <label style={labelStyle}>Nhiệt độ sau tiêm (°C)</label>
              <input type="number" step="0.1" min="35" max="42" value={observedTemp}
                onChange={e => setObservedTemp(e.target.value)} placeholder="36.5"
                style={inputStyle} />
            </div>
          </div>

          {/* Symptoms checklist */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Triệu chứng quan sát được</label>
            <div style={{
              border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff', overflow: 'hidden',
            }}>
              {SYMPTOMS.map((q, idx) => (
                <div key={q.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: idx < SYMPTOMS.length - 1 ? `1px solid ${BORDER}` : 'none',
                  background: symptoms[q.key] === true && q.danger ? 'rgba(239,68,68,.06)' : 'transparent',
                }}>
                  <span style={{ fontSize: 13.5, color: TEXT, flex: 1 }}>
                    {q.danger && symptoms[q.key] === true && <span style={{ color: DANGER, marginRight: 4 }}>⚠️</span>}
                    {q.label}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Toggle checked={symptoms[q.key] === true}
                      onClick={() => setSymptoms(s => ({ ...s, [q.key]: true }))}
                      color={q.danger ? DANGER : WARNING} label="Có" />
                    <Toggle checked={symptoms[q.key] === false}
                      onClick={() => setSymptoms(s => ({ ...s, [q.key]: false }))}
                      color={SUCCESS} label="Không" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Ghi chú / Khuyến nghị</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="VD: Bệnh nhân ổn định, không có triệu chứng bất thường, đã được dặn dò..."
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
          </div>

          {hasDanger && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(239,68,68,.08)', border: `1px solid ${DANGER}33`,
              fontSize: 13, color: '#991b1b', lineHeight: 1.6,
            }}>
              ⚠️ <strong>Có dấu hiệu cảnh báo!</strong> Cần theo dõi sát hoặc chuyển khoa cấp cứu nếu cần.
            </div>
          )}
          {allNo && !hasDanger && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(16,185,129,.08)', border: `1px solid ${SUCCESS}33`,
              fontSize: 13, color: '#065f46',
            }}>
              ✅ Bệnh nhân an toàn, có thể về.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={btnCancel(saving)}>
              Hủy
            </button>
            <button onClick={submit} disabled={saving} style={btnConfirm(saving)}>
              <FontAwesomeIcon icon={faCheck} /> {saving ? 'Đang lưu...' : 'Hoàn tất theo dõi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onClick, color, label }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
      border: `1.5px solid ${checked ? color : BORDER}`,
      background: checked ? `${color}15` : '#fff',
      color: checked ? color : TEXT_2, cursor: 'pointer', minWidth: 60,
    }}>{label}</button>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7,
};
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  borderRadius: 10, border: `1.5px solid ${BORDER}`,
  fontSize: 14, color: TEXT, outline: 'none', fontFamily: 'inherit',
};
const btnCancel = (disabled) => ({
  padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
  background: '#fff', color: TEXT_2, fontWeight: 600, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
});
const btnConfirm = (disabled) => ({
  padding: '10px 22px', borderRadius: 10, border: 'none',
  background: disabled ? '#94a3b8' : `linear-gradient(135deg, ${SUCCESS}, #065f46)`,
  color: '#fff', fontWeight: 700, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 7,
  boxShadow: disabled ? 'none' : `0 4px 14px rgba(16,185,129,0.3)`,
});
