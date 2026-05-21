import { useState, useEffect } from 'react';
import { getMethod } from '../../services/request';
import { formatMoney } from '../../services/money';
import ReactPaginate from 'react-paginate';

/* ── palette ──────────────────────────────────── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';
const BORDER  = '#e2e8f0';
const BG_ROW  = '#f8fafc';

/* ══════════════════════════════════════════════ */
var scheduleSize = 10;
var url = '';

function LichTiemDaQua() {
    const [item,      setItem]      = useState([]);
    const [schedule,  setSchedule]  = useState(null);
    const [pageCount, setpageCount] = useState(0);
    const [inputVal,  setInputVal]  = useState('');

    useEffect(() => {
        const getItem = async () => {
            url = '/api/vaccine-schedule/public/pre-schedule?size=' + scheduleSize;
            const res    = await getMethod(url + '&page=0');
            const result = await res.json();
            setItem(result.content);
            setpageCount(result.totalPages);
        };
        getItem();
    }, []);

    async function searchSchedule(val) {
        url = '/api/vaccine-schedule/public/pre-schedule?size=' + scheduleSize + '&param=' + val;
        const res    = await getMethod(url + '&page=0');
        const result = await res.json();
        setItem(result.content);
        setpageCount(result.totalPages);
    }

    const handlePageClick = async (data) => {
        const res    = await getMethod(url + '&page=' + data.selected);
        const result = await res.json();
        setItem(result.content);
        setpageCount(result.totalPages);
    };

    return (
        <div style={{ background: '#f0f4f8', minHeight: '80vh' }}>

            {/* ── Hero ────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)',
                padding: '44px 24px 60px',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:'-50px', left:'15%', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>

                <div style={{ maxWidth:'900px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
                    {/* breadcrumb */}
                    <div style={{ marginBottom:'16px', fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
                        <a href="/" style={{ color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>Trang chủ</a>
                        <span style={{ margin:'0 8px' }}>›</span>
                        <a href="/tra-cuu-lich-tiem" style={{ color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>Tra cứu lịch tiêm</a>
                        <span style={{ margin:'0 8px' }}>›</span>
                        <span style={{ color:'#fff' }}>Lịch đã qua</span>
                    </div>

                    <h1 style={{ color:'#fff', fontSize:'28px', fontWeight:'800', margin:'0 0 10px', letterSpacing:'-0.5px' }}>
                        📆 Lịch Tiêm Chủng Đã Qua
                    </h1>
                    <p style={{ color:'rgba(255,255,255,0.72)', fontSize:'15px', margin:'0 0 28px' }}>
                        Xem lại các đợt tiêm chủng đã được tổ chức trước đây
                    </p>

                    {/* Search */}
                    <div style={{
                        display:'flex', gap:'10px', maxWidth:'560px', margin:'0 auto',
                        background:'rgba(255,255,255,0.1)', borderRadius:'50px',
                        padding:'6px 6px 6px 20px',
                        border:'1.5px solid rgba(255,255,255,0.18)',
                    }}>
                        <input
                            id="searchschedule"
                            value={inputVal}
                            onChange={e => { setInputVal(e.target.value); searchSchedule(e.target.value); }}
                            placeholder="Nhập tên vaccine để tìm kiếm..."
                            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:'14px', fontFamily:'inherit' }}
                        />
                        <button
                            onClick={() => searchSchedule(inputVal)}
                            style={{
                                padding:'10px 22px', borderRadius:'40px',
                                background:'rgba(255,255,255,0.2)',
                                color:'#fff', border:'1px solid rgba(255,255,255,0.3)',
                                fontWeight:'700', fontSize:'13.5px', cursor:'pointer', whiteSpace:'nowrap',
                            }}
                        >
                            🔍 Tìm kiếm
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ─────────────────────────────── */}
            <div style={{ maxWidth:'1200px', margin:'-24px auto 0', padding:'0 20px 60px', position:'relative', zIndex:2 }}>

                {/* top bar */}
                <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    flexWrap:'wrap', gap:'10px',
                    background:'#fff', borderRadius:'14px', padding:'14px 20px',
                    boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1px solid ${BORDER}`,
                    marginBottom:'16px',
                }}>
                    <span style={{ background:'rgba(71,85,105,0.1)', color:'#475569', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:'700' }}>
                        📋 {item.length} lịch tiêm đã qua
                    </span>
                    <a
                        href="/tra-cuu-lich-tiem"
                        style={{
                            display:'inline-flex', alignItems:'center', gap:'6px',
                            fontSize:'13.5px', color:ACCENT, fontWeight:'600',
                            textDecoration:'none', padding:'7px 16px',
                            border:`1.5px solid ${ACCENT}`, borderRadius:'8px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background=ACCENT; e.currentTarget.style.color='#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=ACCENT; }}
                    >
                        🗓 Xem lịch sắp tới
                    </a>
                </div>

                {/* Table */}
                <div style={{ background:'#fff', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1px solid ${BORDER}` }}>
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13.5px', color:TEXT }}>
                            <thead>
                                <tr style={{ background:'linear-gradient(90deg, #334155 0%, #475569 100%)', color:'#fff' }}>
                                    {['#', 'Vaccine', 'Nhà sản xuất', 'Giá bán', 'Thời gian tiêm', 'Giới hạn', 'Trung tâm'].map((h, i) => (
                                        <th key={i} style={{ padding:'13px 14px', fontWeight:'700', textAlign:'left', fontSize:'12px', letterSpacing:'0.4px', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {item.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ padding:'56px', textAlign:'center', color:TEXT_2 }}>
                                            <div style={{ fontSize:'36px', marginBottom:'12px' }}>📆</div>
                                            Không tìm thấy lịch tiêm nào
                                        </td>
                                    </tr>
                                )}
                                {item.map((it, index) => (
                                    <tr
                                        key={index}
                                        onClick={() => setSchedule(it)}
                                        data-bs-toggle="modal"
                                        data-bs-target="#scheduleModal"
                                        style={{
                                            background: index % 2 === 0 ? '#fff' : BG_ROW,
                                            borderBottom:`1px solid ${BORDER}`,
                                            cursor:'pointer', transition:'background 0.15s',
                                            opacity: 0.85,
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background='rgba(71,85,105,0.06)'; e.currentTarget.style.opacity='1'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background= index % 2 === 0 ? '#fff' : BG_ROW; e.currentTarget.style.opacity='0.85'; }}
                                    >
                                        <td style={{ padding:'13px 14px', color:TEXT_2, fontWeight:'600' }}>{index + 1}</td>
                                        <td style={{ padding:'13px 14px', maxWidth:'180px' }}>
                                            <div style={{ fontWeight:'700', color:'#475569', lineHeight:'1.4' }}>{it.vaccine.name}</div>
                                            <div style={{ fontSize:'12px', color:TEXT_2, marginTop:'2px' }}>{it.vaccine.vaccineType?.typeName}</div>
                                        </td>
                                        <td style={{ padding:'13px 14px', whiteSpace:'nowrap' }}>
                                            <div style={{ fontWeight:'600' }}>{it.vaccine.manufacturer.name}</div>
                                            <div style={{ fontSize:'12px', color:TEXT_2 }}>🌍 {it.vaccine.manufacturer.country}</div>
                                        </td>
                                        <td style={{ padding:'13px 14px', whiteSpace:'nowrap' }}>
                                            <span style={{ fontWeight:'700', color:'#059669', fontSize:'14px' }}>{formatMoney(it.vaccine.price)}</span>
                                        </td>
                                        <td style={{ padding:'13px 14px', whiteSpace:'nowrap', fontSize:'13px' }}>
                                            <div style={{ color:'#475569', fontWeight:'600' }}>📅 {it.startDate}</div>
                                            <div style={{ color:TEXT_2, fontSize:'12px' }}>→ {it.endDate}</div>
                                        </td>
                                        <td style={{ padding:'13px 14px', textAlign:'center' }}>
                                            <span style={{ background:'rgba(71,85,105,0.1)', color:'#475569', padding:'4px 10px', borderRadius:'20px', fontWeight:'700', fontSize:'13px' }}>
                                                {it.limitPeople}
                                            </span>
                                        </td>
                                        <td style={{ padding:'13px 14px', maxWidth:'180px', fontSize:'13px' }}>
                                            <div style={{ fontWeight:'600' }}>{it.center.centerName}</div>
                                            <div style={{ color:TEXT_2, fontSize:'12px', marginTop:'2px', lineHeight:'1.5' }}>
                                                📍 {it.center.street}, {it.center.ward}, {it.center.district}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pageCount > 1 && (
                        <div style={{ padding:'16px 20px', borderTop:`1px solid ${BORDER}` }}>
                            <ReactPaginate
                                marginPagesDisplayed={2} pageCount={pageCount} onPageChange={handlePageClick}
                                containerClassName={'pagination'} pageClassName={'page-item'} pageLinkClassName={'page-link'}
                                previousClassName="page-item" previousLinkClassName="page-link"
                                nextClassName="page-item" nextLinkClassName="page-link"
                                breakClassName="page-item" breakLinkClassName="page-link"
                                previousLabel="Trang trước" nextLabel="Trang sau" activeClassName="active"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ───────────────────────────────── */}
            <div className="modal fade" id="scheduleModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content" style={{ borderRadius:'16px', overflow:'hidden', border:'none' }}>
                        <div style={{ background:'linear-gradient(135deg, #334155, #475569)', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                <span style={{ fontSize:'20px' }}>💉</span>
                                <h5 style={{ color:'#fff', margin:0, fontWeight:'700', fontSize:'16px' }}>{schedule?.vaccine?.name || 'Thông tin vaccine'}</h5>
                            </div>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"/>
                        </div>
                        <div className="modal-body" style={{ padding:'24px' }}>
                            {schedule && (
                                <div style={{ display:'flex', gap:'24px', flexWrap:'wrap' }}>
                                    <div style={{ flexShrink:0 }}>
                                        <img src={schedule.vaccine.image} alt={schedule.vaccine.name}
                                            style={{ width:'130px', height:'130px', objectFit:'cover', borderRadius:'12px', border:`2px solid ${BORDER}` }}/>
                                    </div>
                                    <div style={{ flex:1, minWidth:'240px' }}>
                                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 20px' }}>
                                            {[
                                                { label:'Nhóm tuổi',      value: schedule.vaccine.ageGroup?.ageRange },
                                                { label:'Loại vaccine',   value: schedule.vaccine.vaccineType?.typeName },
                                                { label:'Nhà sản xuất',   value: schedule.vaccine.manufacturer?.name },
                                                { label:'Quốc gia',       value: schedule.vaccine.manufacturer?.country },
                                                { label:'Giá tiêm',       value: <span style={{ color:'#059669', fontWeight:'700' }}>{formatMoney(schedule.vaccine.price)}</span> },
                                                { label:'Thời gian tiêm', value: `${schedule.startDate} → ${schedule.endDate}` },
                                            ].map((r, i) => (
                                                <div key={i}>
                                                    <div style={{ fontSize:'11px', fontWeight:'700', color:TEXT_2, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>{r.label}</div>
                                                    <div style={{ fontSize:'13.5px', color:TEXT, fontWeight:'500' }}>{r.value || '—'}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop:'14px', padding:'12px 16px', background:BG_ROW, borderRadius:'10px', border:`1px solid ${BORDER}` }}>
                                            <div style={{ fontSize:'11px', fontWeight:'700', color:TEXT_2, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'5px' }}>📍 Trung tâm tiêm</div>
                                            <div style={{ fontWeight:'600', color:'#475569' }}>{schedule.center?.centerName}</div>
                                            <div style={{ fontSize:'13px', color:TEXT_2, marginTop:'2px' }}>
                                                {schedule.center?.street}, {schedule.center?.ward}, {schedule.center?.district}, {schedule.center?.city}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ padding:'14px 24px', borderTop:`1px solid ${BORDER}` }}>
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" style={{ borderRadius:'8px' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LichTiemDaQua;
