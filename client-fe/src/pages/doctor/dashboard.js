import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSyringe, faCalendarDay, faCalendarWeek, faTrophy,
  faClipboardCheck, faUsers,
} from '@fortawesome/free-solid-svg-icons';

const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const PURPLE  = '#8b5cf6';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const BASE = 'http://localhost:8080';
const token = () => localStorage.getItem('token');
const authFetch = (url) =>
  fetch(BASE + url, { headers: { Authorization: `Bearer ${token()}` } });

function StatCard({ icon, label, value, color, sub, gradient }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 14, minWidth: 0,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 13, flexShrink: 0,
        background: gradient || `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${color}44`,
      }}>
        <FontAwesomeIcon icon={icon} style={{ color: '#fff', fontSize: 20 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_2, textTransform: 'uppercase',
          letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: TEXT, lineHeight: 1.2 }}>
          {value ?? 0}
        </div>
        {sub && <div style={{ fontSize: 11.5, color: TEXT_2, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

const DoctorDashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/doctor/doctor/stats');
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();
  const displayName = user.fullName || user.email || 'Bác sĩ';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Welcome */}
      <div style={{
        background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
        borderRadius: 16, padding: '24px 28px', marginBottom: 22, color: '#fff',
      }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
          👋 Chào bác sĩ {displayName}!
        </h2>
        <div style={{ fontSize: 13.5, marginTop: 6, opacity: 0.9 }}>
          Hôm nay là một ngày mới. Hãy chăm sóc bệnh nhân của bạn thật tốt nhé!
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 24 }}>
        <StatCard icon={faCalendarDay}  label="Hôm nay cần tiêm"
          value={stats.todayCount}
          gradient={`linear-gradient(135deg,${PRIMARY},${ACCENT})`}
          color={PRIMARY} sub="KH được gán cho tôi" />
        <StatCard icon={faSyringe} label="Đã tiêm hôm nay"
          value={stats.todayInjected}
          gradient={`linear-gradient(135deg,#065f46,${SUCCESS})`}
          color={SUCCESS} sub="Mũi tiêm đã hoàn thành" />
        <StatCard icon={faCalendarWeek} label="Tuần này"
          value={stats.weekInjected}
          gradient={`linear-gradient(135deg,#0369a1,${ACCENT})`}
          color={ACCENT} sub="Mũi tiêm 7 ngày qua" />
        <StatCard icon={faTrophy} label="Tổng cộng"
          value={stats.totalInjected}
          gradient={`linear-gradient(135deg,#5b21b6,${PURPLE})`}
          color={PURPLE} sub="Tổng mũi đã tiêm" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

        <QuickAction
          icon={faCalendarDay} color={WARNING}
          title="Lịch tiêm hôm nay"
          desc={`${stats.todayCount || 0} bệnh nhân đang chờ`}
          href="today-queue"
        />
        <QuickAction
          icon={faUsers} color={ACCENT}
          title="Bệnh nhân của tôi"
          desc="Xem hồ sơ + lịch sử tiêm"
          href="my-patients"
        />
        <QuickAction
          icon={faClipboardCheck} color={SUCCESS}
          title="Báo cáo cá nhân"
          desc="KPI + biểu đồ tiêm"
          href="reports"
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: TEXT_2, fontSize: 13 }}>
          Đang tải số liệu...
        </div>
      )}
    </div>
  );
};

function QuickAction({ icon, color, title, desc, href }) {
  return (
    <a href={href} style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 14,
      textDecoration: 'none', color: TEXT,
      transition: 'all .15s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.12)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
        e.currentTarget.style.borderColor = BORDER;
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}15`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 19 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, color: TEXT, fontSize: 14.5 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: TEXT_2, marginTop: 2 }}>{desc}</div>
      </div>
      <i className="fa fa-chevron-right" style={{ color: TEXT_2, fontSize: 12 }} />
    </a>
  );
}

export default DoctorDashboard;
