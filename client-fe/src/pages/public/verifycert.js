import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const PRIMARY = '#0284c7';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const TEXT    = '#0f172a';
const TEXT_2  = '#64748b';
const BORDER  = '#e2e8f0';

function formatDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function VerifyCert() {
  const { serial } = useParams();
  const [loading, setLoading]   = useState(true);
  const [result,  setResult]    = useState(null);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/certificate/public/verify/${encodeURIComponent(serial)}`);
        const j   = await res.json();
        setResult(j);
      } catch (err) {
        console.error(err);
        setError('Không kết nối được máy chủ');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [serial]);

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)`,
      padding: '40px 16px',
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: PRIMARY, letterSpacing: '-0.5px' }}>
            💉 iVaccine
          </div>
          <div style={{ fontSize: 13, color: TEXT_2, marginTop: 4 }}>
            Hệ thống xác thực giấy chứng nhận tiêm chủng
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 18,
          boxShadow: '0 12px 40px rgba(2,132,199,0.14)',
          overflow: 'hidden', border: `1px solid ${BORDER}`,
        }}>

          {loading ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: TEXT_2 }}>
              <div style={{
                width: 50, height: 50, margin: '0 auto 16px',
                border: `4px solid ${ACCENT}`, borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'cert-spin 0.9s linear infinite',
              }} />
              <style>{`@keyframes cert-spin { to { transform: rotate(360deg) } }`}</style>
              <div style={{ fontSize: 14 }}>Đang xác thực giấy...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: DANGER }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Banner trạng thái */}
              <div style={{
                padding: '28px 24px', textAlign: 'center',
                background: result.valid
                  ? `linear-gradient(135deg, #10b981 0%, #059669 100%)`
                  : `linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)`,
                color: '#fff',
              }}>
                <div style={{ fontSize: 56, marginBottom: 8 }}>
                  {result.valid ? '✅' : '❌'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
                  {result.valid ? 'Giấy xác nhận HỢP LỆ' : 'Giấy xác nhận KHÔNG HỢP LỆ'}
                </div>
                {!result.valid && result.reason && (
                  <div style={{ fontSize: 14, marginTop: 8, opacity: 0.95 }}>
                    {result.reason}
                  </div>
                )}
              </div>

              {/* Serial */}
              <div style={{
                padding: '16px 24px',
                background: '#f8fafc', borderBottom: `1px solid ${BORDER}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 8,
              }}>
                <span style={{ fontSize: 12, color: TEXT_2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Mã giấy xác nhận
                </span>
                <span style={{
                  fontFamily: "'Courier New', monospace", fontSize: 16,
                  fontWeight: 800, color: PRIMARY, letterSpacing: '1px',
                }}>
                  {result.serialNo || serial}
                </span>
              </div>

              {/* Thông tin nếu có */}
              {result.data && (
                <div style={{ padding: '24px' }}>
                  <DataRow label="👤 Họ và tên"            value={result.data.fullName} />
                  <DataRow label="🪪 Số CMND/CCCD"         value={result.data.idCard} />
                  <DataRow label="💉 Vaccine"              value={result.data.vaccineName} />
                  <DataRow label="🏭 Nhà sản xuất"          value={result.data.vaccineManufacturer} />
                  <DataRow label="📊 Mũi số"               value={
                    result.data.doseNumber
                      ? (result.data.totalDoses ? `${result.data.doseNumber}/${result.data.totalDoses}` : `${result.data.doseNumber}`)
                      : '—'
                  } />
                  <DataRow label="📅 Ngày tiêm"             value={formatDateTime(result.data.injectionDate)} />
                  <DataRow label="🏥 Trung tâm"            value={result.data.centerName} />
                  <DataRow label="🗓️ Ngày cấp giấy"        value={formatDateTime(result.data.issuedDate)} last />
                </div>
              )}

              {result.valid && (
                <div style={{
                  background: '#f0fdf4', padding: '14px 24px',
                  borderTop: `1px solid ${BORDER}`,
                  fontSize: 13, color: '#166534', lineHeight: 1.6,
                }}>
                  🔒 <strong>Đã xác thực chữ ký số:</strong> dữ liệu giấy chưa bị chỉnh sửa kể từ khi cấp, và giấy vẫn còn hiệu lực.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: TEXT_2 }}>
          <a href="/" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>
            ← Về trang chủ iVaccine
          </a>
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${BORDER}`,
      gap: 16, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, color: TEXT_2, fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: TEXT, fontWeight: 700, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}
