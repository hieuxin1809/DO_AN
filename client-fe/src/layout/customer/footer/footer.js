import { useState } from 'react';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import logo  from '../../../assest/images/ivaccine-logo.jpg';
import vnpay from '../../../assest/images/vnpay.png';

library.add(fas, fab);

/* ── palette ─────────────────────────────────── */
const BG_MAIN   = '#0d1b3e';
const BG_BOTTOM = '#071329';
const TEXT_DIM  = 'rgba(255,255,255,0.72)';
const TEXT_MUTE = 'rgba(255,255,255,0.42)';
const ACCENT    = '#38bdf8';

/* ── quick-links data ────────────────────────── */
const LINKS = [
    { label: 'Trang chủ',             href: '/' },
    { label: 'Đăng ký tiêm chủng',    href: '/dang-ky-tiem-chung' },
    { label: 'Tra cứu lịch tiêm',     href: '/tra-cuu-lich-tiem' },
    { label: 'Tìm kiếm vaccine',      href: '/tim-kiem-vaccine' },
    { label: 'Tin tức & Sức khỏe',    href: '/tin-tuc' },
];

/* ── contact rows ────────────────────────────── */
const CONTACTS = [
    { icon: 'location-dot', text: 'Số 3 Cầu Giấy, Láng Thượng, Đống Đa, Hà Nội' },
    { icon: 'phone',        text: '0342.046.981',         href: 'tel:0342046981' },
    { icon: 'envelope',     text: 'ivaccine@gmail.com',   href: 'mailto:ivaccine@gmail.com' },
    { icon: 'clock',        text: 'Thứ 2 – Thứ 7: 8:00 – 17:00' },
];

/* ── Google Maps embed — ĐH Giao thông Vận tải Hà Nội ── */
const MAP_URL =
    'https://maps.google.com/maps' +
    '?q=Tr%C6%B0%E1%BB%9Dng+%C4%90%E1%BA%A1i+h%E1%BB%8Dc' +
    '+Giao+th%C3%B4ng+V%E1%BA%ADn+t%E1%BA%A3i+H%C3%A0+N%E1%BB%99i' +
    '&output=embed&z=16';

