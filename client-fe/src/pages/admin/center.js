import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { getMethod, deleteMethod } from '../../services/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faLocationDot, faSearch, faX, faMapPin } from '@fortawesome/free-solid-svg-icons';

const P = '#2A388F', A = '#0ea5e9', S = '#10b981', D = '#ef4444', W = '#f59e0b';
const B = '#e2e8f0', T = '#1e293b', T2 = '#64748b';

const pgCSS = `
.pg-center{display:flex;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.pg-center li a{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s}
.pg-center li a:hover{border-color:${P};color:${P};background:#eff6ff}
.pg-center li.active a{background:linear-gradient(135deg,${P},${A});border-color:${P};color:#fff}
.pg-center li.disabled a{opacity:.4;cursor:not-allowed}
`;

const CenterAdmin = () => {
  const [items,   setItems]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

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
        <a href="add-center" style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
          borderRadius:10, textDecoration:'none', border:'none', fontWeight:700, fontSize:14,
          color:'#fff', background:`linear-gradient(135deg,${P},${A})`,
          boxShadow:`0 4px 14px rgba(42,56,143,.3)`,
        }}>
          <FontAwesomeIcon icon={faPlus} /> Thêm trung tâm
        </a>
      </div>

      {/* stat chips */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:18 }}>
        {[
          { label:'Tổng trung tâm', v:items.length, c:P },
          { label:'Hà Nội', v:items.filter(c=>c.city?.includes('Hà Nội')||c.city?.includes('Ha Noi')).length, c:A },
          { label:'TP.HCM', v:items.filter(c=>c.city?.includes('Hồ Chí Minh')||c.city?.includes('Ho Chi Minh')).length, c:S },
        ].map(s=>(
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 16px',
            background:'#fff', borderRadius:10, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:s.c }} />
            <span style={{ fontSize:17, fontWeight:800, color:s.c }}>{s.v}</span>
            <span style={{ fontSize:12.5, color:T2 }}>{s.label}</span>
          </div>
        ))}
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
                      <a href={`add-center?id=${c.id}`} title="Sửa" style={{
                        width:34, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                        border:`1.5px solid ${W}22`, background:`${W}11`, color:W, textDecoration:'none', fontSize:14, transition:'all .15s',
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.background=W;e.currentTarget.style.color='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=`${W}11`;e.currentTarget.style.color=W}}>
                        <FontAwesomeIcon icon={faEdit}/>
                      </a>
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
    </div>
  );
};

export default CenterAdmin;
