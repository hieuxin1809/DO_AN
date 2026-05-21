import { useState, useEffect } from 'react';
import { getMethod } from '../../services/request';
import LichDaDangKy from './lichdadangky';
import DoiMatKhau from './doimatkhau';
import CapNhatThongTin from './capnhatthongtin';
import FeedBack from './feedback';

/* ── palette ──────────────────────────────────── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const BG_PAGE = '#f0f4f8';
const BG_CARD = '#ffffff';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BORDER   = '#e2e8f0';

/* ── sidebar items ────────────────────────────── */
const NAV_ITEMS = [
    { id: 0, icon: '👤', label: 'Thông tin cá nhân' },
    { id: 1, icon: '📅', label: 'Lịch tiêm chủng'  },
    { id: 2, icon: '🔒', label: 'Đổi mật khẩu'     },
    { id: 3, icon: '💬', label: 'Phản hồi của tôi'  },
];

/* ════════════════════════════════════════════════ */
function TaiKhoan() {
    const [tab, setTab]       = useState(0);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (window.location.hash === '#lichtiem') setTab(1);

        const fetchProfile = async () => {
            try {
                const res = await getMethod('/api/customer-profile/customer/find-by-user');
                if (res.status === 200) {
                    const text = await res.text();
                    if (text) setProfile(JSON.parse(text));
                }
            } catch (_) {}
        };
        fetchProfile();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const avatarUrl = profile?.avatar
        ? profile.avatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'U')}&background=2A388F&color=fff&size=80`;

    return (
        <div style={{ background: BG_PAGE, minHeight: '82vh', padding: '36px 0 60px' }}>
            <div style={{
                maxWidth: '1200px', margin: '0 auto', padding: '0 20px',
                display: 'flex', gap: '24px', alignItems: 'flex-start',
            }}>

                {/* ── Sidebar ─────────────────────────────── */}
                <div style={{ width: '255px', flexShrink: 0 }}>

                    {/* profile card */}
                    <div style={{
                        background: BG_CARD, borderRadius: '16px',
                        padding: '24px 20px', textAlign: 'center',
                        marginBottom: '10px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        border: `1px solid ${BORDER}`,
                    }}>
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}>
                            <img
                                src={avatarUrl}
                                alt="avatar"
                                style={{
                                    width: '76px', height: '76px', borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: `3px solid ${ACCENT}`,
                                    display: 'block',
                                }}
                            />
                            <span style={{
                                position: 'absolute', bottom: '3px', right: '3px',
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: '#10b981', border: '2px solid #fff',
                                display: 'block',
                            }}/>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: TEXT, marginBottom: '4px' }}>
                            {profile?.fullName || 'Người dùng'}
                        </div>
                        <div style={{ fontSize: '12px', color: TEXT_2 }}>
                            {profile?.phone || ''}
                        </div>
                    </div>

                    {/* nav */}
                    <div style={{
                        background: BG_CARD, borderRadius: '16px', overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`,
                    }}>
                        {NAV_ITEMS.map(item => (
                            <NavBtn
                                key={item.id}
                                active={tab === item.id}
                                onClick={() => setTab(item.id)}
                            >
                                <span style={{ fontSize: '17px' }}>{item.icon}</span>
                                <span>{item.label}</span>
                            </NavBtn>
                        ))}

                        <div style={{ height: '1px', background: BORDER, margin: '4px 16px' }}/>

                        <NavBtn onClick={handleLogout} danger>
                            <span style={{ fontSize: '17px' }}>🚪</span>
                            <span>Đăng xuất</span>
                        </NavBtn>
                    </div>
                </div>

                {/* ── Main content ─────────────────────────── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        background: BG_CARD, borderRadius: '16px', padding: '28px 30px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`,
                    }}>
                        {/* section header */}
                        <div style={{
                            borderBottom: `2px solid ${BORDER}`,
                            paddingBottom: '14px', marginBottom: '26px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            <span style={{ fontSize: '22px' }}>{NAV_ITEMS[tab]?.icon}</span>
                            <h4 style={{ margin: 0, color: PRIMARY, fontWeight: '800', fontSize: '18px' }}>
                                {NAV_ITEMS[tab]?.label}
                            </h4>
                        </div>

                        {tab === 0 && <CapNhatThongTin />}
                        {tab === 1 && <LichDaDangKy />}
                        {tab === 2 && <DoiMatKhau />}
                        {tab === 3 && <FeedBack />}
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ── NavBtn helper ──────────────────────────────── */
function NavBtn({ active, danger, onClick, children }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '12px',
                width:       '100%',
                padding:     '13px 20px',
                border:      'none',
                borderLeft:  active
                    ? `4px solid ${ACCENT}`
                    : hover && !danger
                        ? `4px solid ${BORDER}`
                        : '4px solid transparent',
                background:  active
                    ? 'rgba(14,165,233,0.09)'
                    : hover ? 'rgba(0,0,0,0.03)' : 'transparent',
                color:       danger ? '#ef4444' : active ? ACCENT : TEXT,
                fontWeight:  active ? '700' : '400',
                fontSize:    '14px',
                cursor:      'pointer',
                textAlign:   'left',
                transition:  'all 0.15s',
            }}
        >
            {children}
        </button>
    );
}

export default TaiKhoan;
