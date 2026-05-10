import Footer from '../../layout/customer/footer/footer'
import banner from '../../assest/images/BANNERWEB_6_IN_1_FR_1_1440x490_137ec11ded.webp'
import banner1 from '../../assest/images/Vacxin_Cum_thang11_LDP_PC_1440x490_7c1f50d94b.webp'
import banner2 from '../../assest/images/banner-tchung.jpg'
import {getMethod} from '../../services/request'
import {formatMoney} from '../../services/money'
import { useState, useEffect } from 'react'
import { Parser } from "html-to-react";
import ReactPaginate from 'react-paginate';
import {toast } from 'react-toastify';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import style from '../../layout/customer/styles/styleuser.scss'

var sizepro = 20

/* ─── tiny shared style tokens ───────────────────────────────────────── */
const PRIMARY   = '#1e40af';
const PRIMARY_L = '#2A388F';
const ACCENT    = '#0ea5e9';
const GREEN     = '#10b981';

function Home(){
    const [itemType, setItemType] = useState([]);
    const [itemNews, setItemNews] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [visibleCounts, setVisibleCounts] = useState({});

    const handleShowMore = (index) => {
        setVisibleCounts((prevCounts) => ({
            ...prevCounts,
            [index]: prevCounts[index] + 4,
        }));
    };

    useEffect(()=>{
        const getItemType = async () => {
            const response = await getMethod('/api/vaccine/public/vaccine-type');
            const result = await response.json();
            setItemType(result);
            const initialCounts = result.reduce((acc, _, index) => {
                acc[index] = 4;
                return acc;
            }, {});
            setVisibleCounts(initialCounts);
        };
        getItemType();

        const getItemNews = async() =>{
            var response = await getMethod('/api/news/public/top-6');
            var result = await response.json();
            setItemNews(result)
        };
        getItemNews();

        const getDoctors = async() =>{
            var response = await getMethod('/api/doctor/public/find-all');
            var result = await response.json();
            setDoctors(result)
        };
        getDoctors();
    }, []);

    return (
        <>
            {/* ═══════════════════════════════════════════════
                HERO / BANNER
            ═══════════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%)',
                padding: '0',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* decorative blobs */}
                <div style={{
                    position:'absolute', top:'-80px', right:'-80px',
                    width:'350px', height:'350px',
                    background:'rgba(14,165,233,0.18)', borderRadius:'50%', filter:'blur(60px)',
                }}/>
                <div style={{
                    position:'absolute', bottom:'-60px', left:'-60px',
                    width:'280px', height:'280px',
                    background:'rgba(16,185,129,0.14)', borderRadius:'50%', filter:'blur(50px)',
                }}/>

                <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 24px 0', position:'relative' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'48px', flexWrap:'wrap' }}>
                        {/* left text */}
                        <div style={{ flex:'1 1 400px', color:'#fff' }}>
                            <div style={{
                                display:'inline-flex', alignItems:'center', gap:'8px',
                                background:'rgba(255,255,255,0.12)', borderRadius:'30px',
                                padding:'6px 16px', marginBottom:'20px',
                                fontSize:'13px', color:'#bae6fd', backdropFilter:'blur(4px)',
                            }}>
                                <span style={{
                                    display:'inline-block', width:'8px', height:'8px',
                                    borderRadius:'50%', background:'#4ade80',
                                    boxShadow:'0 0 6px #4ade80',
                                }}/>
                                Hệ thống tiêm chủng hàng đầu Việt Nam
                            </div>

                            <h1 style={{
                                fontSize:'clamp(28px,4vw,48px)', fontWeight:'800',
                                lineHeight:'1.15', marginBottom:'20px',
                                letterSpacing:'-0.5px',
                            }}>
                                Bảo vệ sức khỏe<br/>
                                <span style={{
                                    background:'linear-gradient(90deg,#38bdf8,#34d399)',
                                    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                                }}>
                                    cùng iVaccine
                                </span>
                            </h1>

                            <p style={{
                                fontSize:'16px', color:'#cbd5e1', lineHeight:'1.75',
                                marginBottom:'32px', maxWidth:'480px',
                            }}>
                                Đặt lịch tiêm chủng nhanh chóng, theo dõi lịch sử tiêm &amp; nhận nhắc nhở tự động.
                                Đội ngũ bác sĩ chuyên nghiệp, vaccine đạt chuẩn quốc tế.
                            </p>

                            <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
                                <a href="/dang-ky-tiem-chung" style={{
                                    display:'inline-flex', alignItems:'center', gap:'8px',
                                    background:'linear-gradient(135deg,#0ea5e9,#0284c7)',
                                    color:'#fff', textDecoration:'none',
                                    padding:'14px 28px', borderRadius:'10px',
                                    fontWeight:'700', fontSize:'15px',
                                    boxShadow:'0 8px 20px rgba(14,165,233,0.4)',
                                    transition:'transform 0.2s',
                                }}>
                                    📅 Đăng ký tiêm ngay
                                </a>
                                <a href="/tim-kiem-vaccine" style={{
                                    display:'inline-flex', alignItems:'center', gap:'8px',
                                    background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)',
                                    color:'#fff', textDecoration:'none',
                                    padding:'14px 28px', borderRadius:'10px',
                                    fontWeight:'600', fontSize:'15px',
                                    backdropFilter:'blur(4px)',
                                }}>
                                    🔍 Tìm kiếm vaccine
                                </a>
                            </div>

                            {/* trust badges */}
                            <div style={{
                                display:'flex', gap:'24px', marginTop:'36px',
                                flexWrap:'wrap', paddingBottom:'48px',
                            }}>
                                {[
                                    {icon:'🛡️', label:'Vaccine đạt chuẩn WHO'},
                                    {icon:'👨‍⚕️', label:'Bác sĩ chuyên nghiệp'},
                                    {icon:'📋', label:'Theo dõi lịch sử tiêm'},
                                ].map((b,i)=>(
                                    <div key={i} style={{
                                        display:'flex', alignItems:'center', gap:'8px',
                                        fontSize:'13px', color:'#94a3b8',
                                    }}>
                                        <span style={{fontSize:'18px'}}>{b.icon}</span>
                                        {b.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* right banner slideshow */}
                        <div style={{ flex:'1 1 340px', borderRadius:'16px', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.35)', minHeight:'280px' }}>
                            <div id="carouselHero" className="carousel slide" data-bs-ride="carousel">
                                <div className="carousel-inner">
                                    {[banner1, banner, banner2].map((src, i) => (
                                        <div key={i} className={`carousel-item${i===0?' active':''}`}>
                                            <img src={src} className="d-block w-100"
                                                style={{ height:'300px', objectFit:'cover' }} alt="banner"/>
                                        </div>
                                    ))}
                                </div>
                                <button className="carousel-control-prev" type="button" data-bs-target="#carouselHero" data-bs-slide="prev">
                                    <span className="carousel-control-prev-icon"/>
                                </button>
                                <button className="carousel-control-next" type="button" data-bs-target="#carouselHero" data-bs-slide="next">
                                    <span className="carousel-control-next-icon"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                STATS BAR
            ═══════════════════════════════════════════════ */}
            <div style={{
                background:'#fff',
                borderBottom:'1px solid #e2e8f0',
                boxShadow:'0 4px 24px rgba(0,0,0,0.06)',
            }}>
                <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 24px' }}>
                    <div style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                        gap:'0',
                    }}>
                        {[
                            {value:'500+',  label:'Loại vaccine',      icon:'💉', color:'#0ea5e9'},
                            {value:'50.000+',label:'Khách hàng',       icon:'👥', color:'#10b981'},
                            {value:'100+',  label:'Bác sĩ & Y tá',    icon:'👨‍⚕️', color:'#8b5cf6'},
                            {value:'20+',   label:'Trung tâm tiêm',   icon:'🏥', color:'#f59e0b'},
                        ].map((s,i)=>(
                            <div key={i} style={{
                                padding:'28px 20px',
                                textAlign:'center',
                                borderRight: i < 3 ? '1px solid #f1f5f9' : 'none',
                            }}>
                                <div style={{ fontSize:'28px', marginBottom:'4px' }}>{s.icon}</div>
                                <div style={{
                                    fontSize:'28px', fontWeight:'800', color: s.color,
                                    lineHeight:'1',
                                }}>{s.value}</div>
                                <div style={{ fontSize:'13px', color:'#64748b', marginTop:'4px', fontWeight:'500' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                WHY CHOOSE US
            ═══════════════════════════════════════════════ */}
            <div style={{ background:'#f8fafc', padding:'72px 24px' }}>
                <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
                    <SectionHeader
                        label="Dịch vụ của chúng tôi"
                        title="Tại sao chọn iVaccine?"
                        sub="Chúng tôi cam kết mang đến trải nghiệm tiêm chủng an toàn, tiện lợi và chuyên nghiệp nhất."
                    />
                    <div style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',
                        gap:'24px',
                        marginTop:'48px',
                    }}>
                        {[
                            {
                                icon:'🛡️',
                                color:'#0ea5e9', bg:'#e0f2fe',
                                title:'Vaccine chất lượng cao',
                                desc:'100% vaccine nhập khẩu chính hãng, được kiểm định bởi Bộ Y Tế và đạt chuẩn WHO.',
                            },
                            {
                                icon:'👨‍⚕️',
                                color:'#8b5cf6', bg:'#ede9fe',
                                title:'Đội ngũ y tế chuyên nghiệp',
                                desc:'Bác sĩ và y tá nhiều năm kinh nghiệm, tư vấn tận tình trước và sau tiêm chủng.',
                            },
                            {
                                icon:'📅',
                                color:'#10b981', bg:'#d1fae5',
                                title:'Đặt lịch siêu nhanh',
                                desc:'Chỉ 2 phút để đặt lịch tiêm trực tuyến. Hệ thống nhắc nhở tự động qua email.',
                            },
                            {
                                icon:'📊',
                                color:'#f59e0b', bg:'#fef3c7',
                                title:'Theo dõi sức khỏe',
                                desc:'Lưu trữ toàn bộ lịch sử tiêm chủng, nhắc lịch mũi kế tiếp đúng thời điểm.',
                            },
                        ].map((f,i)=>(
                            <FeatureCard key={i} {...f}/>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                VACCINE TYPES
            ═══════════════════════════════════════════════ */}
            <div style={{ background:'#fff', padding:'72px 24px' }}>
                <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
                    {itemType.map((item, itemIndex) => (
                        <div key={itemIndex} style={{ marginBottom:'64px' }}>
                            <SectionHeader
                                title={item.vaccineType.typeName}
                                sub={null}
                                align="left"
                                accent={PRIMARY_L}
                            />
                            <div style={{
                                display:'grid',
                                gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',
                                gap:'20px',
                                marginTop:'32px',
                            }}>
                                {item.vaccines.slice(0, visibleCounts[itemIndex] || 0).map((vaccine, vaccineIndex) => (
                                    <VaccineCard key={vaccineIndex} vaccine={vaccine}/>
                                ))}
                            </div>

                            {visibleCounts[itemIndex] < item.vaccines.length && (
                                <div style={{ textAlign:'center', marginTop:'32px' }}>
                                    <button
                                        onClick={() => handleShowMore(itemIndex)}
                                        style={{
                                            padding:'10px 32px',
                                            border:`1px solid ${PRIMARY_L}`,
                                            borderRadius:'30px',
                                            background:'#fff',
                                            color: PRIMARY_L,
                                            fontWeight:'600',
                                            fontSize:'14px',
                                            cursor:'pointer',
                                            transition:'all 0.2s',
                                        }}
                                        onMouseOver={e=>{e.currentTarget.style.background=PRIMARY_L; e.currentTarget.style.color='#fff';}}
                                        onMouseOut={e=>{e.currentTarget.style.background='#fff'; e.currentTarget.style.color=PRIMARY_L;}}
                                    >
                                        Xem thêm vaccine ↓
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                DOCTORS
            ═══════════════════════════════════════════════ */}
            {doctors.length > 0 && (
                <div style={{ background:'#f8fafc', padding:'72px 24px' }}>
                    <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
                        <SectionHeader
                            label="Đội ngũ y tế"
                            title="Bác sĩ của chúng tôi"
                            sub="Đội ngũ bác sĩ giàu kinh nghiệm, tận tâm chăm sóc sức khỏe của bạn."
                        />
                        <div style={{ marginTop:'48px', paddingBottom:'16px' }}>
                            <Swiper
                                modules={[Navigation, Pagination, Autoplay]}
                                spaceBetween={24}
                                slidesPerView={4}
                                breakpoints={{
                                    320: { slidesPerView:1, spaceBetween:16 },
                                    640: { slidesPerView:2, spaceBetween:20 },
                                    1024:{ slidesPerView:4, spaceBetween:24 },
                                }}
                                loop={true}
                                pagination={{ clickable:true }}
                                navigation={true}
                                autoplay={{ delay:3500, disableOnInteraction:false }}
                            >
                                {doctors.map((doc, i) => (
                                    <SwiperSlide key={i}>
                                        <div style={{
                                            background:'#fff',
                                            borderRadius:'16px',
                                            overflow:'hidden',
                                            boxShadow:'0 4px 20px rgba(0,0,0,0.07)',
                                            textAlign:'center',
                                            padding:'28px 20px 24px',
                                            marginBottom:'40px',
                                            border:'1px solid #f1f5f9',
                                            transition:'transform 0.2s, box-shadow 0.2s',
                                        }}
                                        onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)';}}
                                        onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.07)';}}
                                        >
                                            <div style={{ position:'relative', display:'inline-block', marginBottom:'16px' }}>
                                                <img
                                                    src={doc.avatar || 'https://via.placeholder.com/150'}
                                                    alt={doc.fullName}
                                                    style={{
                                                        width:'90px', height:'90px',
                                                        objectFit:'cover', borderRadius:'50%',
                                                        border:`3px solid ${ACCENT}`,
                                                        boxShadow:`0 0 0 4px rgba(14,165,233,0.15)`,
                                                    }}
                                                />
                                                <span style={{
                                                    position:'absolute', bottom:'2px', right:'2px',
                                                    width:'16px', height:'16px', borderRadius:'50%',
                                                    background:'#4ade80', border:'2px solid #fff',
                                                    display:'block',
                                                }}/>
                                            </div>
                                            <h3 style={{ fontSize:'16px', fontWeight:'700', color:PRIMARY_L, marginBottom:'4px' }}>
                                                BS. {doc.fullName}
                                            </h3>
                                            <span style={{
                                                display:'inline-block',
                                                background:'#e0f2fe', color:'#0369a1',
                                                borderRadius:'20px', padding:'3px 12px',
                                                fontSize:'12px', fontWeight:'600', marginBottom:'10px',
                                            }}>
                                                {doc.specialization}
                                            </span>
                                            <div style={{ fontSize:'13px', color:'#64748b', marginBottom:'10px' }}>
                                                ⭐ {doc.experienceYears} năm kinh nghiệm
                                            </div>
                                            <p style={{
                                                fontSize:'13px', color:'#475569', lineHeight:'1.6',
                                                display:'-webkit-box', WebkitLineClamp:'3',
                                                WebkitBoxOrient:'vertical', overflow:'hidden',
                                                minHeight:'58px', margin:0,
                                            }}>
                                                {doc.bio}
                                            </p>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                CTA BANNER
            ═══════════════════════════════════════════════ */}
            <div style={{
                background:'linear-gradient(135deg,#1e3a8a 0%,#0284c7 100%)',
                padding:'64px 24px',
                position:'relative',
                overflow:'hidden',
            }}>
                <div style={{
                    position:'absolute', top:'-60px', right:'-60px',
                    width:'260px', height:'260px',
                    background:'rgba(255,255,255,0.06)', borderRadius:'50%',
                }}/>
                <div style={{
                    position:'absolute', bottom:'-40px', left:'10%',
                    width:'180px', height:'180px',
                    background:'rgba(16,185,129,0.1)', borderRadius:'50%',
                }}/>
                <div style={{ maxWidth:'700px', margin:'0 auto', textAlign:'center', position:'relative' }}>
                    <div style={{ fontSize:'40px', marginBottom:'16px' }}>💉</div>
                    <h2 style={{
                        color:'#fff', fontSize:'clamp(22px,3vw,34px)',
                        fontWeight:'800', marginBottom:'12px', lineHeight:'1.3',
                    }}>
                        Bảo vệ bạn và gia đình ngay hôm nay
                    </h2>
                    <p style={{ color:'#bae6fd', fontSize:'16px', lineHeight:'1.7', marginBottom:'32px' }}>
                        Đăng ký tài khoản miễn phí và đặt lịch tiêm chủng chỉ trong vài phút.
                        Nhận thông báo nhắc lịch tự động qua email.
                    </p>
                    <div style={{ display:'flex', justifyContent:'center', gap:'16px', flexWrap:'wrap' }}>
                        <a href="/dang-ky-tiem-chung" style={{
                            display:'inline-block',
                            background:'#fff', color:PRIMARY,
                            textDecoration:'none', padding:'14px 32px',
                            borderRadius:'10px', fontWeight:'700', fontSize:'15px',
                            boxShadow:'0 8px 20px rgba(0,0,0,0.2)',
                        }}>
                            📅 Đặt lịch ngay
                        </a>
                        <a href="/register" style={{
                            display:'inline-block',
                            background:'rgba(255,255,255,0.12)',
                            border:'1px solid rgba(255,255,255,0.3)',
                            color:'#fff', textDecoration:'none',
                            padding:'14px 32px', borderRadius:'10px',
                            fontWeight:'600', fontSize:'15px',
                        }}>
                            Đăng ký tài khoản
                        </a>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                NEWS
            ═══════════════════════════════════════════════ */}
            {itemNews.length > 0 && (
                <div style={{ background:'#fff', padding:'72px 24px' }}>
                    <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
                        <SectionHeader
                            label="Cập nhật mới nhất"
                            title="Tin tức & Sức khỏe"
                            sub="Thông tin y tế hữu ích, cập nhật liên tục từ đội ngũ chuyên gia của iVaccine."
                        />
                        <div style={{ marginTop:'48px', paddingBottom:'16px' }}>
                            <Swiper
                                modules={[Navigation, Pagination]}
                                spaceBetween={24}
                                slidesPerView={3}
                                breakpoints={{
                                    320: { slidesPerView:1, spaceBetween:16 },
                                    640: { slidesPerView:2, spaceBetween:20 },
                                    1024:{ slidesPerView:3, spaceBetween:24 },
                                }}
                                loop={true}
                                pagination={{ clickable:true }}
                                navigation={true}
                            >
                                {itemNews.map((news, i) => (
                                    <SwiperSlide key={i}>
                                        <div style={{
                                            background:'#fff',
                                            borderRadius:'14px',
                                            overflow:'hidden',
                                            border:'1px solid #f1f5f9',
                                            boxShadow:'0 4px 16px rgba(0,0,0,0.06)',
                                            marginBottom:'40px',
                                            transition:'transform 0.2s, box-shadow 0.2s',
                                        }}
                                        onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(0,0,0,0.1)';}}
                                        onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)';}}
                                        >
                                            <a href={"chi-tiet-tin-tuc?id="+news.id}>
                                                <img
                                                    src={news.image} alt={news.title}
                                                    style={{ width:'100%', height:'180px', objectFit:'cover', display:'block' }}
                                                />
                                            </a>
                                            <div style={{ padding:'20px' }}>
                                                <a href={"chi-tiet-tin-tuc?id="+news.id} style={{ textDecoration:'none' }}>
                                                    <h3 style={{
                                                        fontSize:'15px', fontWeight:'700',
                                                        color:'#1e293b', marginBottom:'10px',
                                                        lineHeight:'1.5',
                                                        display:'-webkit-box', WebkitLineClamp:'2',
                                                        WebkitBoxOrient:'vertical', overflow:'hidden',
                                                    }}>
                                                        {news.title}
                                                    </h3>
                                                </a>
                                                <p style={{
                                                    fontSize:'13px', color:'#64748b', lineHeight:'1.6',
                                                    display:'-webkit-box', WebkitLineClamp:'2',
                                                    WebkitBoxOrient:'vertical', overflow:'hidden', margin:0,
                                                }}>
                                                    {news.content}
                                                </p>
                                                <a href={"chi-tiet-tin-tuc?id="+news.id} style={{
                                                    display:'inline-block', marginTop:'16px',
                                                    fontSize:'13px', fontWeight:'600',
                                                    color: ACCENT, textDecoration:'none',
                                                }}>
                                                    Đọc thêm →
                                                </a>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── helper components ───────────────────────────────────────────────── */

function SectionHeader({ label, title, sub, align='center', accent='#0ea5e9' }) {
    return (
        <div style={{ textAlign: align, maxWidth: align==='center' ? '640px' : undefined, margin: align==='center' ? '0 auto' : undefined }}>
            {label && (
                <span style={{
                    display:'inline-block',
                    background:'#e0f2fe', color:'#0369a1',
                    borderRadius:'20px', padding:'4px 14px',
                    fontSize:'12px', fontWeight:'700',
                    textTransform:'uppercase', letterSpacing:'0.8px',
                    marginBottom:'12px',
                }}>
                    {label}
                </span>
            )}
            <h2 style={{
                fontSize:'clamp(22px,2.5vw,32px)', fontWeight:'800',
                color:'#0f172a', marginBottom: sub ? '12px' : '0',
                lineHeight:'1.25',
            }}>
                <span style={{ borderBottom:`3px solid ${accent}`, paddingBottom:'2px' }}>{title}</span>
            </h2>
            {sub && (
                <p style={{ fontSize:'15px', color:'#64748b', lineHeight:'1.7', margin:0 }}>
                    {sub}
                </p>
            )}
        </div>
    );
}

function FeatureCard({ icon, color, bg, title, desc }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseOver={()=>setHover(true)}
            onMouseOut={()=>setHover(false)}
            style={{
                background: hover ? '#fff' : '#fff',
                border: `1px solid ${hover ? color : '#f1f5f9'}`,
                borderRadius:'16px',
                padding:'32px 24px',
                transition:'all 0.25s',
                boxShadow: hover
                    ? `0 12px 32px rgba(0,0,0,0.1), 0 0 0 2px ${color}22`
                    : '0 2px 8px rgba(0,0,0,0.04)',
                transform: hover ? 'translateY(-4px)' : 'none',
                cursor:'default',
            }}
        >
            <div style={{
                width:'56px', height:'56px', borderRadius:'14px',
                background: bg, display:'flex',
                alignItems:'center', justifyContent:'center',
                fontSize:'28px', marginBottom:'20px',
            }}>
                {icon}
            </div>
            <h3 style={{ fontSize:'17px', fontWeight:'700', color:'#1e293b', marginBottom:'10px' }}>{title}</h3>
            <p style={{ fontSize:'14px', color:'#64748b', lineHeight:'1.7', margin:0 }}>{desc}</p>
        </div>
    );
}

function VaccineCard({ vaccine }) {
    const [hover, setHover] = useState(false);
    return (
        <a
            href={"thong-tin-vaccine?id="+vaccine.id}
            style={{ textDecoration:'none' }}
            onMouseOver={()=>setHover(true)}
            onMouseOut={()=>setHover(false)}
        >
            <div style={{
                background:'#fff',
                borderRadius:'14px',
                overflow:'hidden',
                border:'1px solid #f1f5f9',
                boxShadow: hover ? '0 10px 28px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
                transform: hover ? 'translateY(-4px)' : 'none',
                transition:'all 0.25s',
            }}>
                <div style={{ position:'relative', overflow:'hidden' }}>
                    <img
                        src={vaccine.image}
                        alt={vaccine.name}
                        style={{
                            width:'100%', height:'150px', objectFit:'cover',
                            display:'block',
                            transform: hover ? 'scale(1.05)' : 'scale(1)',
                            transition:'transform 0.35s',
                        }}
                    />
                    {vaccine.price && (
                        <span style={{
                            position:'absolute', top:'10px', right:'10px',
                            background:'linear-gradient(135deg,#1e3a8a,#0284c7)',
                            color:'#fff', fontSize:'11px', fontWeight:'700',
                            padding:'3px 10px', borderRadius:'20px',
                        }}>
                            {formatMoney(vaccine.price)}đ
                        </span>
                    )}
                </div>
                <div style={{ padding:'14px' }}>
                    <span style={{
                        fontSize:'14px', fontWeight:'700',
                        color:'#1e293b', lineHeight:'1.4',
                        display:'-webkit-box', WebkitLineClamp:'2',
                        WebkitBoxOrient:'vertical', overflow:'hidden',
                    }}>
                        {vaccine.name}
                    </span>
                    <span style={{
                        display:'inline-block', marginTop:'10px',
                        fontSize:'12px', fontWeight:'600',
                        color:'#0ea5e9',
                    }}>
                        Xem chi tiết →
                    </span>
                </div>
            </div>
        </a>
    );
}

export default Home;
