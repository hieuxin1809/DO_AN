import { useState } from 'react';
import { toast } from 'react-toastify';
import { postMethodPayload } from '../../services/request';
import Swal from 'sweetalert2';
import logo from '../../assest/images/ivaccine-logo.jpg';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

/* ── palette ──────────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const BG       = '#f0f4f8';
const BORDER   = '#e2e8f0';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BG_INPUT = '#f8fafc';

/* ── keep module-level logic (unchanged) ─────── */
async function handleLogin(event) {
    event.preventDefault();
    const payload = {
        email:    event.target.elements.username.value,
        password: event.target.elements.password.value,
    };
    const res    = await postMethodPayload('/api/user/login/email', payload);
    const result = await res.json();
    if (res.status === 417) {
        if (result.errorCode === 300) {
            Swal.fire({
                title: 'Thông báo',
                text:  'Tài khoản chưa được kích hoạt, đi tới kích hoạt tài khoản!',
                preConfirm: () => {
                    window.location.href = 'confirm?email=' + event.target.elements.username.value;
                },
            });
        } else {
            toast.warning(result.defaultMessage);
        }
    }
    if (res.status < 300) processLogin(result.user, result.token);
}

async function processLogin(user, token) {
    toast.success('Đăng nhập thành công!');
    await new Promise(r => setTimeout(r, 1500));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    const role = user?.authorities?.name;
    if (role === 'Admin')         window.location.href = '/admin/index';
    else if (role === 'Customer') window.location.href = '/index';
    else if (role === 'Doctor')   window.location.href = '/staff/customer-schedule-1';
    else if (role === 'Nurse')    window.location.href = '/staff/vaccine';
    else if (role === 'Support Staff') window.location.href = '/staff/chat';
}

/* ═══════════════════════════════════════════════ */
function Login() {
    const [showPass, setShowPass] = useState(false);

    const handleLoginSuccess = async (accessToken) => {
        const response = await fetch('http://localhost:8080/api/user/login/google', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: accessToken.credential,
        });
        const result = await response.json();
        if (response.status < 300) processLogin(result.user, result.token);
        if (response.status === 417) toast.warning(result.defaultMessage);
    };

    const handleLoginError = () => toast.error('Đăng nhập Google thất bại');

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: BG,
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(42,56,143,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(14,165,233,0.07) 0%, transparent 60%)',
            padding: '24px',
        }}>
            <div style={{
                width: '100%', maxWidth: '440px',
                background: '#fff', borderRadius: '20px',
                boxShadow: '0 8px 40px rgba(42,56,143,0.12)',
                overflow: 'hidden',
            }}>
                {/* ── Card header ── */}
                <div style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #1e4fad 50%, ${ACCENT} 100%)`,
                    padding: '28px 32px 24px',
                    textAlign: 'center',
                }}>
                    <img
                        src={logo} alt="iVaccine"
                        style={{ height: '48px', display: 'block', margin: '0 auto 14px', borderRadius: '10px' }}
                    />
                    <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                        Đăng nhập
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13.5px', margin: 0 }}>
                        Chào mừng bạn trở lại iVaccine
                    </p>
                </div>

                {/* ── Form body ── */}
                <div style={{ padding: '28px 32px 32px' }}>
                    <form onSubmit={handleLogin} autoComplete="off">

                        <FieldGroup label="Email / Tên tài khoản" required>
                            <StyledInput name="username" placeholder="Nhập email của bạn" required />
                        </FieldGroup>

                        <FieldGroup label="Mật khẩu" required style={{ marginTop: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <StyledInput
                                    name="password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Nhập mật khẩu"
                                    required
                                    style={{ paddingRight: '42px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '15px', color: TEXT_2, padding: '2px',
                                    }}
                                >{showPass ? '🙈' : '👁️'}</button>
                            </div>
                        </FieldGroup>

                        <div style={{ textAlign: 'right', marginTop: '8px', marginBottom: '20px' }}>
                            <a href="/quenmatkhau" style={{ fontSize: '13px', color: ACCENT, textDecoration: 'none', fontWeight: '500' }}>
                                Quên mật khẩu?
                            </a>
                        </div>

                        <GradBtn type="submit">Đăng nhập</GradBtn>

                        <OutlineBtn type="button" onClick={() => window.location.href = '/register'}>
                            Chưa có tài khoản? <strong>Đăng ký ngay</strong>
                        </OutlineBtn>
                    </form>

                    {/* divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: BORDER }}/>
                        <span style={{ fontSize: '12px', color: TEXT_2, fontWeight: '600', letterSpacing: '0.5px' }}>HOẶC</span>
                        <div style={{ flex: 1, height: '1px', background: BORDER }}/>
                    </div>

                    {/* Google login */}
                    <GoogleOAuthProvider clientId="107951312369-74pcdu34hcm30tp96l4m1pvi8kqtvqea.apps.googleusercontent.com">
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
                        </div>
                    </GoogleOAuthProvider>
                </div>
            </div>
        </div>
    );
}

/* ── Small helpers ──────────────────────────────── */
function FieldGroup({ label, required, children, style }) {
    return (
        <div style={style}>
            <label style={{
                display: 'block', fontSize: '12px', fontWeight: '700',
                color: TEXT_2, marginBottom: '7px',
                letterSpacing: '0.4px', textTransform: 'uppercase',
            }}>
                {label}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
            </label>
            {children}
        </div>
    );
}

function StyledInput({ style, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            {...props}
            style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                border: `1.5px solid ${focused ? ACCENT : BORDER}`,
                background: BG_INPUT, fontSize: '14px', color: TEXT,
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                fontFamily: 'inherit',
                ...style,
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
}

function GradBtn({ children, ...props }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            {...props}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                width: '100%', padding: '13px',
                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                color: '#fff', border: 'none', borderRadius: '10px',
                fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                letterSpacing: '0.3px',
                boxShadow: hov ? '0 6px 20px rgba(14,165,233,0.45)' : '0 4px 14px rgba(14,165,233,0.3)',
                transform: hov ? 'translateY(-1px)' : 'none',
                transition: 'all 0.2s',
            }}
        >{children}</button>
    );
}

function OutlineBtn({ children, ...props }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            {...props}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                width: '100%', marginTop: '12px', padding: '12px',
                background: hov ? BG : 'transparent',
                color: hov ? PRIMARY : TEXT_2, border: `1.5px solid ${BORDER}`,
                borderRadius: '10px', fontWeight: '500', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s',
            }}
        >{children}</button>
    );
}

export default Login;
