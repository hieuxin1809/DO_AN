import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine, faSyringe, faCalendarDay, faTrophy,
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

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      flex: '1 1 200px', minWidth: 200,
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 10px rgba(0,0,0,.05)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 11, background: `${color}15`, color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 18 }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_2, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1.2 }}>{value ?? 0}</div>
      </div>
    </div>
  );
}

const DoctorReports = () => {
  const [stats,   setStats]   = useState({});
  const [byDay,   setByDay]   = useState([]);
  const [byVaccine, setByVaccine] = useState([]);
  const [loading, setLoading] = useState(true);

  const dayChartRef = useRef(null);
  const dayChartInst = useRef(null);
  const vaccineChartRef = useRef(null);
  const vaccineChartInst = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, d, v] = await Promise.all([
          authFetch('/api/doctor/doctor/stats'),
          authFetch('/api/doctor/doctor/stats-by-day?days=7'),
          authFetch('/api/doctor/doctor/stats-by-vaccine'),
        ]);
        if (s.ok) setStats(await s.json());
        if (d.ok) setByDay(await d.json());
        if (v.ok) setByVaccine(await v.json());
      } catch { toast.error('Không tải được báo cáo'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Day chart
  useEffect(() => {
    if (!byDay || byDay.length === 0) return;
    if (dayChartInst.current) dayChartInst.current.destroy();
    const ctx = dayChartRef.current?.getContext('2d');
    if (!ctx) return;

    dayChartInst.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: byDay.map(d => d.label || d.date),
        datasets: [{
          label: 'Số mũi tiêm',
          data: byDay.map(d => d.count || 0),
          backgroundColor: 'rgba(14,165,233,0.75)',
          borderColor: ACCENT, borderRadius: 7, borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: TEXT_2 } },
          y: { grid: { color: '#f1f5f9' }, ticks: { color: TEXT_2, stepSize: 1 }, beginAtZero: true },
        },
      },
    });
  }, [byDay]);

  // Vaccine pie chart
  useEffect(() => {
    if (!byVaccine || byVaccine.length === 0) return;
    if (vaccineChartInst.current) vaccineChartInst.current.destroy();
    const ctx = vaccineChartRef.current?.getContext('2d');
    if (!ctx) return;

    const colors = ['#2A388F', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
    vaccineChartInst.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: byVaccine.map(v => v.vaccineName || '—'),
        datasets: [{
          data: byVaccine.map(v => v.count || 0),
          backgroundColor: byVaccine.map((_, i) => colors[i % colors.length]),
          borderWidth: 2, borderColor: '#fff',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 12 }, color: TEXT_2, padding: 10, boxWidth: 12 } },
        },
      },
    });
  }, [byVaccine]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg,${PURPLE},#5b21b6)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(139,92,246,.3)' }}>
          <FontAwesomeIcon icon={faChartLine} style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>
            Báo cáo cá nhân
          </h2>
          <div style={{ fontSize: 13, color: TEXT_2 }}>
            KPI và biểu đồ tiêm chủng của bạn
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard icon={faCalendarDay} label="Hôm nay"   value={stats.todayInjected || 0} color={PRIMARY} />
        <StatCard icon={faSyringe}     label="Tuần này"  value={stats.weekInjected || 0}  color={ACCENT} />
        <StatCard icon={faChartLine}   label="Tháng này" value={stats.monthInjected || 0} color={SUCCESS} />
        <StatCard icon={faTrophy}      label="Tổng cộng" value={stats.totalInjected || 0} color={PURPLE} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 24 }}>

        <Section title="Mũi tiêm 7 ngày qua" subtitle="Số mũi tiêm theo ngày">
          <div style={{ padding: 16, height: 280 }}>
            {byDay.length === 0 && !loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: TEXT_2, fontSize: 13 }}>
                Chưa có dữ liệu
              </div>
            ) : <canvas ref={dayChartRef} />}
          </div>
        </Section>

        <Section title="Phân bố vaccine" subtitle="Loại đã tiêm">
          <div style={{ padding: 16, height: 280 }}>
            {byVaccine.length === 0 && !loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: TEXT_2, fontSize: 13 }}>
                Chưa có dữ liệu
              </div>
            ) : <canvas ref={vaccineChartRef} />}
          </div>
        </Section>
      </div>
    </div>
  );
};

function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export default DoctorReports;
