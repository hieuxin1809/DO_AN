import { useEffect, useState } from 'react';

/**
 * Wrap component yêu cầu role nhất định.
 * Nếu user không thuộc role cho phép → redirect về landing page của họ
 * hoặc trang /login nếu chưa login.
 *
 * Dùng:
 *   <RoleGuard allow={['Admin']}>
 *     <AdminPage />
 *   </RoleGuard>
 */
export default function RoleGuard({ allow = [], children }) {
  const [status, setStatus] = useState('checking');  // 'checking' | 'allowed' | 'denied'

  useEffect(() => {
    let userRole = null;
    let hasToken = false;
    try {
      hasToken = !!localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userRole = user?.authorities?.name || null;
    } catch {}

    if (!hasToken || !userRole) {
      // Chưa login → chuyển về login
      window.location.replace('/login');
      return;
    }

    if (allow.length === 0 || allow.includes(userRole)) {
      setStatus('allowed');
      return;
    }

    // Đã login nhưng sai role → đẩy về home page của role họ
    const home =
      userRole === 'Admin'    ? '/admin/index' :
      userRole === 'Doctor'   ? '/doctor/dashboard' :
      userRole === 'Customer' ? '/' :
      '/login';
    setStatus('denied');
    // Hiện thông báo + redirect sau 800ms để user thấy
    setTimeout(() => { window.location.replace(home); }, 800);
  }, [allow]);

  if (status === 'checking') {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', flexDirection: 'column', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, border: '4px solid #e2e8f0',
          borderTopColor: '#0ea5e9', borderRadius: '50%',
          animation: 'role-spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes role-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ fontSize: 13, color: '#64748b' }}>Đang kiểm tra quyền truy cập…</div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          Bạn không có quyền truy cập trang này
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Đang chuyển hướng…</div>
      </div>
    );
  }

  return <>{children}</>;
}
