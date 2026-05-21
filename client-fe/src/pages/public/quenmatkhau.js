import { useState } from 'react';
import { toast } from 'react-toastify';
import { postMethodPayload } from '../../services/request';
import Swal from 'sweetalert2';
import logo from '../../assest/images/ivaccine-logo.jpg';

/* ── palette ──────────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const BG       = '#f0f4f8';
const BORDER   = '#e2e8f0';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BG_INPUT = '#f8fafc';

/* ═══════════════════════════════════════════════ */
function QuenMatKhau() {
    const [focused,   setFocused]   = useState(false);
    const [submitted, setSubmitted] = useState(false);

    async function handleQuenMk(event) {
        event.preventDefault();
        const payload = {
            url:   window.location.origin + '/datlaimatkhau',
            email: event.target.elements.email.value.trim(),
        };
        const response = await postMethodPayload('/api/user/public/send-request-forgot-password', payload);
        if (response.status < 300) {
            setSubmitted(true);
            Swal.fire({
                title: 'Thông báo',
                text:  'Kiểm tra email của bạn',
                preConfirm: () => { window.location.href = '/'; },
            });
        } else {
            if (response.status === 417) {
                const result = await response.json();
                toast.warning(result.defaultMessage);
            } else {
                toast.error('Thất bại, vui lòng thử lại');
            }
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: BG,
            backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(42,56,143,0.08) 0%, transparent 60%)',
            padding: '24px',
        }}>
            <div style={{
                width: '100%', maxWidth: '420px',
                background: '#fff', borderRadius: '20px',
                boxShadow: '0 8px 40px rgba(42,56,143,0.12)',
                overflow: 'hidden',
            }}>
                {/* ── Header ── */}
                <div style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #1e4fad 50%, ${ACCENT} 100%)`,
                    padding: '28px 32px 24px', textAlign: 'center',
                }}>
                    <img
                        src={logo} alt="iVaccine"
                        style={{ height: '48px', display: 'block', margin: '0 auto 14px', borderRadius: '10px' }}
                    />
                    {/* Lock icon */}
                    <div style={{
                        width: '54px', height: '54px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px', fontSize: '26px',
                    }}>
                        🔑
                    </div>
                    <h1 style={{ color: '#fff', fontSize: '21px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                        Quên mật khẩu
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                        Nhập email để nhận liên kết đặt lại mật khẩu
                    </p>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '30px 32px 34px' }}>
                    {!submitted ? (
                        <form onSubmit={handleQuenMk} autoComplete="off">
                            <label style={{
                                display: 'block', fontSize: '12px', fontWeight: '700',
                                color: TEXT_2, marginBottom: '8px', letterSpacing: '0.4px', textTransform: 'uppercase',
                            }}>
                                Địa chỉ Email <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                placeholder="Nhập email đã đăng ký"
                                required
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '10px',
                                    border: `1.5px solid ${focused ? ACCENT : BORDER}`,
                                    background: BG_INPUT, fontSize: '14px', color: TEXT,
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s', fontFamily: 'inherit',
                                    marginBottom: '22px',
                                }}
                            />

                            <SubmitBtn>Gửi liên kết đặt lại</SubmitBtn>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <a
                                    href="/login"
                                    style={{
                                        fontSize: '14px', color: TEXT_2, textDecoration: 'none',
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        fontWeight: '500',
                                    }}
                                >
                                    ← Quay lại đăng nhập
                                </a>
                            </div>
                        </form>
                    ) : (
                        /* success state */
                        <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
                            <h3 style={{ color: TEXT, fontWeight: '700', fontSize: '17px', marginBottom: '10px' }}>
                                Kiểm tra hộp thư của bạn
                            </h3>
                            <p style={{ color: TEXT_2, fontSize: '14px', lineHeight: '1.7', marginBottom: '22px' }}>
                                Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email của bạn.
                                Vui lòng kiểm tra hộp thư đến (hoặc thư mục spam).
                            </p>
                            <a
                                href="/login"
                                style={{
                                    display: 'inline-block', padding: '11px 32px',
                                    background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                                    color: '#fff', borderRadius: '10px',
                                    fontWeight: '700', fontSize: '14px', textDecoration: 'none',
                                }}
                            >
                                Quay lại đăng nhập
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SubmitBtn({ children }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            type="submit"
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                width: '100%', padding: '13px',
                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                color: '#fff', border: 'none', borderRadius: '10px',
                fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                boxShadow: hov ? '0 6px 20px rgba(14,165,233,0.45)' : '0 4px 14px rgba(14,165,233,0.3)',
                transform: hov ? 'translateY(-1px)' : 'none',
                transition: 'all 0.2s', letterSpacing: '0.3px',
            }}
        >{children}</button>
    );
}

export default QuenMatKhau;
