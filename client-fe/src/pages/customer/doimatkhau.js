import { useState } from 'react';
import { toast } from 'react-toastify';
import { postMethodPayload } from '../../services/request';
import Swal from 'sweetalert2';

/* ── palette ──────────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BORDER   = '#e2e8f0';
const BG_INPUT = '#f8fafc';
const DANGER   = '#ef4444';

/* ── keep logic at module level ─────────────────*/
async function handleChangePass(event) {
    event.preventDefault();
    if (event.target.elements.newpass.value !== event.target.elements.renewpass.value) {
        toast.error('Mật khẩu xác nhận không trùng khớp');
        return;
    }
    const payload = {
        oldPass: event.target.elements.oldpass.value,
        newPass: event.target.elements.newpass.value,
    };
    const res = await postMethodPayload('/api/user/all/change-password', payload);
    if (res.status === 417) {
        const result = await res.json();
        if (result.errorCode === 300) {
            Swal.fire({
                title: 'Thông báo',
                text: 'Tài khoản chưa được kích hoạt, đi tới kích hoạt tài khoản!',
                preConfirm: () => {
                    window.location.href = 'confirm?email=' + event.target.elements.username?.value;
                },
            });
        } else {
            toast.warning(result.defaultMessage);
        }
    }
    if (res.status < 300) {
        toast.success('Đã đổi mật khẩu thành công! Hãy đăng nhập lại');
    }
}

/* ── PasswordField helper ────────────────────── */
function PasswordField({ name, label, required, placeholder }) {
    const [show,    setShow]    = useState(false);
    const [focused, setFocused] = useState(false);

    return (
        <div>
            <label style={{
                display: 'block', fontSize: '12px', fontWeight: '700',
                color: TEXT_2, marginBottom: '7px', letterSpacing: '0.4px',
                textTransform: 'uppercase',
            }}>
                {label}{required && <span style={{ color: DANGER, marginLeft: '3px' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
                <input
                    name={name}
                    type={show ? 'text' : 'password'}
                    placeholder={placeholder || ''}
                    required={required}
                    autoComplete="new-password"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: '100%', padding: '11px 42px 11px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${focused ? ACCENT : BORDER}`,
                        background: BG_INPUT, fontSize: '14px', color: TEXT,
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                    }}
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: TEXT_2, fontSize: '15px', lineHeight: 1, padding: '2px',
                    }}
                    title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                    {show ? '🙈' : '👁️'}
                </button>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════ */
function DoiMatKhau() {
    return (
        <div style={{ maxWidth: '480px' }}>

            {/* security notice */}
            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                background: 'rgba(14,165,233,0.07)', border: `1px solid rgba(14,165,233,0.25)`,
                borderRadius: '12px', padding: '14px 18px', marginBottom: '28px',
            }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>🔐</span>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#0369a1', lineHeight: '1.6' }}>
                    Để bảo mật tài khoản, vui lòng <strong>không chia sẻ mật khẩu</strong> cho người khác.
                    Sử dụng mật khẩu có ít nhất 8 ký tự, kết hợp chữ và số.
                </p>
            </div>

            <form onSubmit={handleChangePass} autoComplete="off">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <PasswordField
                        name="oldpass"
                        label="Mật khẩu hiện tại"
                        required
                        placeholder="Nhập mật khẩu hiện tại"
                    />

                    <PasswordField
                        name="newpass"
                        label="Mật khẩu mới"
                        required
                        placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
                    />

                    <PasswordField
                        name="renewpass"
                        label="Xác nhận mật khẩu mới"
                        required
                        placeholder="Nhập lại mật khẩu mới"
                    />

                </div>

                <button
                    type="submit"
                    style={{
                        marginTop: '28px',
                        padding: '12px 40px',
                        background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                        color: '#fff', border: 'none', borderRadius: '10px',
                        fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                        letterSpacing: '0.4px',
                        boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseOut={e  => e.currentTarget.style.opacity = '1'}
                >
                    🔒 Đổi mật khẩu
                </button>
            </form>

        </div>
    );
}

export default DoiMatKhau;
