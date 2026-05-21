import { useState } from 'react';
import { toast } from 'react-toastify';
import { postMethodPayload } from '../../services/request';
import Swal from 'sweetalert2';
import logo from '../../assest/images/ivaccine-logo.jpg';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

/* ── palette (shared with login) ─────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const BG       = '#f0f4f8';
const BORDER   = '#e2e8f0';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BG_INPUT = '#f8fafc';

/* ═══════════════════════════════════════════════ */
function Register() {
    const [loading,  setLoading]  = useState(false);
    const [showPass, setShowPass] = useState(false);

    async function handleRegister(event) {
        event.preventDefault();
        setLoading(true);
        const payload = {
            email:          event.target.elements.email.value.trim(),
            username:       event.target.elements.username.value.trim(),
            password:       event.target.elements.password.value,
            repeatPassword: event.target.elements.repeatPassword.value,
        };
        if (payload.password !== payload.repeatPassword) {
            toast.error('Mật khẩu không trùng khớp');
            setLoading(false); return;
        }
        if (payload.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            setLoading(false); return;
        }
        try {
            const res = await postMethodPayload('/api/user/public/register', payload);
            if (!res.ok) {
                const result = await res.json();
                Swal.fire({ icon: 'error', title: 'Đăng ký thất bại', text: result.errorMessage || 'Email đã được sử dụng' });
            } else {
                toast.success('Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.');
                setTimeout(() => { window.location.href = '/activate-account?email=' + encodeURIComponent(payload.email); }, 1500);
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Đăng ký thất bại', text: 'Không thể kết nối đến server' });
        } finally {
            setLoading(false);
        }
    }

    async function processLogin(user, token) {
        toast.success('Đăng nhập thành công!');
        await new Promise(r => setTimeout(r, 1500));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.authorities.name === 'Admin')         window.location.href = 'admin/index';
        if (user.authorities.name === 'Customer')      window.location.href = '/';
        if (user.authorities.name === 'Nurse')         window.location.href = 'staff/vaccine';
        if (user.authorities.name === 'Support Staff') window.location.href = '/staff/chat';
    }

    const handleLoginSuccess = async (accessToken) => {
        const response = await fetch('http://localhost:8080/api/user/login/google', {
            method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: accessToken.credential,
        });
        const result = await response.json();
        if (response.status < 300)   processLogin(result.user, result.token);
        if (response.status === 417) toast.warning(result.defaultMessage);
    };
    const handleLoginError = () => toast.error('Đăng nhập Google thất bại');

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: BG,
            backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(42,56,143,0.07) 0%, transparent 60%), radial-gradient(ellipse at 20% 20%, rgba(14,165,233,0.07) 0%, transparent 60%)',
            padding: '24px',
        }}>
            <div style={{
                width: '100%', maxWidth: '480px',
                background: '#fff', borderRadius: '20px',
                boxShadow: '0 8px 40px rgba(42,56,143,0.12)',
                overflow: 'hidden',
            }}>
                {/* ── Header ── */}
                <div style={{
                    background: `linear-gradient(135deg, #0d1b3e 0%, ${PRIMARY} 50%, ${ACCENT} 100%)`,
                    padding: '26px 32px 22px', textAlign: 'center',
                }}>
                    <img
                        src={logo} alt="iVaccine"
                        style={{ height: '48px', display: 'block', margin: '0 auto 12px', borderRadius: '10px' }}
                    />
                    <h1 style={{ color: '#fff', fontSize: '21px', fontWeight: '800', margin: '0 0 5px', letterSpacing: '-0.3px' }}>
                        Tạo tài khoản
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0 }}>
                        Đăng ký để đặt lịch tiêm chủng dễ dàng
                    </p>
                </div>

                {/* ── Form body ── */}
                <div style={{ padding: '26px 32px 30px' }}>
                    <form onSubmit={handleRegister} autoComplete="off">

                        {/* Email + Username row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <FieldGroup label="Email" required>
                                <StyledInput name="email" type="email" placeholder="email@example.com" required />
                            </FieldGroup>
                            <FieldGroup label="Tên người dùng" required>
                                <StyledInput name="username" placeholder="Tên của bạn" required />
                            </FieldGroup>
                        </div>

                        {/* Password */}
                        <FieldGroup label="Mật khẩu" required style={{ marginTop: '14px' }}>
                            <div style={{ position: 'relative' }}>
                                <StyledInput
                                    name="password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Ít nhất 6 ký tự"
                                    required
                                    style={{ paddingRight: '42px' }}
                                />
                                <ToggleEye show={showPass} onToggle={() => setShowPass(!showPass)} />
                            </div>
                        </FieldGroup>

                        {/* Repeat password */}
                        <FieldGroup label="Nhập lại mật khẩu" required style={{ marginTop: '14px' }}>
                            <div style={{ position: 'relative' }}>
                                <StyledInput
                                    name="repeatPassword"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                    style={{ paddingRight: '42px' }}
                                />
                                <ToggleEye show={showPass} onToggle={() => setShowPass(!showPass)} />
                            </div>
                        </FieldGroup>

                        <GradBtn type="submit" disabled={loading} style={{ marginTop: '22px' }}>
                            {loading ? '⏳ Đang đăng ký...' : 'Đăng ký'}
                        </GradBtn>

                        <OutlineBtn type="button" onClick={() => window.location.href = '/login'} style={{ marginTop: '10px' }}>
                            Đã có tài khoản? <strong>Đăng nhập</strong>
                        </OutlineBtn>
                    </form>

                    {/* divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: BORDER }}/>
                        <span style={{ fontSize: '12px', color: TEXT_2, fontWeight: '600', letterSpacing: '0.5px' }}>HOẶC</span>
                        <div style={{ flex: 1, height: '1px', background: BORDER }}/>
                    </div>

                    <GoogleOAuthProvider clientId="107951312369-74pcdu34hcm30tp96l4m1pvi8kqtvqea.apps.googleusercontent.com">
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
                        </div>
                    </GoogleOAuthProvider>

                    <p style={{ fontSize: '11.5px', color: TEXT_2, textAlign: 'center', marginTop: '16px', lineHeight: '1.6' }}>
                        Bằng cách đăng ký, bạn đồng ý với{' '}
                        <a href="#" style={{ color: ACCENT, textDecoration: 'none' }}>Điều khoản sử dụng</a>
                        {' '}và{' '}
                        <a href="#" style={{ color: ACCENT, textDecoration: 'none' }}>Chính sách quyền riêng tư</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Shared helpers ──────────────────────────────── */
function FieldGroup({ label, required, children, style }) {
    return (
        <div style={style}>
            <label style={{
                display: 'block', fontSize: '12px', fontWeight: '700',
                color: TEXT_2, marginBottom: '7px', letterSpacing: '0.4px', textTransform: 'uppercase',
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

function ToggleEye({ show, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '15px', color: TEXT_2, padding: '2px',
            }}
        >{show ? '🙈' : '👁️'}</button>
    );
}

function GradBtn({ children, style, ...props }) {
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
                boxShadow: hov ? '0 6px 20px rgba(14,165,233,0.45)' : '0 4px 14px rgba(14,165,233,0.3)',
                transform: hov ? 'translateY(-1px)' : 'none',
                transition: 'all 0.2s', letterSpacing: '0.3px',
                ...style,
            }}
        >{children}</button>
    );
}

function OutlineBtn({ children, style, ...props }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            {...props}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                width: '100%', padding: '12px',
                background: hov ? BG : 'transparent',
                color: hov ? PRIMARY : TEXT_2,
                border: `1.5px solid ${BORDER}`,
                borderRadius: '10px', fontWeight: '500', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s',
                ...style,
            }}
        >{children}</button>
    );
}

export default Register;