/* ══════════════════════════════════════════════════════ */
function Footer() {
    return (
        <footer style={{ background: BG_MAIN, color: '#fff', fontSize: '14px' }}>

            {/* ── top accent line ── */}
            <div style={{
                height: '3px',
                background: 'linear-gradient(90deg, #1e3a8a 0%, #38bdf8 50%, #34d399 100%)',
            }}/>

            {/* ── main content ── */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 24px 44px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '40px',
                }}>

                    {/* ── Col 1 : Brand ── */}
                    <div>
                        <div style={{ display: 'inline-block', background: '#fff', borderRadius: '10px', padding: '5px 10px', marginBottom: '16px' }}>
                            <img
                                src={logo} alt="iVaccine"
                                style={{ height: '36px', display: 'block' }}
                            />
                        </div>
                        <p style={{ color: TEXT_DIM, lineHeight: '1.85', marginBottom: '22px', fontSize: '13.5px' }}>
                            Hệ thống đặt lịch tiêm chủng trực tuyến hàng đầu Việt Nam.
                            Vaccine đạt chuẩn WHO, đội ngũ chuyên nghiệp, đặt lịch chỉ trong vài phút.
                        </p>

                        {/* Payment methods */}
                        <div style={{ fontSize: '11px', color: TEXT_MUTE, marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            Phương thức thanh toán
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <img
                                src={vnpay} alt="VNPay"
                                style={{ height: '22px', background: '#fff', borderRadius: '5px', padding: '2px 6px' }}
                            />
                            <PayBadge color="#003087" label="PayPal"/>
                            <PayBadge color="#22863a" label="Tiền mặt"/>
                        </div>
                    </div>

                    {/* ── Col 2 : Quick links ── */}
                    <div>
                        <ColTitle>Liên kết nhanh</ColTitle>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {LINKS.map((link, i) => (
                                <li key={i}>
                                    <FooterLink href={link.href}>{link.label}</FooterLink>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Col 3 : Contact ── */}
                    <div>
                        <ColTitle>Thông tin liên hệ</ColTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                            {CONTACTS.map((c, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    {/* icon bubble */}
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                        background: 'rgba(56,189,248,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <FontAwesomeIcon icon={c.icon} style={{ color: ACCENT, fontSize: '12px' }}/>
                                    </div>
                                    <div style={{ paddingTop: '6px', lineHeight: '1.55', fontSize: '13.5px' }}>
                                        {c.href
                                            ? <HoverLink href={c.href}>{c.text}</HoverLink>
                                            : <span style={{ color: TEXT_DIM }}>{c.text}</span>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* social icons */}
                        <div style={{ fontSize: '11px', color: TEXT_MUTE, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                            Mạng xã hội
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <SocialBtn href="https://www.facebook.com/" bg="#1877f2" label="Facebook">
                                <FontAwesomeIcon icon={['fab', 'facebook-f']} style={{ fontSize: '15px' }}/>
                            </SocialBtn>
                            <SocialBtn href="https://zalo.me/0342046981" bg="#0068ff" label="Zalo">
                                <ZaloIcon/>
                            </SocialBtn>
                        </div>
                    </div>

                    {/* ── Col 4 : Map ── */}
                    <div>
                        <ColTitle>Vị trí của chúng tôi</ColTitle>
                        <div style={{
                            borderRadius: '14px',
                            overflow: 'hidden',
                            border: '2px solid rgba(56,189,248,0.2)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        }}>
                            <iframe
                                src={MAP_URL}
                                width="100%"
                                height="195"
                                style={{ border: 0, display: 'block' }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Đại học Giao thông Vận tải Hà Nội"
                            />
                        </div>
                        <p style={{ color: TEXT_MUTE, fontSize: '12px', marginTop: '10px', lineHeight: '1.6' }}>
                            📍 Số 3 Cầu Giấy, Láng Thượng, Đống Đa, Hà Nội
                        </p>
                    </div>

                </div>
            </div>

            {/* ── divider ── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0 24px' }}/>

            {/* ── bottom bar ── */}
            <div style={{ background: BG_BOTTOM, padding: '16px 24px' }}>
                <div style={{
                    maxWidth: '1200px', margin: '0 auto',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                }}>
                    <p style={{ color: TEXT_MUTE, fontSize: '13px', margin: 0 }}>
                        © 2026 <strong style={{ color: '#fff' }}>iVaccine</strong>. All Rights Reserved.
                    </p>
                    <p style={{ color: TEXT_MUTE, fontSize: '13px', margin: 0 }}>
                        Phát triển bởi{' '}
                        <a
                            href="https://utc.edu.vn" target="_blank" rel="noopener noreferrer"
                            style={{ color: ACCENT, textDecoration: 'none', fontWeight: '600' }}
                        >
                            Ivaacine
                        </a>
                    </p>
                </div>
            </div>

        </footer>
    );
}

/* ── Small helper components ──────────────────────────── */

function ColTitle({ children }) {
    return (
        <h5 style={{
            fontSize: '12px', fontWeight: '800', color: '#fff',
            textTransform: 'uppercase', letterSpacing: '1.2px',
            marginBottom: '20px', paddingBottom: '10px',
            borderBottom: `2px solid ${ACCENT}`,
            display: 'inline-block',
        }}>
            {children}
        </h5>
    );
}

function FooterLink({ href, children }) {
    const [hover, setHover] = useState(false);
    return (
        <a
            href={href}
            style={{
                color:       hover ? ACCENT : TEXT_DIM,
                textDecoration: 'none',
                fontSize:    '14px',
                display:     'flex',
                alignItems:  'center',
                gap:         '8px',
                paddingLeft: hover ? '6px' : '0',
                transition:  'all 0.2s',
            }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
        >
            <span style={{ color: ACCENT, fontSize: '9px', flexShrink: 0 }}>▶</span>
            {children}
        </a>
    );
}

function HoverLink({ href, children }) {
    const [hover, setHover] = useState(false);
    return (
        <a
            href={href}
            style={{ color: hover ? ACCENT : TEXT_DIM, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
        >
            {children}
        </a>
    );
}

function SocialBtn({ href, bg, label, children }) {
    const [hover, setHover] = useState(false);
    return (
        <a
            href={href} target="_blank" rel="noopener noreferrer" title={label}
            style={{
                width:      '42px',
                height:     '42px',
                borderRadius: '11px',
                background: hover ? bg : 'rgba(255,255,255,0.09)',
                border:     hover ? `1.5px solid ${bg}` : '1.5px solid rgba(255,255,255,0.14)',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:      '#fff',
                textDecoration: 'none',
                transform:  hover ? 'translateY(-3px)' : 'none',
                boxShadow:  hover ? `0 6px 16px ${bg}55` : 'none',
                transition: 'all 0.22s',
            }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
        >
            {children}
        </a>
    );
}

function PayBadge({ color, label }) {
    return (
        <div style={{
            background:   color,
            borderRadius: '5px',
            padding:      '3px 9px',
            fontSize:     '11px',
            fontWeight:   '800',
            color:        '#fff',
            letterSpacing:'0.3px',
        }}>
            {label}
        </div>
    );
}

/* ── Zalo icon — styled SVG "Z" ── */
function ZaloIcon() {
    return (
        <svg viewBox="0 0 20 20" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <text
                x="1" y="16"
                fontSize="17"
                fontWeight="900"
                fontFamily="'Arial Black', Arial, sans-serif"
                fill="#ffffff"
            >
                Z
            </text>
        </svg>
    );
}

export default Footer;
