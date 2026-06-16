import React, { useState, useEffect } from 'react';
import { postMethodPayload } from '../../services/request';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useLocation } from 'react-router-dom';
import logo from '../../assest/images/ivaccine-logo.jpg';

/* ── palette ──────────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const BG       = '#f0f4f8';
const BORDER   = '#e2e8f0';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BG_INPUT = '#f8fafc';

function ActivateAccount() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    // Lấy email từ query parameters
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  async function handleActivateAccount(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await postMethodPayload('/api/user/public/active-account', {
        email: email.trim(),
        key: code.trim(),
      });
      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        toast.success(
          result.message || '🎉 Tài khoản của bạn đã được kích hoạt thành công!'
        );
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        const result = await res.json().catch(() => ({}));
        Swal.fire({
          icon: 'error',
          title: 'Kích hoạt thất bại',
          text: result.message || 'Mã xác nhận không chính xác hoặc đã hết hạn.',
          confirmButtonColor: PRIMARY,
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Kích hoạt thất bại',
        text: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
        confirmButtonColor: PRIMARY,
      });
    } finally {
      setLoading(false);
    }
  }

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
            Kích hoạt tài khoản
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13.5px', margin: 0 }}>
            Hoàn tất xác nhận để sử dụng hệ thống iVaccine
          </p>
        </div>

        {/* ── Form body ── */}
        <div style={{ padding: '28px 32px 32px' }}>
          <form onSubmit={handleActivateAccount} autoComplete="off">
            <FieldGroup label="Địa chỉ Email" required>
              <StyledInput
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Nhập email đã đăng ký"
              />
            </FieldGroup>

            <FieldGroup label="Mã xác nhận (Kích hoạt)" required style={{ marginTop: '16px' }}>
              <StyledInput
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="Nhập mã xác nhận nhận được qua email"
                style={{ letterSpacing: code ? '2px' : 'normal', fontWeight: code ? '700' : 'normal' }}
              />
            </FieldGroup>

            <div style={{ marginTop: '24px' }}>
              <GradBtn type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Kích hoạt ngay'}
              </GradBtn>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <a href="/login" style={{ fontSize: '14px', color: ACCENT, textDecoration: 'none', fontWeight: '600' }}>
                Quay lại trang Đăng nhập
              </a>
            </div>
          </form>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0 10px' }}>
            <div style={{ flex: 1, height: '1px', background: BORDER }}/>
          </div>

          <p style={{ fontSize: '12px', color: TEXT_2, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            Không nhận được mã xác nhận? Vui lòng kiểm tra kỹ hòm thư rác (Spam) hoặc đăng ký lại bằng địa chỉ email khác.
          </p>
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

export default ActivateAccount;