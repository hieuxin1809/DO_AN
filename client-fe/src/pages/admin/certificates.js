import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCertificate, faSearch, faX, faEye, faBan, faCheckCircle,
  faTimesCircle, faFileLines, faIdCard, faSyringe, faHospital,
  faCalendarDays, faUser, faDownload, faKey, faSync,
} from '@fortawesome/free-solid-svg-icons';
import { downloadCertificatePdf } from '../../services/certificatePdf';

const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const WARNING = '#f59e0b';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const BASE  = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(BASE + url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

/* ─── helpers ─── */
function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

/* ── small helpers ─── */
function Pill({ color, bg, children }) {
  return (
    <span style={{ padding: '3px 12px', borderRadius: 16, fontSize: 12,
      fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' }}>{children}</span>
  );
}

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${color}22`,
      background: `${color}11`, color, cursor: 'pointer', fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}11`; e.currentTarget.style.color = color; }}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}

/* ── Modal wrapper ── */
function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16,
        width: Math.min(width, window.innerWidth - 32), maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.22)' }}>
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
          padding: '16px 22px', borderRadius: '16px 16px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none',
            color: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
            <FontAwesomeIcon icon={faX} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ */
const AdminCertificates = () => {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState({ totalActive: 0, totalRevoked: 0 });
  const [page, setPage]         = useState(0);
  const [size]                  = useState(20);
  const [loading, setLoading]   = useState(true);

  // filters
  const [keyword,     setKeyword]     = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [centerName,  setCenterName]  = useState('');
  const [revokedFlt,  setRevokedFlt]  = useState('');    // '' | 'true' | 'false'
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail,     setDetail]     = useState(null);

  // revoke modal
  const [revokeOpen,   setRevokeOpen]   = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking,     setRevoking]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim())     params.set('keyword',     keyword.trim());
      if (vaccineName.trim()) params.set('vaccineName', vaccineName.trim());
      if (centerName.trim())  params.set('centerName',  centerName.trim());
      if (revokedFlt !== '')  params.set('revoked',     revokedFlt);
      if (fromDate)           params.set('fromDate',    fromDate);
      if (toDate)             params.set('toDate',      toDate);
      params.set('page', String(page));
      params.set('size', String(size));

      const res  = await authFetch(`/api/certificate/admin/list?${params}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setList(data.content || []);
      setTotal(data.totalElements || 0);
      setStats({ totalActive: data.totalActive, totalRevoked: data.totalRevoked });
    } catch (e) {
      console.error(e);
      toast.error('Không tải được danh sách giấy chứng nhận');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const handleSearch = () => { setPage(0); load(); };
  const handleReset  = () => {
    setKeyword(''); setVaccineName(''); setCenterName('');
    setRevokedFlt(''); setFromDate(''); setToDate(''); setPage(0);
    setTimeout(load, 0);
  };

  const openDetail = async (id) => {
    try {
      const res = await authFetch(`/api/certificate/admin/detail/${id}`);
      if (!res.ok) throw new Error();
      setDetail(await res.json());
      setDetailOpen(true);
    } catch { toast.error('Không tải được chi tiết'); }
  };

  const openRevoke = (cert) => {
    setRevokeTarget(cert);
    setRevokeReason('');
    setRevokeOpen(true);
  };

  const handleDownloadPdf = async (cert) => {
    try {
      await downloadCertificatePdf(cert);
      toast.success('Đã tải giấy chứng nhận!');
    } catch (e) {
      console.error('download err:', e);
      toast.error('Tạo PDF thất bại!');
    }
  };
  /** Tải PDF từ table — cần lấy full data (có hash) trước */
  const downloadFromTable = async (id) => {
    try {
      const res = await authFetch(`/api/certificate/admin/detail/${id}`);
      if (!res.ok) throw new Error();
      const full = await res.json();
      await handleDownloadPdf(full);
    } catch { toast.error('Không tải được PDF'); }
  };

  const submitRevoke = async () => {
    if (!revokeReason.trim() || revokeReason.trim().length < 5) {
      toast.warning('Vui lòng nhập lý do thu hồi (tối thiểu 5 ký tự)');
      return;
    }
    setRevoking(true);
    try {
      const res = await authFetch(`/api/certificate/admin/revoke/${revokeTarget.id}`, {
        method: 'POST',
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Đã thu hồi giấy chứng nhận');
        setRevokeOpen(false);
        load();
      } else {
        toast.error(result.defaultMessage || 'Thu hồi thất bại');
      }
    } catch { toast.error('Đã xảy ra lỗi'); }
    finally { setRevoking(false); }
  };

  const triggerRehash = async (id) => {
    try {
      const res = await authFetch(`/api/certificate/admin/rehash/${id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.defaultMessage || 'Lỗi không xác định');
      }
      toast.success('Đã cập nhật lại chữ ký số (Rehash) thành công!');
      const updated = await res.json();
      setDetail(updated);
      load();
    } catch (e) {
      console.error(e);
      toast.error('Cập nhật chữ ký số thất bại: ' + e.message);
    }
  };

  const handleRehashLegacy = async () => {
    Swal.fire({
      title: 'Xác nhận sửa lỗi chữ ký?',
      text: 'Hệ thống sẽ kiểm tra toàn bộ giấy chứng nhận và tự động tính lại chữ ký số (rehash) cho những giấy bị lỗi do lệch mili-giây.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      confirmButtonColor: PRIMARY,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await authFetch('/api/certificate/admin/rehash-legacy', {
            method: 'POST',
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          Swal.fire('Thành công', `Đã sửa lỗi chữ ký cho ${data.rehashed} giấy chứng nhận legacy!`, 'success');
          load();
        } catch {
          toast.error('Có lỗi xảy ra khi rehash legacy');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / size) || 1;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `.swal2-container { z-index: 100000 !important; }` }} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(42,56,143,.3)' }}>
            <FontAwesomeIcon icon={faCertificate} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>Quản lý giấy chứng nhận tiêm chủng</h2>
            <div style={{ fontSize: 13, color: TEXT_2 }}>
              Tổng {total} giấy · {stats.totalActive} hợp lệ · {stats.totalRevoked} đã thu hồi
            </div>
          </div>
        </div>
        <button onClick={handleRehashLegacy} style={{
          padding: '8px 16px', borderRadius: 9, border: 'none',
          background: `linear-gradient(135deg, ${WARNING}, #f59e0b)`,
          color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 10px rgba(245,158,11,.3)'
        }}>
          <FontAwesomeIcon icon={faSync} /> Sửa lỗi chữ ký hàng loạt
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 18,
        border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10,
      }}>
        <div style={inputBox}>
          <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 13 }} />
          <input placeholder="Mã / Tên / CCCD / SĐT" value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            style={inputStyle} />
        </div>
        <div style={inputBox}>
          <FontAwesomeIcon icon={faSyringe} style={{ color: TEXT_2, fontSize: 13 }} />
          <input placeholder="Tên vaccine" value={vaccineName}
            onChange={e => setVaccineName(e.target.value)} style={inputStyle} />
        </div>
        <div style={inputBox}>
          <FontAwesomeIcon icon={faHospital} style={{ color: TEXT_2, fontSize: 13 }} />
          <input placeholder="Trung tâm" value={centerName}
            onChange={e => setCenterName(e.target.value)} style={inputStyle} />
        </div>
        <select value={revokedFlt} onChange={e => setRevokedFlt(e.target.value)}
          style={{ ...inputStyleRaw, padding: '8px 12px', border: `1.5px solid ${BORDER}`, borderRadius: 9 }}>
          <option value="">Tất cả trạng thái</option>
          <option value="false">✅ Hợp lệ</option>
          <option value="true">🚫 Đã thu hồi</option>
        </select>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: TEXT_2 }}>Từ</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ ...inputStyleRaw, padding: '7px 10px', border: `1.5px solid ${BORDER}`, borderRadius: 9 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: TEXT_2 }}>Đến</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ ...inputStyleRaw, padding: '7px 10px', border: `1.5px solid ${BORDER}`, borderRadius: 9 }} />
        </div>
        <button onClick={handleSearch} style={btnPrimary}>🔍 Lọc</button>
        <button onClick={handleReset} style={btnSecondary}>↺ Xóa filter</button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Mã giấy', 'Người tiêm', 'Vaccine', 'Mũi', 'Trung tâm', 'Ngày cấp', 'Trạng thái', 'Hành động'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={tdCenter}>Đang tải...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={8} style={tdCenter}>Không tìm thấy giấy nào</td></tr>
              ) : list.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px', fontFamily: "'Courier New', monospace",
                    fontWeight: 700, color: PRIMARY, fontSize: 13 }}>
                    {c.serialNo}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: TEXT, fontSize: 13.5 }}>{c.fullNameSnapshot || '—'}</div>
                    <div style={{ fontSize: 11.5, color: TEXT_2, marginTop: 2 }}>
                      {c.idCardSnapshot || '—'} · {c.phoneSnapshot || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13.5, color: TEXT }}>
                    {c.vaccineName || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: ACCENT, fontSize: 13 }}>
                    {c.doseNumber ? (c.totalDoses ? `${c.doseNumber}/${c.totalDoses}` : c.doseNumber) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: TEXT_2 }}>{c.centerName || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: TEXT_2, whiteSpace: 'nowrap' }}>
                    {fmtDate(c.issuedDate)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {c.revoked
                      ? <Pill color={DANGER}  bg="rgba(239,68,68,.1)">🚫 Đã thu hồi</Pill>
                      : <Pill color={SUCCESS} bg="rgba(16,185,129,.1)">✅ Hợp lệ</Pill>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionBtn icon={faEye} color={ACCENT} title="Xem chi tiết" onClick={() => openDetail(c.id)} />
                      <ActionBtn icon={faDownload} color={PRIMARY} title="Tải PDF" onClick={() => downloadFromTable(c.id)} />
                      {!c.revoked && (
                        <ActionBtn icon={faBan} color={DANGER} title="Thu hồi" onClick={() => openRevoke(c)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 18px', borderTop: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: TEXT_2 }}>Trang {page + 1} / {totalPages} · Tổng {total} giấy</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnPage(page === 0)}>← Trước</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ ...btnPage(false), background: p === page ? `linear-gradient(135deg,${PRIMARY},${ACCENT})` : '#fff',
                      color: p === page ? '#fff' : TEXT_2, fontWeight: 700 }}>{p + 1}</button>
                );
              })}
              <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnPage(page === totalPages - 1)}>Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
        title={`Chi tiết giấy ${detail?.serialNo || ''}`} width={680}>
        {detail && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Status banner */}
            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: detail.revoked ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)',
              border: `1px solid ${detail.revoked ? DANGER + '33' : SUCCESS + '33'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <FontAwesomeIcon icon={detail.revoked ? faTimesCircle : faCheckCircle}
                style={{ fontSize: 26, color: detail.revoked ? DANGER : SUCCESS }} />
              <div>
                <div style={{ fontWeight: 800, color: detail.revoked ? DANGER : SUCCESS, fontSize: 15 }}>
                  {detail.revoked ? 'Đã thu hồi' : 'Đang hợp lệ'}
                </div>
                {detail.revoked && (
                  <div style={{ fontSize: 12.5, color: TEXT_2, marginTop: 4 }}>
                    Lý do: <strong>{detail.revokedReason || '—'}</strong> <br/>
                    Bởi: {detail.revokedBy || '—'} · {fmtDateTime(detail.revokedDate)}
                  </div>
                )}
              </div>
            </div>

            <DetailSection icon={faUser} title="Người tiêm">
              <DetailRow label="Họ tên" value={detail.fullNameSnapshot} />
              <DetailRow label="CMND/CCCD" value={detail.idCardSnapshot} />
              <DetailRow label="Ngày sinh" value={fmtDate(detail.birthdateSnapshot)} />
              <DetailRow label="Điện thoại" value={detail.phoneSnapshot} />
              <DetailRow label="Email" value={detail.emailSnapshot} />
              <DetailRow label="Địa chỉ" value={detail.addressSnapshot} />
            </DetailSection>

            <DetailSection icon={faSyringe} title="Mũi tiêm">
              <DetailRow label="Tên vaccine" value={detail.vaccineName} />
              <DetailRow label="Loại" value={detail.vaccineType} />
              <DetailRow label="Nhà sản xuất" value={detail.vaccineManufacturer} />
              <DetailRow label="Mũi số"
                value={detail.doseNumber ? (detail.totalDoses ? `${detail.doseNumber}/${detail.totalDoses}` : detail.doseNumber) : '—'} />
              <DetailRow label="Ngày tiêm" value={fmtDateTime(detail.injectionDate)} />
            </DetailSection>

            <DetailSection icon={faHospital} title="Nơi tiêm">
              <DetailRow label="Trung tâm" value={detail.centerName} />
              <DetailRow label="Địa chỉ" value={detail.centerAddress} />
            </DetailSection>

            <DetailSection icon={faFileLines} title="Thông tin cấp giấy">
              <DetailRow label="Ngày cấp" value={fmtDateTime(detail.issuedDate)} />
              <DetailRow label="Đã khóa snapshot" value={detail.frozen ? `Có (${fmtDateTime(detail.frozenDate)})` : 'Chưa'} />
            </DetailSection>

            {/* Nút tải PDF ở cuối modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10,
              borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 4 }}>
              <button onClick={() => triggerRehash(detail.id)}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${WARNING}`,
                  background: 'transparent',
                  color: WARNING, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = WARNING; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = WARNING; }}
              >
                <FontAwesomeIcon icon={faKey} /> Sửa chữ ký (Rehash)
              </button>
              <button onClick={() => handleDownloadPdf(detail)}
                style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                  color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: `0 4px 14px ${ACCENT}55`,
                }}>
                <FontAwesomeIcon icon={faDownload} /> Tải PDF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Revoke Modal ── */}
      <Modal open={revokeOpen} onClose={() => setRevokeOpen(false)}
        title="Thu hồi giấy chứng nhận" width={520}>
        {revokeTarget && (
          <div>
            <div style={{
              padding: 14, background: '#fef3c7', border: `1px solid #fde68a`,
              borderRadius: 10, marginBottom: 18, fontSize: 13, color: '#92400e', lineHeight: 1.6,
            }}>
              ⚠️ Bạn đang chuẩn bị thu hồi giấy <strong>{revokeTarget.serialNo}</strong> của{' '}
              <strong>{revokeTarget.fullNameSnapshot}</strong> ({revokeTarget.vaccineName}).
              <br/>Sau khi thu hồi, mọi lần verify QR sẽ trả về <strong>KHÔNG HỢP LỆ</strong>.
              Hành động này <strong>không thể hoàn tác</strong>.
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_2,
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Lý do thu hồi <span style={{ color: DANGER }}>*</span>
            </label>
            <textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)}
              placeholder="VD: Tên khách hàng nhập sai, vaccine bị trùng số lô, phát hiện gian lận..."
              style={{
                width: '100%', minHeight: 90, padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${BORDER}`, fontSize: 14, color: TEXT,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }} />
            <div style={{ fontSize: 11, color: TEXT_2, marginTop: 4 }}>
              {revokeReason.length}/500 ký tự (tối thiểu 5)
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button onClick={() => setRevokeOpen(false)} style={btnSecondary}>Hủy</button>
              <button onClick={submitRevoke} disabled={revoking}
                style={{ ...btnPrimary, background: revoking ? '#94a3b8' : DANGER, cursor: revoking ? 'not-allowed' : 'pointer' }}>
                {revoking ? 'Đang thu hồi...' : '🚫 Thu hồi'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ── styles ── */
const th = { padding: '12px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 700,
  color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.4px',
  borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' };
const tdCenter = { padding: '40px 14px', textAlign: 'center', color: TEXT_2 };

const inputBox = { display: 'flex', alignItems: 'center', gap: 8,
  border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: '7px 12px' };
const inputStyleRaw = { border: 'none', outline: 'none', flex: 1,
  fontSize: 13.5, color: TEXT, background: 'transparent' };
const inputStyle = inputStyleRaw;

const btnPrimary = { padding: '9px 16px', borderRadius: 9, border: 'none',
  background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnSecondary = { padding: '9px 16px', borderRadius: 9,
  border: `1.5px solid ${BORDER}`, background: '#fff',
  color: TEXT_2, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnPage = (disabled) => ({
  minWidth: 36, height: 36, padding: '0 10px', borderRadius: 8,
  border: `1.5px solid ${BORDER}`, background: '#fff',
  color: TEXT_2, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? .4 : 1, fontWeight: 600,
});

/* ── Detail subcomponents ── */
function DetailSection({ icon, title, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        paddingBottom: 6, borderBottom: `2px solid ${ACCENT}33` }}>
        <FontAwesomeIcon icon={icon} style={{ color: ACCENT, fontSize: 14 }} />
        <span style={{ fontWeight: 800, color: PRIMARY, fontSize: 13, letterSpacing: '.3px',
          textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>{children}</div>
    </div>
  );
}
function DetailRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: TEXT_2, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: TEXT, fontWeight: 600,
        fontFamily: mono ? "'Courier New', monospace" : 'inherit',
        wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  );
}

export default AdminCertificates;
