import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX, faFileMedical } from '@fortawesome/free-solid-svg-icons';

const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const BASE = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(BASE + url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

export default function PatientHistoryModal({ open, target, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && target) {
      setHistory([]);
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const res = await authFetch(`/api/doctor/doctor/patient-history/${target.id}`);
          if (res.ok) {
            setHistory(await res.json());
          }
        } catch (e) {
          console.error('Lỗi khi tải lịch sử tiêm:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [open, target]);

  if (!open || !target) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)' }}
        onClick={onClose} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
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
              <FontAwesomeIcon icon={faFileMedical} /> Hồ sơ lịch sử tiêm chủng
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
              Bệnh nhân: <strong>{target.fullName || '—'}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
            borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
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

          {/* Lịch sử chi tiết */}
          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
              textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10,
            }}>Các mũi tiêm đã thực hiện</label>
            {loading ? (
              <div style={{ fontSize: 14, color: TEXT_2, textAlign: 'center', padding: '30px 0' }}>
                Đang tải dữ liệu lịch sử tiêm...
              </div>
            ) : history.length === 0 ? (
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '24px',
                border: `1px dashed ${BORDER}`, fontSize: 13, color: TEXT_2, textAlign: 'center'
              }}>
                Chưa có mũi tiêm chủng nào được ghi nhận trên hệ thống cho bệnh nhân này.
              </div>
            ) : (
              <div style={{
                border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Ngày tiêm</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Vắc-xin</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: TEXT_2 }}>Mũi số</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Bác sĩ khám</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: TEXT_2 }}>Ghi chú sàng lọc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, idx) => {
                      const time = h.vaccineScheduleTime;
                      const vaccineId = time?.vaccineSchedule?.vaccine?.id;
                      const vaccineName = time?.vaccineSchedule?.vaccine?.name || '—';
                      const injectDateStr = time?.injectDate ? new Date(time.injectDate).toLocaleDateString('vi-VN') : '—';

                      const sameVaccinePast = history.slice(idx).filter(item => item.vaccineScheduleTime?.vaccineSchedule?.vaccine?.id === vaccineId);
                      const doseNum = sameVaccinePast.length;

                      let screenNote = '—';
                      try {
                        if (h.healthStatusBefore) {
                          const parsed = JSON.parse(h.healthStatusBefore);
                          if (parsed && parsed.note) screenNote = parsed.note;
                        }
                      } catch (ignore) {}

                      return (
                        <tr key={h.id} style={{ borderBottom: idx < history.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                          <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{injectDateStr}</td>
                          <td style={{ padding: '10px 14px', color: TEXT }}>{vaccineName}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: PRIMARY, fontWeight: 700 }}>
                            Mũi {doseNum}
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT }}>
                            {h.doctor?.fullName || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT_2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={screenNote}>
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

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button onClick={onClose} style={{
              padding: '10px 22px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
              background: '#fff', color: TEXT_2, fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
            }}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
