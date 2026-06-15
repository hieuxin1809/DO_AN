import { useState, useEffect, useRef } from 'react';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { getMethod, putMethod, uploadSingleFile } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faSearch, faEdit, faEye, faX,
  faMapPin, faPhone,
} from '@fortawesome/free-solid-svg-icons';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';
const PAGE_SIZE = 10;

const pgCSS = `
.pg-kh{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.pg-kh li a{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s}
.pg-kh li a:hover{border-color:#2A388F;color:#2A388F;background:#eff6ff}
.pg-kh li.active a{background:linear-gradient(135deg,#2A388F,#0ea5e9);border-color:#2A388F;color:#fff}
.pg-kh li.disabled a{opacity:.4;cursor:not-allowed}
`;

/* ── helpers ── */
const inpStyle = (err) => ({
  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13.5, color: T,
  border: `1.5px solid ${err ? D : B}`, outline: 'none', boxSizing: 'border-box', background: '#fff',
});

const lblStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: T2,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '4px',
};
const ctrlStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: `1.5px solid ${B}`,
  borderRadius: '9px',
  padding: '8px 12px',
  background: '#fff',
  height: '38px',
  boxSizing: 'border-box',
};
const inpCtrlStyle = {
  border: 'none',
  outline: 'none',
  fontSize: '13.5px',
  color: T,
  background: 'transparent',
  width: '100%',
};
const selectCtrlStyle = {
  border: `1.5px solid ${B}`,
  borderRadius: '9px',
  padding: '8px 12px',
  fontSize: '13.5px',
  color: T,
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  width: '100%',
  height: '38px',
};
const dateCtrlStyle = {
  border: `1.5px solid ${B}`,
  borderRadius: '9px',
  padding: '8px 12px',
  fontSize: '13.5px',
  color: T,
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  width: '100%',
  height: '38px',
};
const clrStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: T2,
  padding: 0,
};
const btnResetStyle = {
  padding: '9px 14px',
  borderRadius: 9,
  border: `1.5px solid ${B}`,
  background: '#f8fafc',
  color: T2,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.15s',
  height: '38px',
};

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T, marginBottom: 5 }}>
        {label}{required && <span style={{ color: D }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: D, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function ModalOverlay({ open, onClose, title, children, footer, size = 680 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 18,
        width: '92%', maxWidth: size, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: T2, fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${B}`,
            display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name }) {
  const ch = (name || '?')[0].toUpperCase();
  const hue = ch.charCodeAt(0) * 47 % 360;
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, fontSize: 14, fontWeight: 800,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `hsl(${hue},60%,48%)` }}>
      {ch}
    </div>
  );
}

/* ════════════════════════════════════ */
const AdminKhachHang = () => {
  const [items,       setItems]       = useState([]);
  const [pageCount,   setPageCount]   = useState(0);
  const [curPage,     setCurPage]     = useState(0);
  const [total,       setTotal]       = useState(0);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [loading,     setLoading]     = useState(true);

  const [selGender, setSelGender]       = useState('');
  const [selCity, setSelCity]           = useState('');
  const [fromDate, setFromDate]         = useState('');
  const [toDate, setToDate]             = useState('');

  const [showDetail,  setShowDetail]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [editCustomer,setEditCustomer]= useState(null);
  const [errors,      setErrors]      = useState({});

  /* address */
  const [provinces,           setProvinces]           = useState([]);
  const [districts,           setDistricts]           = useState([]);
  const [wards,               setWards]               = useState([]);
  const [selectedProvinceCode,setSelectedProvinceCode]= useState('');
  const [selectedDistrictCode,setSelectedDistrictCode]= useState('');
  const [loadingDistricts,    setLoadingDistricts]    = useState(false);
  const [loadingWards,        setLoadingWards]        = useState(false);

  const avatarRef = useRef(null);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(r => r.json())
      .then(d => setProvinces(d))
      .catch(e => console.error(e));
  }, []);

  useEffect(() => {
    fetchPage(0);
  }, [searchTerm, selGender, selCity, fromDate, toDate]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelGender('');
    setSelCity('');
    setFromDate('');
    setToDate('');
  };

  const fetchPage = async (page) => {
    setLoading(true);
    try {
      let url = `/api/customer-profile/admin/list-customer?page=${page}&size=${PAGE_SIZE}&sort=id,asc`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selGender) url += `&gender=${selGender}`;
      if (selCity) url += `&city=${encodeURIComponent(selCity)}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;
      const res  = await getMethod(url);
      const data = await res.json();
      setItems(data.content || []);
      setPageCount(data.totalPages || 0);
      setTotal(data.totalElements || 0);
      setCurPage(page);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally  { setLoading(false); }
  };

  const handlePageClick = ({ selected }) => fetchPage(selected);

  const handleEditClick = async (item) => {
    setEditCustomer({ ...item });
    setErrors({});
    setDistricts([]);
    setWards([]);
    setSelectedProvinceCode('');
    setSelectedDistrictCode('');
    setShowEdit(true);

    if (item.city && provinces.length > 0) {
      const province = provinces.find(p => p.name === item.city);
      if (province) {
        setSelectedProvinceCode(String(province.code));
        try {
          setLoadingDistricts(true);
          const res  = await fetch(`https://provinces.open-api.vn/api/p/${province.code}?depth=2`);
          const data = await res.json();
          const distList = data.districts || [];
          setDistricts(distList);
          setLoadingDistricts(false);
          if (item.district) {
            const dist = distList.find(d => d.name === item.district);
            if (dist) {
              setSelectedDistrictCode(String(dist.code));
              setLoadingWards(true);
              const res2  = await fetch(`https://provinces.open-api.vn/api/d/${dist.code}?depth=2`);
              const data2 = await res2.json();
              setWards(data2.wards || []);
              setLoadingWards(false);
            }
          }
        } catch (err) {
          console.error(err);
          setLoadingDistricts(false);
          setLoadingWards(false);
        }
      }
    }
  };

  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    const name = provinces.find(p => String(p.code) === code)?.name || '';
    setSelectedProvinceCode(code);
    setSelectedDistrictCode('');
    setDistricts([]);
    setWards([]);
    setEditCustomer(prev => ({ ...prev, city: name, district: '', ward: '' }));
    if (errors.city) setErrors(prev => ({ ...prev, city: null }));
    if (!code) return;
    try {
      setLoadingDistricts(true);
      const res  = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
      const data = await res.json();
      setDistricts(data.districts || []);
    } catch (err) { console.error(err); }
    finally { setLoadingDistricts(false); }
  };

  const handleDistrictChange = async (e) => {
    const code = e.target.value;
    const name = districts.find(d => String(d.code) === code)?.name || '';
    setSelectedDistrictCode(code);
    setWards([]);
    setEditCustomer(prev => ({ ...prev, district: name, ward: '' }));
    if (errors.district) setErrors(prev => ({ ...prev, district: null }));
    if (!code) return;
    try {
      setLoadingWards(true);
      const res  = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
      const data = await res.json();
      setWards(data.wards || []);
    } catch (err) { console.error(err); }
    finally { setLoadingWards(false); }
  };

  const validateForm = () => {
    const errs = {};
    const phoneRe = /^[0-9]{9,11}$/;
    if (!editCustomer.fullName?.trim())  errs.fullName = 'Họ tên không được để trống';
    if (!editCustomer.birthdate) {
      errs.birthdate = 'Ngày sinh không được để trống';
    } else if (new Date(editCustomer.birthdate) >= new Date()) {
      errs.birthdate = 'Ngày sinh phải là ngày trong quá khứ';
    }
    if (!editCustomer.phone?.trim())          errs.phone = 'Số điện thoại không được để trống';
    else if (!phoneRe.test(editCustomer.phone.trim())) errs.phone = 'Số điện thoại phải từ 9–11 chữ số';
    if (!editCustomer.street?.trim())         errs.street = 'Đường/Số nhà không được để trống';
    if (!editCustomer.city)                   errs.city = 'Vui lòng chọn tỉnh/thành phố';
    if (!editCustomer.district)               errs.district = 'Vui lòng chọn quận/huyện';
    if (!editCustomer.ward)                   errs.ward = 'Vui lòng chọn phường/xã';
    if (editCustomer.contactPhone?.trim() && !phoneRe.test(editCustomer.contactPhone.trim()))
      errs.contactPhone = 'SĐT người liên hệ phải từ 9–11 chữ số';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = async () => {
    if (!editCustomer || !validateForm()) { toast.warning('Vui lòng kiểm tra lại thông tin!'); return; }
    if (avatarRef.current?.files.length > 0) {
      const url = await uploadSingleFile(avatarRef.current);
      if (url) editCustomer.avatar = url;
    }
    const res = await putMethod(`/api/customer-profile/admin/update/${editCustomer.id}`, editCustomer);
    if (res.status < 300) {
      toast.success('Cập nhật thành công!');
      fetchPage(curPage);
      setShowEdit(false);
    } else {
      const d = await res.json();
      toast.error(d.defaultMessage || 'Có lỗi xảy ra');
    }
  };

  const selStyle = (err) => ({ ...inpStyle(err), cursor: 'pointer', appearance: 'auto' });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg,${P},${A})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(42,56,143,.3)` }}>
            <FontAwesomeIcon icon={faUsers} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T }}>Khách hàng</h2>
            <div style={{ fontSize: 13, color: T2 }}>Tổng {total} khách hàng</div>
          </div>
        </div>
      </div>

      {/* ── filter bar ── */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 18,
        border: `1px solid ${B}`, boxShadow: '0 1px 6px rgba(0,0,0,.04)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px',
      }}>
        {/* Tìm kiếm */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={lblStyle}>Tìm kiếm</label>
          <div style={ctrlStyle}>
            <FontAwesomeIcon icon={faSearch} style={{ color: T2, fontSize: 13 }} />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Họ tên, SĐT, Email..."
              style={inpCtrlStyle} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={clrStyle}>
                <FontAwesomeIcon icon={faX} style={{ fontSize: 10 }} />
              </button>
            )}
          </div>
        </div>

        {/* Giới tính */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={lblStyle}>Giới tính</label>
          <select value={selGender} onChange={e => setSelGender(e.target.value)} style={selectCtrlStyle}>
            <option value="">Tất cả</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>

        {/* Tỉnh/Thành phố */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={lblStyle}>Tỉnh/Thành phố</label>
          <select value={selCity} onChange={e => setSelCity(e.target.value)} style={selectCtrlStyle}>
            <option value="">Tất cả</option>
            {provinces.map(p => (
              <option key={p.code} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Từ ngày */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={lblStyle}>Từ ngày tạo</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={dateCtrlStyle} />
        </div>

        {/* Đến ngày */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={lblStyle}>Đến ngày tạo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={dateCtrlStyle} />
            {(searchTerm || selGender || selCity || fromDate || toDate) && (
              <button onClick={handleResetFilters} style={btnResetStyle}>Reset</button>
            )}
          </div>
        </div>
      </div>

      {/* ── table card ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${B}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Khách hàng','Giới tính','Ngày sinh','Số điện thoại','Người liên hệ','Hành động'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '.4px',
                    borderBottom: `1px solid ${B}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 52, textAlign: 'center', color: T2 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 52, textAlign: 'center', color: T2 }}>
                  {searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : 'Chưa có khách hàng nào'}
                </td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id}
                  style={{ borderBottom: `1px solid ${B}`, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 18px', color: T2, fontWeight: 600, fontSize: 13 }}>
                    {curPage * PAGE_SIZE + idx + 1}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.avatar
                        ? <img src={item.avatar} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                        : <Avatar name={item.fullName} />
                      }
                      <span style={{ fontWeight: 700, color: T }}>{item.fullName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: item.gender === 'Male' ? 'rgba(14,165,233,.08)' : 'rgba(236,72,153,.08)',
                      color: item.gender === 'Male' ? A : '#ec4899' }}>
                      {item.gender === 'Male' ? '♂ Nam' : '♀ Nữ'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', color: T2, fontSize: 13 }}>{item.birthdate || '—'}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T2, fontSize: 13 }}>
                      <FontAwesomeIcon icon={faPhone} style={{ color: S, fontSize: 11 }} />
                      {item.phone || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', color: T2, fontSize: 13 }}>{item.contactName || '—'}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {/* detail */}
                      <button onClick={() => { setSelected(item); setShowDetail(true); }} title="Xem chi tiết" style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${A}22`, background: `${A}11`, color: A, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${A}11`; e.currentTarget.style.color = A; }}>
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      {/* edit */}
                      <button onClick={() => handleEditClick(item)} title="Sửa" style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${W}22`, background: `${W}11`, color: W, cursor: 'pointer', fontSize: 14, transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = W; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${W}11`; e.currentTarget.style.color = W; }}>
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {pageCount > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: T2 }}>
              Trang {curPage + 1} / {pageCount} &nbsp;·&nbsp; Tổng {total} khách hàng
            </span>
            <ReactPaginate
              pageCount={pageCount} marginPagesDisplayed={1} pageRangeDisplayed={5}
              onPageChange={handlePageClick} forcePage={curPage}
              containerClassName="pg-kh"
              activeClassName="active" disabledClassName="disabled"
              previousLabel="← Trước" nextLabel="Sau →"
            />
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <ModalOverlay open={showDetail} onClose={() => setShowDetail(false)} title="Thông tin khách hàng" size={560}
        footer={
          <button onClick={() => setShowDetail(false)} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Đóng</button>
        }>
        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
              padding: '16px 18px', background: '#f8fafc', borderRadius: 12 }}>
              {selected.avatar
                ? <img src={selected.avatar} alt="" style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover' }} />
                : <Avatar name={selected.fullName} />
              }
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: T }}>{selected.fullName}</div>
                <div style={{ fontSize: 13, color: T2, marginTop: 3 }}>
                  {selected.gender === 'Male' ? 'Nam' : 'Nữ'} &nbsp;·&nbsp; {selected.birthdate}
                </div>
              </div>
            </div>
            {[
              ['Số điện thoại', selected.phone],
              ['Địa chỉ', [selected.street, selected.ward, selected.district, selected.city].filter(Boolean).join(', ')],
              ['Người liên hệ', selected.contactName],
              ['Mối quan hệ', selected.contactRelationship],
              ['SĐT liên hệ', selected.contactPhone],
              ['Ngày tạo', selected.createdDate ? new Date(selected.createdDate).toLocaleDateString('vi-VN') : '—'],
            ].map(([k, v]) => v ? (
              <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${B}` }}>
                <span style={{ minWidth: 130, fontSize: 13, fontWeight: 700, color: T2 }}>{k}</span>
                <span style={{ fontSize: 13.5, color: T, flex: 1 }}>{v}</span>
              </div>
            ) : null)}
          </div>
        )}
      </ModalOverlay>

      {/* ── Edit Modal ── */}
      <ModalOverlay open={showEdit} onClose={() => setShowEdit(false)}
        title={`Cập nhật: ${editCustomer?.fullName || ''}`} size={680}
        footer={<>
          <button onClick={() => setShowEdit(false)} style={{
            padding: '9px 22px', borderRadius: 9, border: `1.5px solid ${B}`,
            background: '#fff', color: T2, fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Hủy</button>
          <button onClick={handleUpdate} style={{
            padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${P},${A})`, color: '#fff', fontWeight: 700, fontSize: 14,
          }}>Cập nhật</button>
        </>}>
        {editCustomer && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ paddingRight: 12 }}>
                <Field label="Họ tên" required error={errors.fullName}>
                  <input style={inpStyle(errors.fullName)} value={editCustomer.fullName || ''}
                    onChange={e => { setEditCustomer({ ...editCustomer, fullName: e.target.value });
                      if (errors.fullName) setErrors({ ...errors, fullName: null }); }} />
                </Field>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <Field label="Giới tính">
                  <select style={selStyle(false)} value={editCustomer.gender}
                    onChange={e => setEditCustomer({ ...editCustomer, gender: e.target.value })}>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ paddingRight: 12 }}>
                <Field label="Ngày sinh" required error={errors.birthdate}>
                  <input type="date" style={inpStyle(errors.birthdate)} value={editCustomer.birthdate || ''}
                    onChange={e => { setEditCustomer({ ...editCustomer, birthdate: e.target.value });
                      if (errors.birthdate) setErrors({ ...errors, birthdate: null }); }} />
                </Field>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <Field label="Số điện thoại" required error={errors.phone}>
                  <input style={inpStyle(errors.phone)} value={editCustomer.phone || ''}
                    onChange={e => { setEditCustomer({ ...editCustomer, phone: e.target.value });
                      if (errors.phone) setErrors({ ...errors, phone: null }); }} />
                </Field>
              </div>
            </div>

            {/* address */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T, marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <FontAwesomeIcon icon={faMapPin} style={{ color: P }} /> Địa chỉ
              </div>
              <Field label="Tỉnh / Thành phố" required error={errors.city}>
                <select style={selStyle(errors.city)} value={selectedProvinceCode} onChange={handleProvinceChange}>
                  <option value="">-- Chọn Tỉnh/Thành phố --</option>
                  {provinces.map(p => <option key={p.code} value={String(p.code)}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Quận / Huyện" required error={errors.district}>
                <select style={selStyle(errors.district)} value={selectedDistrictCode} onChange={handleDistrictChange}
                  disabled={!selectedProvinceCode || loadingDistricts}>
                  <option value="">{loadingDistricts ? 'Đang tải...' : '-- Chọn Quận/Huyện --'}</option>
                  {districts.map(d => <option key={d.code} value={String(d.code)}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Phường / Xã" required error={errors.ward}>
                <select style={selStyle(errors.ward)} value={editCustomer.ward || ''}
                  onChange={e => { setEditCustomer({ ...editCustomer, ward: e.target.value });
                    if (errors.ward) setErrors({ ...errors, ward: null }); }}
                  disabled={!selectedDistrictCode || loadingWards}>
                  <option value="">{loadingWards ? 'Đang tải...' : '-- Chọn Phường/Xã --'}</option>
                  {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
                </select>
              </Field>
              <Field label="Số nhà / Tên đường" required error={errors.street}>
                <input style={inpStyle(errors.street)} placeholder="Số nhà, tên đường" value={editCustomer.street || ''}
                  onChange={e => { setEditCustomer({ ...editCustomer, street: e.target.value });
                    if (errors.street) setErrors({ ...errors, street: null }); }} />
              </Field>
            </div>

            {/* contact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ paddingRight: 12 }}>
                <Field label="Người liên hệ">
                  <input style={inpStyle(false)} value={editCustomer.contactName || ''}
                    onChange={e => setEditCustomer({ ...editCustomer, contactName: e.target.value })} />
                </Field>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <Field label="Mối quan hệ">
                  <input style={inpStyle(false)} value={editCustomer.contactRelationship || ''}
                    onChange={e => setEditCustomer({ ...editCustomer, contactRelationship: e.target.value })} />
                </Field>
              </div>
            </div>
            <Field label="SĐT người liên hệ" error={errors.contactPhone}>
              <input style={inpStyle(errors.contactPhone)} value={editCustomer.contactPhone || ''}
                onChange={e => { setEditCustomer({ ...editCustomer, contactPhone: e.target.value });
                  if (errors.contactPhone) setErrors({ ...errors, contactPhone: null }); }} />
            </Field>
            <Field label="Ảnh đại diện">
              <input type="file" ref={avatarRef} accept="image/*" style={{ ...inpStyle(false), padding: '7px 12px' }} />
              {editCustomer.avatar && (
                <img src={editCustomer.avatar} alt="Avatar" style={{ maxWidth: 120, marginTop: 10, borderRadius: 10 }} />
              )}
            </Field>
          </div>
        )}
      </ModalOverlay>
    </div>
  );
};

export default AdminKhachHang;
