import { useState, useEffect, useRef } from 'react';
import { getMethod } from '../../services/request';
import { formatMoney } from '../../services/money';
import Chart from 'chart.js/auto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave, faCalendarDay, faUsers, faSyringe,
  faFilter, faTrophy, faArrowTrendUp,
} from '@fortawesome/free-solid-svg-icons';

/* ── tokens ── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const PURPLE  = '#8b5cf6';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const token  = localStorage.getItem('token');

/* ── StatCard ── */
function StatCard({ icon, label, value, color, sub, gradient }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '22px 24px',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 18, flex: 1,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, flexShrink: 0,
        background: gradient || `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 6px 16px ${color}44`,
      }}>
        <FontAwesomeIcon icon={icon} style={{ color: '#fff', fontSize: 22 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_2, textTransform: 'uppercase',
          letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1.2 }}>{value ?? '—'}</div>
        {sub && <div style={{ fontSize: 12, color: TEXT_2, marginTop: 4 }}>{sub}</div>}
      </div>
      <FontAwesomeIcon icon={faArrowTrendUp} style={{ color: SUCCESS, fontSize: 18, opacity: 0.6 }} />
    </div>
  );
}

/* ══════════ */
const HomeAdmin = () => {
  const [stats,   setStats]   = useState({});
  const [topList, setTopList] = useState([]);
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const chartRef     = useRef(null);
  const chartInstRef = useRef(null);
  const nowYear      = new Date().getFullYear();
  const yearOptions  = Array.from({ length: 10 }, (_, i) => nowYear - i);

  /* load stats */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sRes, vRes] = await Promise.all([
          getMethod('/api/statistic/admin/thong-ke'),
          getMethod('/api/statistic/admin/vaccine-bc'),
        ]);
        setStats(await sRes.json());
        setTopList(await vRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  /* load chart */
  useEffect(() => {
    const loadChart = async () => {
      try {
        const res  = await fetch(`http://localhost:8080/api/statistic/admin/revenue-year?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const vals = data.map(v => v ?? 0);

        if (chartInstRef.current) chartInstRef.current.destroy();
        const ctx = chartRef.current?.getContext('2d');
        if (!ctx) return;

        chartInstRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: MONTHS,
            datasets: [{
              label: `Doanh thu năm ${year}`,
              data: vals,
              backgroundColor: 'rgba(42,56,143,0.75)',
              borderColor: PRIMARY,
              borderRadius: 7,
              borderSkipped: false,
              hoverBackgroundColor: ACCENT,
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: { label: c => ' ' + formatMoney(c.raw) },
                backgroundColor: TEXT,
                padding: 12,
                cornerRadius: 8,
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: TEXT_2, font: { size: 12 } } },
              y: {
                grid: { color: '#f1f5f9', borderDash: [4, 4] },
                ticks: { color: TEXT_2, font: { size: 11 }, callback: v => formatMoney(v) },
              },
            },
          },
        });
      } catch (e) { console.error(e); }
    };
    loadChart();
  }, [year]);

  const rankColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── stat cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard icon={faMoneyBillWave} label="Doanh thu tháng này"
          value={formatMoney(stats.doanhThuThangNay)}
          color={PRIMARY} gradient={`linear-gradient(135deg,${PRIMARY},${ACCENT})`} />
        <StatCard icon={faCalendarDay}   label="Doanh thu hôm nay"
          value={formatMoney(stats.doanhThuHomNay)}
          color={SUCCESS} gradient={`linear-gradient(135deg,#065f46,${SUCCESS})`} />
        <StatCard icon={faUsers}         label="Tổng tài khoản"
          value={stats.nunUser}
          color={PURPLE} gradient={`linear-gradient(135deg,#5b21b6,${PURPLE})`} />
        <StatCard icon={faSyringe}       label="Vaccine hiện có"
          value={stats.nunVaccine}
          color={WARNING} gradient={`linear-gradient(135deg,#92400e,${WARNING})`} />
      </div>

      {/* ── chart section ── */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '22px 24px',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>Doanh thu theo tháng</div>
            <div style={{ fontSize: 13, color: TEXT_2, marginTop: 3 }}>Biểu đồ doanh thu năm {year}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
                fontSize: 13.5, fontWeight: 600, color: TEXT, outline: 'none',
                background: '#f8fafc', cursor: 'pointer',
              }}
            >
              {yearOptions.map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
            <button
              onClick={() => setYear(year)} /* trigger useEffect re-run */
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`,
                color: '#fff', fontSize: 13.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <FontAwesomeIcon icon={faFilter} /> Lọc
            </button>
          </div>
        </div>
        <div style={{ position: 'relative', height: 300 }}>
          <canvas ref={chartRef} />
        </div>
      </div>

      {/* ── top vaccine table ── */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9,
            background: `linear-gradient(135deg,${WARNING},#92400e)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faTrophy} style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Vaccine tiêm nhiều nhất</div>
            <div style={{ fontSize: 12, color: TEXT_2 }}>Thống kê theo số lượng mũi tiêm</div>
          </div>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Hạng', 'Tên Vaccine', 'Loại', 'Giá bán', 'Số mũi tiêm'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: TEXT_2, textTransform: 'uppercase', letterSpacing: '0.4px',
                    borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: TEXT_2 }}>
                  Đang tải...</td></tr>
              ) : topList.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: TEXT_2 }}>
                  Chưa có dữ liệu</td></tr>
              ) : topList.map((item, idx) => (
                <tr key={item.vaccine.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                      background: idx < 3 ? rankColors[idx] + '22' : '#f1f5f9',
                      color: idx < 3 ? rankColors[idx] : TEXT_2,
                      border: idx < 3 ? `2px solid ${rankColors[idx]}` : 'none',
                    }}>
                      {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: TEXT }}>{item.vaccine.name}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: 'rgba(14,165,233,0.1)', color: ACCENT }}>
                      {item.vaccine.vaccineType?.typeName || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: SUCCESS, fontWeight: 700 }}>
                    {formatMoney(item.vaccine.price)}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        height: 6, width: Math.max(20, Math.min(100, (item.sold / (topList[0]?.sold || 1)) * 100)),
                        background: `linear-gradient(90deg,${PRIMARY},${ACCENT})`, borderRadius: 3,
                      }} />
                      <span style={{ fontWeight: 800, color: PRIMARY }}>{item.sold}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HomeAdmin;
