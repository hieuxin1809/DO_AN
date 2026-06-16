import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStethoscope, faX, faSyringe, faBan, faExclamationTriangle, faClock, faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';

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

/* Danh sách câu hỏi sàng lọc — checklist y tế chuẩn */
const SCREENING_QUESTIONS = [
  { key: 'hasFever',                label: 'Đang sốt, ốm, mệt mỏi?',                        danger: true },
  { key: 'hasAllergy',              label: 'Tiền sử dị ứng vaccine hoặc thuốc?',           danger: true },
  { key: 'isPregnant',              label: 'Đang mang thai? (đối với nữ trong độ tuổi sinh đẻ)', danger: true },
  { key: 'isOnImmunosuppressant',   label: 'Đang dùng thuốc ức chế miễn dịch liều cao?',   danger: true },
  { key: 'hasSevereChronicCondition', label: 'Bệnh nền nghiêm trọng đang điều trị?',         danger: false },
  { key: 'hadReactionLastDose',     label: 'Phản ứng nặng sau mũi tiêm trước?',            danger: true },
  { key: 'hasInfectionLast14Days',  label: 'Nhiễm trùng cấp tính trong 14 ngày qua?',      danger: false },
];

export default function ScreeningModal({ open, target, onClose, onSuccess }) {
  const [answers, setAnswers] = useState({});
  const [temperature, setTemperature] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && target) {
      setAnswers({});
      setTemperature('');
      setNote('');
      setHistory([]);

      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const res = await authFetch(`/api/doctor/doctor/patient-history/${target.id}`);
          if (res.ok) {
            setHistory(await res.json());
          }
        } catch (e) {
          console.error('Lỗi khi tải lịch sử tiêm:', e);
        } finally {
          setLoadingHistory(false);
        }
      };

      fetchHistory();
    }
  }, [open, target]);

  if (!open || !target) return null;

  const hasDanger = SCREENING_QUESTIONS
    .filter(q => q.danger && answers[q.key] === true).length > 0;

  const submit = async (decision) => {
    // decision = 'inject' | 'defer' | 'cancel'
    if (decision === 'inject' && hasDanger) {
      const { isConfirmed } = await Swal.fire({
        title: 'Có cảnh báo y tế!',
        html: 'Bệnh nhân có yếu tố nguy cơ. Bạn có chắc chắn vẫn muốn tiêm?',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: WARNING, confirmButtonText: 'Vẫn tiêm', cancelButtonText: 'Để hoãn',
      });
      if (!isConfirmed) return;
    }
    if (decision === 'defer' && !note.trim()) {
      toast.warning('Vui lòng nhập lý do hoãn tiêm');
      return;
    }
    if (decision === 'cancel') {
      if (!note.trim()) {
        toast.warning('Vui lòng nhập lý do từ chối tiêm');
        return;
      }
      const { isConfirmed } = await Swal.fire({
        title: 'Xác nhận từ chối tiêm?',
        html: 'Bệnh nhân này sẽ bị từ chối tiêm vaccine này cho lịch hẹn hiện tại. Lịch tiêm sẽ chuyển sang trạng thái HỦY. Nếu đã thanh toán, hệ thống sẽ tự động đưa vào danh sách chờ hoàn tiền.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: DANGER, confirmButtonText: 'Từ chối tiêm', cancelButtonText: 'Đóng',
      });
      if (!isConfirmed) return;
    }

    setSaving(true);
    try {
      const body = {
        decision,
        screening: {
          ...answers,
          temperature: temperature ? Number(temperature) : null,
          note: note.trim() || null,
          screenedAt: new Date().toISOString(),
        },
      };
      const res = await authFetch(`/api/doctor/doctor/screening/${target.id}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.defaultMessage || 'Lưu thất bại');
        return;
      }
      toast.success(decision === 'inject'
        ? '✅ Đã xác nhận tiêm. Giấy chứng nhận đang được cấp.'
        : decision === 'defer'
          ? '⛔ Đã hoãn tiêm cho bệnh nhân.'
          : '❌ Đã hủy và từ chối tiêm cho bệnh nhân.');
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối');
    } finally { setSaving(false); }
  };

  const time = target.vaccineScheduleTime;
  const vaccineName = time?.vaccineSchedule?.vaccine?.name || '—';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: `.swal2-container { z-index: 100000 !important; }` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)' }}
        onClick={saving ? null : onClose} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.22)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
          padding: '18px 24px', borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faStethoscope} /> Sàng lọc trước tiêm
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
              Bệnh nhân: <strong>{target.fullName || '—'}</strong> · {vaccineName}
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

        {/* Body */}
        <div style={{ padding: 24 }}>

          {/* Patient info card */}
          <div style={{
            background: '#f0f9ff', borderRadius: 10, padding: '12px 16px',
            border: `1px solid ${ACCENT}33`, marginBottom: 18,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10,
            fontSize: 12.5,
          }}>
            <div><strong style={{ color: TEXT_2 }}>Họ tên:</strong> <span style={{ color: TEXT, fontWeight: 700 }}>{target.fullName}</span></div>
            <div><strong style={{ color: TEXT_2 }}>SĐT:</strong> <span style={{ color: TEXT }}>{target.phone || '—'}</span></div>
            <div><strong style={{ color: TEXT_2 }}>Ngày sinh:</strong> <span style={{ color: TEXT }}>{target.dob ? new Date(target.dob).toLocaleDateString('vi-VN') : '—'}</span></div>
            <div><strong style={{ color: TEXT_2 }}>CCCD:</strong> <span style={{ color: TEXT }}>{target.idCard || '—'}</span></div>
          </div>

          {/* Lịch sử tiêm chủng của bệnh nhân */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Lịch sử tiêm chủng của bệnh nhân</label>
            {loadingHistory ? (
              <div style={{ fontSize: 13, color: TEXT_2, padding: '6px 0' }}>Đang tải lịch sử tiêm...</div>
            ) : history.length === 0 ? (
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                border: `1px dashed ${BORDER}`, fontSize: 12.5, color: TEXT_2
              }}>
                Chưa có lịch sử tiêm chủng nào được ghi nhận trên hệ thống.
              </div>
            ) : (
              <div style={{
                maxHeight: '140px', overflowY: 'auto', border: `1px solid ${BORDER}`,
                borderRadius: 10, background: '#fff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Ngày tiêm</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Vắc-xin</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: TEXT_2 }}>Mũi số</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Ghi chú sàng lọc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, idx) => {
                      const time = h.vaccineScheduleTime;
                      const vaccineId = time?.vaccineSchedule?.vaccine?.id;
                      const vaccineName = time?.vaccineSchedule?.vaccine?.name || '—';
                      const injectDateStr = time?.injectDate ? new Date(time.injectDate).toLocaleDateString('vi-VN') : '—';

                      // Tính số mũi: Đếm số mũi có cùng vaccineId có index >= idx (sắp xếp giảm dần)
                      const sameVaccinePast = history.slice(idx).filter(item => item.vaccineScheduleTime?.vaccineSchedule?.vaccine?.id === vaccineId);
                      const doseNum = sameVaccinePast.length;

                      // Lấy note từ healthStatusBefore
                      let screenNote = '—';
                      try {
                        if (h.healthStatusBefore) {
                          const parsed = JSON.parse(h.healthStatusBefore);
                          if (parsed && parsed.note) {
                            screenNote = parsed.note;
                          }
                        }
                      } catch (ignore) {}

                      return (
                        <tr key={h.id} style={{ borderBottom: idx < history.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                          <td style={{ padding: '8px 10px', color: TEXT, fontWeight: 600 }}>{injectDateStr}</td>
                          <td style={{ padding: '8px 10px', color: TEXT }}>{vaccineName}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: PRIMARY, fontWeight: 700 }}>
                            Mũi {doseNum}
                          </td>
                          <td style={{ padding: '8px 10px', color: TEXT_2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={screenNote}>
                            {screenNote}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Body temperature */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nhiệt độ cơ thể (°C)</label>
            <input type="number" step="0.1" min="35" max="42"
              value={temperature} onChange={e => setTemperature(e.target.value)}
              placeholder="36.5"
              style={inputStyle} />
            {temperature && Number(temperature) > 37.5 && (
              <div style={{ fontSize: 12, color: WARNING, marginTop: 4 }}>
                ⚠️ Nhiệt độ cao bất thường, cân nhắc hoãn tiêm
              </div>
            )}
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Câu hỏi sàng lọc</label>
            <div style={{
              border: `1px solid ${BORDER}`, borderRadius: 10,
              background: '#fff', overflow: 'hidden',
            }}>
              {SCREENING_QUESTIONS.map((q, idx) => (
                <div key={q.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: idx < SCREENING_QUESTIONS.length - 1 ? `1px solid ${BORDER}` : 'none',
                  background: answers[q.key] === true && q.danger ? 'rgba(239,68,68,.06)' : 'transparent',
                }}>
                  <span style={{ fontSize: 13.5, color: TEXT, flex: 1, paddingRight: 14 }}>
                    {q.danger && answers[q.key] === true && <span style={{ color: DANGER, marginRight: 4 }}>⚠️</span>}
                    {q.label}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <RadioToggle
                      checked={answers[q.key] === true}
                      onClick={() => setAnswers(a => ({ ...a, [q.key]: true }))}
                      color={q.danger ? DANGER : WARNING}
                      label="Có"
                    />
                    <RadioToggle
                      checked={answers[q.key] === false}
                      onClick={() => setAnswers(a => ({ ...a, [q.key]: false }))}
                      color={SUCCESS}
                      label="Không"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Ghi chú / Lý do hoãn (nếu có)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Vd: Tình trạng sức khỏe ổn, có thể tiêm an toàn..."
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
          </div>

          {/* Warning banner if has danger */}
          {hasDanger && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(239,68,68,.08)', border: `1px solid ${DANGER}33`,
              fontSize: 13, color: '#991b1b', lineHeight: 1.6,
            }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: 6, color: DANGER }} />
              <strong>Có yếu tố nguy cơ!</strong> Cân nhắc kỹ hoặc hoãn tiêm để đảm bảo an toàn cho bệnh nhân.
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={btnCancel(saving)}>
              Đóng
            </button>
            <button onClick={() => submit('cancel')} disabled={saving} style={btnRefuse(saving)}>
              <FontAwesomeIcon icon={faCircleXmark} /> Từ chối tiêm
            </button>
            <button onClick={() => submit('defer')} disabled={saving} style={btnDefer(saving)}>
              <FontAwesomeIcon icon={faClock} /> Hoãn tiêm
            </button>
            <button onClick={() => submit('inject')} disabled={saving} style={btnInject(saving)}>
              <FontAwesomeIcon icon={faSyringe} /> {saving ? 'Đang lưu...' : 'Đồng ý tiêm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadioToggle({ checked, onClick, color, label }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
      border: `1.5px solid ${checked ? color : BORDER}`,
      background: checked ? `${color}15` : '#fff',
      color: checked ? color : TEXT_2, cursor: 'pointer', transition: 'all .15s',
      minWidth: 60,
    }}>{label}</button>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7,
};
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${BORDER}`, fontSize: 14, color: TEXT,
  outline: 'none', fontFamily: 'inherit',
};
const btnCancel = (disabled) => ({
  padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
  background: '#fff', color: TEXT_2, fontWeight: 600, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
});
const btnDefer = (disabled) => ({
  padding: '10px 18px', borderRadius: 10, border: 'none',
  background: disabled ? '#94a3b8' : WARNING, color: '#fff', fontWeight: 700, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 7,
});
const btnRefuse = (disabled) => ({
  padding: '10px 18px', borderRadius: 10, border: 'none',
  background: disabled ? '#94a3b8' : DANGER, color: '#fff', fontWeight: 700, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 7,
});
const btnInject = (disabled) => ({
  padding: '10px 22px', borderRadius: 10, border: 'none',
  background: disabled ? '#94a3b8' : `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
  color: '#fff', fontWeight: 700, fontSize: 13.5,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 7,
  boxShadow: disabled ? 'none' : `0 4px 14px rgba(42,56,143,0.3)`,
});
