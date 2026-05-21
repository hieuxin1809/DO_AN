import { getMethod } from '../../services/request';
import { formatMoney } from '../../services/money';
import { useState, useEffect } from 'react';

const PRIMARY_L = '#2A388F';
const ACCENT    = '#0ea5e9';

function ThongTinVaccine() {
    const [item, setItem]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const uls = new URL(document.URL);
        const id  = uls.searchParams.get('id');
        const getItem = async () => {
            const response = await getMethod('/api/vaccine/public/find-by-id?id=' + id);
            const result   = await response.json();
            setItem(result);
            setLoading(false);
        };
        getItem();
    }, []);

    if (loading) {
        return (
            <div style={{
                minHeight:'60vh', display:'flex',
                alignItems:'center', justifyContent:'center',
                background:'#f8fafc',
            }}>
                <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'48px', marginBottom:'16px' }}>💉</div>
                    <p style={{ color:'#64748b', fontSize:'16px', fontWeight:'500' }}>
                        Đang tải thông tin vaccine...
                    </p>
                </div>
            </div>
        );
    }

    const infoItems = [
        { icon:'🏭', label:'Nhà sản xuất',      value: item?.manufacturer?.name },
        { icon:'🌍', label:'Xuất xứ',            value: item?.manufacturer?.country },
        { icon:'👶', label:'Độ tuổi',            value: item?.ageGroup?.ageRange },
        { icon:'🏷️', label:'Danh mục',           value: item?.vaccineType?.typeName },
        { icon:'💉', label:'Số mũi tiêm',        value: item?.maxDose ? `${item.maxDose} mũi` : 'Theo chỉ định bác sĩ' },
        { icon:'⏱️', label:'Khoảng cách mũi',   value: item?.minIntervalMonths ? `${item.minIntervalMonths} tháng` : 'Theo chỉ định bác sĩ' },
    ];

    return (
        <div style={{ background:'#f8fafc', minHeight:'100vh' }}>

            {/* ── Breadcrumb ── */}
            <div style={{
                background:'#fff',
                borderBottom:'1px solid #e2e8f0',
                padding:'12px 0',
            }}>
                <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 24px' }}>
                    <div style={{
                        fontSize:'13px', color:'#64748b',
                        display:'flex', alignItems:'center',
                        gap:'6px', flexWrap:'wrap',
                    }}>
                        <a href="/"                   style={{ color:'#64748b', textDecoration:'none' }}>Trang chủ</a>
                        <span style={{ opacity:0.5 }}>›</span>
                        <a href="/tim-kiem-vaccine"   style={{ color:'#64748b', textDecoration:'none' }}>Vaccine</a>
                        <span style={{ opacity:0.5 }}>›</span>
                        <span style={{ color:'#1e293b', fontWeight:'600' }}>{item?.name}</span>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'36px 24px 72px' }}>
                <div style={{
                    display:'flex',
                    flexWrap:'wrap',
                    gap:'28px',
                    alignItems:'flex-start',
                }}>

                    {/* ══════════════════════════════
                        LEFT — Info Card (sticky)
                    ══════════════════════════════ */}
                    <div style={{
                        flex:'0 0 340px',
                        maxWidth:'360px',
                        minWidth:'280px',
                        background:'#fff',
                        borderRadius:'20px',
                        overflow:'hidden',
                        boxShadow:'0 4px 24px rgba(0,0,0,0.09)',
                        border:'1px solid #e2e8f0',
                        position:'sticky',
                        top:'116px',
                    }}>
                        {/* Image */}
                        <div style={{ position:'relative', overflow:'hidden' }}>
                            <img
                                src={item?.image || 'https://via.placeholder.com/340x240?text=Vaccine'}
                                alt={item?.name}
                                style={{
                                    width:'100%', height:'240px',
                                    objectFit:'cover', display:'block',
                                    transition:'transform 0.4s',
                                }}
                            />
                            {item?.vaccineType?.typeName && (
                                <span style={{
                                    position:'absolute', top:'14px', left:'14px',
                                    background:'rgba(30,58,138,0.85)',
                                    color:'#fff', fontSize:'11px', fontWeight:'700',
                                    padding:'4px 12px', borderRadius:'20px',
                                    backdropFilter:'blur(4px)',
                                    letterSpacing:'0.3px',
                                }}>
                                    {item.vaccineType.typeName}
                                </span>
                            )}
                        </div>

                        <div style={{ padding:'24px' }}>
                            {/* Name */}
                            <h1 style={{
                                fontSize:'19px', fontWeight:'800',
                                color:'#0f172a', lineHeight:'1.4',
                                marginBottom:'16px',
                            }}>
                                {item?.name}
                            </h1>

                            {/* Price badge */}
                            {item?.price && (
                                <div style={{
                                    background:'linear-gradient(135deg,#1e3a8a 0%,#0284c7 100%)',
                                    borderRadius:'14px', padding:'16px 20px',
                                    marginBottom:'20px', textAlign:'center',
                                }}>
                                    <div style={{
                                        fontSize:'11px', color:'rgba(255,255,255,0.75)',
                                        fontWeight:'700', textTransform:'uppercase',
                                        letterSpacing:'0.8px', marginBottom:'4px',
                                    }}>
                                        Giá tiêm chủng
                                    </div>
                                    <div style={{
                                        fontSize:'28px', fontWeight:'900', color:'#fff',
                                        lineHeight:'1',
                                    }}>
                                        {formatMoney(item.price)}
                                        <span style={{ fontSize:'17px', fontWeight:'700' }}>đ</span>
                                    </div>
                                </div>
                            )}

                            {/* Info rows */}
                            <div style={{ marginBottom:'22px' }}>
                                {infoItems.map((info, i) => (
                                    <div key={i} style={{
                                        display:'flex', alignItems:'flex-start',
                                        gap:'12px', padding:'10px 0',
                                        borderBottom: i < infoItems.length - 1
                                            ? '1px solid #f1f5f9' : 'none',
                                    }}>
                                        <span style={{ fontSize:'16px', lineHeight:'1', marginTop:'3px' }}>
                                            {info.icon}
                                        </span>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{
                                                fontSize:'11px', color:'#94a3b8',
                                                fontWeight:'700', textTransform:'uppercase',
                                                letterSpacing:'0.6px', marginBottom:'2px',
                                            }}>
                                                {info.label}
                                            </div>
                                            <div style={{
                                                fontSize:'14px', color:'#1e293b',
                                                fontWeight:'600', wordBreak:'break-word',
                                            }}>
                                                {info.value || '—'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Primary CTA */}
                            <BookingButton vaccineId={item?.id} />

                            {/* Secondary link */}
                            <a href="/tra-cuu-lich-tiem" style={{
                                display:'block', textAlign:'center',
                                marginTop:'12px', fontSize:'13px',
                                color:'#64748b', textDecoration:'none',
                                transition:'color 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = ACCENT}
                            onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                            >
                                🔍 Tra cứu lịch tiêm
                            </a>
                        </div>
                    </div>

                    {/* ══════════════════════════════
                        RIGHT — Description + Notes
                    ══════════════════════════════ */}
                    <div style={{
                        flex:'1 1 320px',
                        minWidth:0,
                        display:'flex',
                        flexDirection:'column',
                        gap:'20px',
                    }}>

                        {/* Description card */}
                        <div style={{
                            background:'#fff',
                            borderRadius:'20px',
                            padding:'32px',
                            boxShadow:'0 4px 24px rgba(0,0,0,0.06)',
                            border:'1px solid #e2e8f0',
                        }}>
                            <div style={{
                                display:'flex', alignItems:'center',
                                gap:'12px', marginBottom:'24px',
                                paddingBottom:'18px',
                                borderBottom:'2px solid #e0f2fe',
                            }}>
                                <div style={{
                                    width:'44px', height:'44px', borderRadius:'12px',
                                    background:'#e0f2fe', display:'flex',
                                    alignItems:'center', justifyContent:'center',
                                    fontSize:'22px', flexShrink:0,
                                }}>
                                    📋
                                </div>
                                <h2 style={{
                                    fontSize:'20px', fontWeight:'800',
                                    color:'#0f172a', margin:0,
                                }}>
                                    Thông tin chi tiết
                                </h2>
                            </div>
                            <div
                                style={{
                                    lineHeight:'1.9', color:'#374151', fontSize:'15px',
                                }}
                                dangerouslySetInnerHTML={{ __html: item?.description }}
                            />
                        </div>

                        {/* ── Before injection note ── */}
                        <NoteBox
                            color="#fffbeb" border="#fbbf24" leftBorder="#f59e0b"
                            icon="⚠️" textColor="#92400e" listColor="#78350f"
                            title="Lưu ý trước khi tiêm"
                            items={[
                                'Báo nhân viên y tế nếu có tiền sử dị ứng vaccine hoặc bất kỳ thành phần nào',
                                'Không tiêm khi đang sốt cao (trên 38°C) hoặc mắc bệnh cấp tính',
                                'Ăn nhẹ trước khi tiêm — không cần nhịn ăn',
                                'Mang theo CMND/CCCD và sổ tiêm chủng (nếu có)',
                            ]}
                        />

                        {/* ── After injection note ── */}
                        <div style={{
                            background:'#f0fdf4',
                            border:'1px solid #86efac',
                            borderLeft:'4px solid #22c55e',
                            borderRadius:'14px',
                            padding:'24px',
                        }}>
                            <div style={{
                                display:'flex', alignItems:'center',
                                gap:'10px', marginBottom:'14px',
                            }}>
                                <span style={{ fontSize:'22px' }}>✅</span>
                                <h3 style={{
                                    fontSize:'16px', fontWeight:'800',
                                    color:'#166534', margin:0,
                                }}>
                                    Phản ứng sau tiêm — bình thường
                                </h3>
                            </div>
                            <ul style={{
                                color:'#14532d', fontSize:'14px',
                                lineHeight:'1.9', paddingLeft:'20px',
                                margin:'0 0 14px',
                            }}>
                                <li>Đau, đỏ, sưng nhẹ tại chỗ tiêm trong 1–2 ngày</li>
                                <li>Sốt nhẹ dưới 38.5°C, mệt mỏi, đau đầu thoáng qua</li>
                                <li>Chườm lạnh tại chỗ tiêm và uống paracetamol nếu cần</li>
                                <li>Ở lại trung tâm theo dõi ít nhất <strong>30 phút</strong> sau tiêm</li>
                            </ul>
                            <div style={{
                                background:'#fef2f2', border:'1px solid #fca5a5',
                                borderRadius:'10px', padding:'12px 16px',
                                display:'flex', alignItems:'flex-start', gap:'8px',
                            }}>
                                <span style={{ fontSize:'16px', flexShrink:0, marginTop:'1px' }}>🚨</span>
                                <div>
                                    <strong style={{ color:'#991b1b', fontSize:'13px' }}>
                                        Gọi hotline: 0342046981 ngay nếu:
                                    </strong>
                                    <span style={{ color:'#7f1d1d', fontSize:'13px', marginLeft:'6px' }}>
                                        khó thở, phát ban toàn thân, sốt &gt;39°C kéo dài, ngất xỉu
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Hotline contact bar ── */}
                        <div style={{
                            background:'linear-gradient(135deg,#1e3a8a 0%,#0284c7 100%)',
                            borderRadius:'16px',
                            padding:'24px 28px',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'space-between',
                            flexWrap:'wrap',
                            gap:'16px',
                        }}>
                            <div>
                                <h3 style={{
                                    color:'#fff', fontSize:'17px',
                                    fontWeight:'800', margin:'0 0 6px',
                                }}>
                                    Cần tư vấn thêm?
                                </h3>
                                <p style={{
                                    color:'#bae6fd', fontSize:'14px', margin:0,
                                }}>
                                    Chuyên viên iVaccine sẵn sàng hỗ trợ 8:00 – 17:00
                                </p>
                            </div>
                            <a
                                href="tel:0342046981"
                                style={{
                                    display:'inline-flex', alignItems:'center',
                                    gap:'8px', background:'#fff',
                                    color:'#1e3a8a', textDecoration:'none',
                                    padding:'12px 24px', borderRadius:'10px',
                                    fontWeight:'700', fontSize:'15px',
                                    flexShrink:0, boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
                                    transition:'transform 0.2s',
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
                                onMouseOut={e  => e.currentTarget.style.transform = 'none'}
                            >
                                📞 0342.046.981
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── BookingButton: isolated hover state ─── */
function BookingButton({ vaccineId }) {
    const [hover, setHover] = useState(false);
    return (
        <a
            href={'/dang-ky-tiem-chung?vaccine=' + vaccineId}
            style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                gap:'10px',
                background: hover
                    ? 'linear-gradient(135deg,#1e40af,#0369a1)'
                    : 'linear-gradient(135deg,#1e3a8a,#0284c7)',
                color:'#fff', textDecoration:'none',
                padding:'16px 20px', borderRadius:'12px',
                fontWeight:'700', fontSize:'16px',
                boxShadow: hover
                    ? '0 12px 28px rgba(14,165,233,0.5)'
                    : '0 8px 20px rgba(14,165,233,0.35)',
                transform: hover ? 'translateY(-2px)' : 'none',
                transition:'all 0.2s',
            }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
        >
            <span style={{ fontSize:'20px' }}>📅</span>
            Đặt lịch tiêm ngay
        </a>
    );
}

/* ─── NoteBox: reusable warning/info block ─── */
function NoteBox({ color, border, leftBorder, icon, textColor, listColor, title, items }) {
    return (
        <div style={{
            background: color,
            border: `1px solid ${border}`,
            borderLeft: `4px solid ${leftBorder}`,
            borderRadius:'14px',
            padding:'24px',
        }}>
            <div style={{
                display:'flex', alignItems:'center',
                gap:'10px', marginBottom:'14px',
            }}>
                <span style={{ fontSize:'22px' }}>{icon}</span>
                <h3 style={{
                    fontSize:'16px', fontWeight:'800',
                    color: textColor, margin:0,
                }}>
                    {title}
                </h3>
            </div>
            <ul style={{
                color: listColor, fontSize:'14px',
                lineHeight:'1.9', paddingLeft:'20px', margin:0,
            }}>
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    );
}

export default ThongTinVaccine;
