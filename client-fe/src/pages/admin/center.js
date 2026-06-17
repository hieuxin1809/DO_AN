import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { getMethod, deleteMethod, postMethodPayload } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faLocationDot, faSearch, faX, faMapPin, faSave,
} from '@fortawesome/free-solid-svg-icons';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';

const pgCSS = `
.pg-center{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.pg-center li a{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s}
.pg-center li a:hover{border-color:${P};color:${P};background:#eff6ff}
.pg-center li.active a{background:linear-gradient(135deg,${P},${A});border-color:${P};color:#fff}
.pg-center li.disabled a{opacity:.4;cursor:not-allowed}
`;

const EMPTY_FORM = { centerName: '', city: '', district: '', ward: '', street: '' };

const CenterAdmin = () => {
  const [items,   setItems]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  /* ─── Modal state ─── */
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);    // null = create, number = edit
  const [form,      setForm]        = useState(EMPTY_FORM);
  const [saving,    setSaving]      = useState(false);

  /* ─── Địa chỉ VN (load 1 lần) ─── */
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards,     setWards]     = useState([]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=3')
      .then(r => r.json())
      .then(setProvinces)
      .catch(() => {});
  }, []);

  /* Khi mở modal Edit trước lúc provinces load xong → re-populate khi provinces về */
  useEffect(() => {
    if (!showModal || !editingId || !form.city || provinces.length === 0) return;
    if (districts.length > 0) return; // đã có rồi → khỏi load lại
    const prov = provinces.find(p => p.name === form.city);
    if (prov) {
      setDistricts(prov.districts);
      const dist = prov.districts.find(d => d.name === form.district);
      if (dist) setWards(dist.wards);
    }
  }, [provinces, showModal, editingId, form.city, form.district, districts.length]);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await getMethod('/api/center/public/find-all');
      setItems(await res.json());
    } catch { toast.error('Không thể tải danh sách'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Xóa trung tâm?',
      html: `Bạn có chắc muốn xóa <strong>${name}</strong>?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: D, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    });
    if (!isConfirmed) return;
    const res = await deleteMethod('/api/center/admin/delete?id=' + id);
    if (res.status < 300) { toast.success('Xóa thành công!'); load(); }
    else if (res.status === 417) { const d = await res.json(); toast.warning(d.defaultMessage); }
    else toast.error('Xóa thất bại!');
  };

  /* ─── Mở modal create ─── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDistricts([]);
    setWards([]);
    setShowModal(true);
  };

  /* ─── Mở modal edit (load lại districts/wards theo city + district hiện tại) ─── */
  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      centerName: c.centerName || '',
      city:       c.city || '',
      district:   c.district || '',
      ward:       c.ward || '',
      street:     c.street || '',
    });
    // Khi provinces đã load xong, populate districts/wards
    const prov = provinces.find(p => p.name === c.city);
    if (prov) {
      setDistricts(prov.districts);
      const dist = prov.districts.find(d => d.name === c.district);
      setWards(dist ? dist.wards : []);
    } else {
      setDistricts([]);
      setWards([]);
    }
    setShowModal(true);
  };

  /* ─── Handlers dropdown địa chỉ ─── */
  const onCityChange = (cityName) => {
    const prov = provinces.find(p => p.name === cityName);
    setDistricts(prov ? prov.districts : []);
    setWards([]);
    setForm(f => ({ ...f, city: cityName, district: '', ward: '' }));
  };
  const onDistrictChange = (distName) => {
    const dist = districts.find(d => d.name === distName);
    setWards(dist ? dist.wards : []);
    setForm(f => ({ ...f, district: distName, ward: '' }));
  };

  /* ─── Submit create/update ─── */
  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.centerName.trim() || !form.city || !form.district || !form.ward || !form.street.trim()) {
      toast.warning('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, id: editingId };
      const url = editingId ? '/api/center/admin/update' : '/api/center/admin/create';
      const res = await postMethodPayload(url, payload);
      if (res.status < 300) {
        toast.success(editingId ? 'Cập nhật thành công!' : 'Thêm trung tâm thành công!');
        setShowModal(false);
        load();
      } else if (res.status === 417) {
        const d = await res.json();
        toast.warning(d.defaultMessage);
      } else {
        toast.error('Lưu thất bại!');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? items.filter(c => (c.centerName + c.city + c.district + c.ward).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{pgCSS}</style>

      {/* header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${P},${A})`,
            display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px rgba(42,56,143,.3)` }}>
            <FontAwesomeIcon icon={faLocationDot} style={{ color:'#fff', fontSize:20 }} />
          </div>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:T }}>Trung tâm tiêm chủng</h2>
            <div style={{ fontSize:13, color:T2 }}>Tổng {items.length} trung tâm trong hệ thống</div>
          </div>
        </div>
        <button onClick={openCreate} style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
          borderRadius:10, border:'none', fontWeight:700, fontSize:14, cursor:'pointer',
          color:'#fff', background:`linear-gradient(135deg,${P},${A})`,
          boxShadow:`0 4px 14px rgba(42,56,143,.3)`,
          transition:'transform .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <FontAwesomeIcon icon={faPlus} /> Thêm trung tâm
        </button>
      </div>



      {/* table card */}
      <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:`1px solid ${B}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
        {/* search */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', gap:10 }}>
          <FontAwesomeIcon icon={faSearch} style={{ color:T2, fontSize:14, flexShrink:0 }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm theo tên, thành phố, quận huyện..."
            style={{ flex:1, border:'none', outline:'none', fontSize:14, color:T, background:'transparent' }} />
          {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:T2 }}>
            <FontAwesomeIcon icon={faX} /></button>}
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['#','Trung tâm','Thành phố','Quận / Huyện','Phường / Xã','Địa chỉ','Hành động'].map(h=>(
                  <th key={h} style={{ padding:'12px 18px', textAlign:'left', fontSize:12, fontWeight:700,
                    color:T2, textTransform:'uppercase', letterSpacing:'.4px', borderBottom:`1px solid ${B}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:48, textAlign:'center', color:T2 }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:48, textAlign:'center', color:T2 }}>
                  {search ? `Không tìm thấy kết quả cho "${search}"` : 'Chưa có trung tâm nào'}
                </td></tr>
              ) : filtered.map((c, idx)=>(
                <tr key={c.id} style={{ borderBottom:`1px solid ${B}`, transition:'background .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'14px 18px', color:T2, fontWeight:600 }}>{idx+1}</td>
                  <td style={{ padding:'14px 18px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:`rgba(42,56,143,.08)`,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <FontAwesomeIcon icon={faMapPin} style={{ color:P, fontSize:14 }} />
                      </div>
                      <span style={{ fontWeight:700, color:T }}>{c.centerName}</span>
                    </div>
                  </td>
                  <td style={{ padding:'14px 18px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                      background:`rgba(14,165,233,.08)`, color:A }}>{c.city||'—'}</span>
                  </td>
                  <td style={{ padding:'14px 18px', color:T2, fontSize:13.5 }}>{c.district||'—'}</td>
                  <td style={{ padding:'14px 18px', color:T2, fontSize:13.5 }}>{c.ward||'—'}</td>
                  <td style={{ padding:'14px 18px', color:T2, fontSize:13 }}>{c.street||'—'}</td>
                  <td style={{ padding:'14px 18px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => openEdit(c)} title="Sửa" style={{
                        width:34, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                        border:`1.5px solid ${W}22`, background:`${W}11`, color:W, cursor:'pointer', fontSize:14, transition:'all .15s',
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.background=W;e.currentTarget.style.color='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=`${W}11`;e.currentTarget.style.color=W}}>
                        <FontAwesomeIcon icon={faEdit}/>
                      </button>
                      <button onClick={()=>handleDelete(c.id, c.centerName)} title="Xóa" style={{
                        width:34, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                        border:`1.5px solid ${D}22`, background:`${D}11`, color:D, cursor:'pointer', fontSize:14, transition:'all .15s',
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.background=D;e.currentTarget.style.color='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=`${D}11`;e.currentTarget.style.color=D}}>
                        <FontAwesomeIcon icon={faTrash}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ MODAL Add/Edit ═══ */}
      {showModal && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16,
        }}
          onClick={() => !saving && setShowModal(false)}>
          {/* overlay */}
          <div style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.55)', backdropFilter:'blur(3px)' }} />

          {/* modal box */}
          <form onSubmit={handleSave} onClick={e => e.stopPropagation()} style={{
            position:'relative', background:'#fff', borderRadius:16,
            width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto',
            boxShadow:'0 24px 60px rgba(0,0,0,.22)',
          }}>
            {/* header */}
            <div style={{
              background:`linear-gradient(135deg,${P},${A})`,
              padding:'18px 24px', borderRadius:'16px 16px 0 0',
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <div style={{ color:'#fff' }}>
                <div style={{ fontSize:11.5, opacity:0.85, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase' }}>
                  {editingId ? 'Cập nhật' : 'Tạo mới'}
                </div>
                <div style={{ fontSize:18, fontWeight:800, marginTop:2 }}>
                  {editingId ? 'Sửa trung tâm tiêm chủng' : 'Thêm trung tâm tiêm chủng'}
                </div>
              </div>
              <button type="button" onClick={() => !saving && setShowModal(false)} disabled={saving} style={{
                background:'rgba(255,255,255,.18)', border:'none', color:'#fff',
                borderRadius:8, width:30, height:30, cursor:saving?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>

            {/* body */}
            <div style={{ padding:'22px 24px' }}>
              <Field label="Tên trung tâm *">
                <Input value={form.centerName}
                  onChange={e => setForm(f => ({ ...f, centerName: e.target.value }))}
                  placeholder="VD: VaxFUDA Cầu Giấy" autoFocus />
              </Field>

              <Field label="Thành phố / Tỉnh *">
                <Select value={form.city} onChange={e => onCityChange(e.target.value)}>
                  <option value="">— Chọn Tỉnh/Thành phố —</option>
                  {provinces.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                </Select>
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Quận / Huyện *">
                  <Select value={form.district} onChange={e => onDistrictChange(e.target.value)} disabled={!form.city}>
                    <option value="">— Chọn —</option>
                    {districts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                  </Select>
                </Field>
                <Field label="Phường / Xã *">
                  <Select value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} disabled={!form.district}>
                    <option value="">— Chọn —</option>
                    {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label="Số nhà, Tên đường *">
                <Input value={form.street}
                  onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                  placeholder="VD: 123 Cầu Giấy" />
              </Field>

              {/* preview address */}
              {(form.street || form.ward || form.district || form.city) && (
                <div style={{
                  marginTop:8, padding:'10px 14px', borderRadius:10,
                  background:'#eff6ff', border:`1px solid ${A}33`,
                  fontSize:13, color:'#1e40af',
                  display:'flex', alignItems:'flex-start', gap:8,
                }}>
                  <FontAwesomeIcon icon={faMapPin} style={{ marginTop:2, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Địa chỉ đầy đủ</div>
                    <div>
                      {[form.street, form.ward, form.district, form.city].filter(Boolean).join(', ') || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div style={{
              padding:'14px 24px', borderTop:`1px solid ${B}`,
              display:'flex', justifyContent:'flex-end', gap:10, background:'#f8fafc',
              borderRadius:'0 0 16px 16px',
            }}>
              <button type="button" onClick={() => !saving && setShowModal(false)} disabled={saving} style={{
                padding:'10px 18px', borderRadius:10, border:`1.5px solid ${B}`,
                background:'#fff', color:T2, fontWeight:600, fontSize:13.5,
                cursor:saving?'not-allowed':'pointer',
              }}>
                Hủy
              </button>
              <button type="submit" disabled={saving} style={{
                padding:'10px 22px', borderRadius:10, border:'none',
                background:saving ? '#94a3b8' : `linear-gradient(135deg,${P},${A})`,
                color:'#fff', fontWeight:700, fontSize:13.5,
                cursor:saving?'not-allowed':'pointer',
                display:'flex', alignItems:'center', gap:7,
                boxShadow:saving?'none':`0 4px 14px ${P}40`,
              }}>
                <FontAwesomeIcon icon={faSave} /> {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ─── Helpers cho modal form ─── */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:T2,
        textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
function Input(props) {
  return (
    <input {...props} style={{
      width:'100%', boxSizing:'border-box', padding:'10px 14px',
      borderRadius:10, border:`1.5px solid ${B}`, background:'#fff',
      fontSize:14, color:T, outline:'none', fontFamily:'inherit',
      transition:'border-color .15s',
    }}
      onFocus={e => e.target.style.borderColor = A}
      onBlur={e => e.target.style.borderColor = B} />
  );
}
function Select({ children, ...props }) {
  return (
    <select {...props} style={{
      width:'100%', boxSizing:'border-box', padding:'10px 14px',
      borderRadius:10, border:`1.5px solid ${B}`, background:'#fff',
      fontSize:14, color:T, outline:'none', cursor:props.disabled?'not-allowed':'pointer',
      opacity:props.disabled?.6:1,
    }}
      onFocus={e => e.target.style.borderColor = A}
      onBlur={e => e.target.style.borderColor = B}>
      {children}
    </select>
  );
}

export default CenterAdmin;
