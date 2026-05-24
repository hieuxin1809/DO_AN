import { useState, useEffect, useRef } from 'react';
import { getMethod } from '../../services/request';
import { formatMoney } from '../../services/money';
import Chart from 'chart.js/auto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave, faCalendarDay, faUsers, faSyringe,
  faFilter, faTrophy, faUserMd, faCalendarCheck,
  faBoxOpen, faClock, faChartPie, faCircleCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

/* ── tokens ── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const DANGER  = '#ef4444';
const PURPLE  = '#8b5cf6';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const STATUS_VI = {
  pending: 'Chờ duyệt', confirmed: 'Đã duyệt', injected: 'Đã tiêm',
  finished: 'Hoàn thành', cancelled: 'Đã hủy', not_injected: 'Chưa tiêm',
};
const STATUS_COLOR = {
  pending: '#f59e0b', confirmed: '#0ea5e9', injected: '#3b82f6',
  finished: '#10b981', cancelled: '#94a3b8', not_injected: '#ef4444',
};

const token = () => localStorage.getItem('token');

/* ── StatCard ── */
function StatCard({ icon, label, value, color, sub, gradient }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 14, minWidth: 0,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: gradient || `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${color}44`,
      }}>
        <FontAwesomeIcon icon={icon} style={{ color: '#fff', fontSize: 18 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_2, textTransform: 'uppercase',
          letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, lineHeight: 1.2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ?? '—'}
        </div>
        {sub && <div style={{ fontSize: 11, color: TEXT_2, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Card wrapper ── */
function Section({ title, subtitle, icon, iconBg, children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      ...style,
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={icon} style={{ color: '#fff', fontSize: 14 }} />
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: TEXT_2 }}>{subtitle}</div>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ══════════ */
const HomeAdmin = () => {
  const [stats,   setStats]   = useState({});
  const [topList, setTopList] = useState([]);
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const revenueChartRef = useRef(null);
  const revenueChartInst = useRef(null);
  const statusChartRef = useRef(null);
  const statusChartInst = useRef(null);

  const nowYear     = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => nowYear - i);

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

  /* revenue chart */
  useEffect(() => {
    const loadChart = async () => {
      try {
        const res  = await fetch(`http://localhost:8080/api/statistic/admin/revenue-year?year=${year}`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const data = await res.json();
        const vals = data.map(v => v ?? 0);

        if (revenueChartInst.current) revenueChartInst.current.destroy();
        const ctx = revenueChartRef.current?.getContext('2d');
        if (!ctx) return;

        revenueChartInst.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: MONTHS,
            datasets: [{
              label: `Doanh thu năm ${year}`,
              data: vals,
              backgroundColor: 'rgba(42,56,143,0.75)',
              borderColor: PRIMARY, borderRadius: 7, borderSkipped: false,
              hoverBackgroundColor: ACCENT,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: c => ' ' + formatMoney(c.raw) },
                backgroundColor: TEXT, padding: 12, cornerRadius: 8 },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: TEXT_2, font: { size: 12 } } },
              y: { grid: { color: '#f1f5f9' }, ticks: { color: TEXT_2, font: { size: 11 },
                callback: v => formatMoney(v) } },
            },
          },
        });
      } catch (e) { console.error(e); }
    };
    loadChart();
  }, [year]);

  /* status pie chart */
  useEffect(() => {
    if (!stats.statusCounts) return;
    const labels = Object.keys(stats.statusCounts).filter(k => stats.statusCounts[k] > 0);
    const data   = labels.map(k => stats.statusCounts[k]);
    const colors = labels.map(k => STATUS_COLOR[k] || '#94a3b8');
    const labelsVi = labels.map(k => STATUS_VI[k] || k);

    if (statusChartInst.current) statusChartInst.current.destroy();
    const ctx = statusChartRef.current?.getContext('2d');
    if (!ctx) return;

    statusChartInst.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labelsVi,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 12 }, color: TEXT_2,
            padding: 10, boxWidth: 12 } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}` } },
        },
      },
    });
  }, [stats]);

  const rankColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT }}>📊 Tổng quan hệ thống</h2>
        <div style={{ fontSize: 13, color: TEXT_2, marginTop: 4 }}>
          Dữ liệu thống kê iVaccine tính đến {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* ── STAT CARDS ROW 1 — Doanh thu + lịch + customer ── */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 14 }}>
        <StatCard icon={faMoneyBillWave} label="Doanh thu tháng này"
          value={formatMoney(stats.doanhThuThangNay)}
          color={PRIMARY} gradient={`linear-gradient(135deg,${PRIMARY},${ACCENT})`} />
        <StatCard icon={faCalendarDay} label="Doanh thu hôm nay"
          value={formatMoney(stats.doanhThuHomNay)}
          color={SUCCESS} gradient={`linear-gradient(135deg,#065f46,${SUCCESS})`} />
        <StatCard icon={faCalendarCheck} label="Lịch tiêm hôm nay"
          value={stats.bookingsToday ?? 0}
          color={ACCENT} gradient={`linear-gradient(135deg,#0369a1,${ACCENT})`}
          sub="Theo ngày dự kiến tiêm" />
        <StatCard icon={faUsers} label="Tổng khách hàng"
          value={stats.totalCustomers ?? 0}
          color={PURPLE} gradient={`linear-gradient(135deg,#5b21b6,${PURPLE})`}
          sub={`+${stats.totalDoctors || 0} BS · ${stats.totalNurses || 0} y tá`} />
      </div>

      {/* ── STAT CARDS ROW 2 — Cảnh báo + hoàn thành ── */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 24 }}>
        <StatCard icon={faSyringe} label="Vaccine có trong hệ thống"
          value={stats.nunVaccine ?? 0}
          color={WARNING} gradient={`linear-gradient(135deg,#92400e,${WARNING})`} />
        <StatCard icon={faBoxOpen} label="Vaccine sắp hết"
          value={stats.lowStockVaccines?.length ?? 0}
          color={DANGER} gradient={`linear-gradient(135deg,#991b1b,${DANGER})`}
          sub="Tồn kho ≤ 10" />
        <StatCard icon={faClock} label="Vaccine sắp hết hạn"
          value={stats.expiringSoonVaccines?.length ?? 0}
          color={WARNING} gradient={`linear-gradient(135deg,#9a3412,${WARNING})`}
          sub="Trong 60 ngày tới" />
        <StatCard icon={faCircleCheck} label="Tỷ lệ hoàn thành"
          value={`${stats.completionRate ?? 0}%`}
          color={SUCCESS} gradient={`linear-gradient(135deg,#065f46,${SUCCESS})`}
          sub={`${stats.totalCompleted || 0}/${stats.totalNonCancelled || 0} mũi`} />
      </div>

      {/* ── CHARTS ROW: revenue + status pie ── */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: 16, marginBottom: 24 }}>

        {/* Revenue chart */}
        <Section
          title="Doanh thu theo tháng"
          subtitle={`Biểu đồ doanh thu năm ${year}`}
          icon={faMoneyBillWave}
          iconBg={`linear-gradient(135deg,${PRIMARY},${ACCENT})`}
        >
          <div style={{ padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 10, borderBottom: `1px solid ${BORDER}` }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
                fontSize: 13, fontWeight: 600, color: TEXT, outline: 'none',
                background: '#f8fafc', cursor: 'pointer' }}>
              {yearOptions.map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          </div>
          <div style={{ padding: 16, height: 320 }}>
            <canvas ref={revenueChartRef} />
          </div>
        </Section>

        {/* Status pie */}
        <Section
          title="Phân bố trạng thái lịch tiêm"
          subtitle={`${stats.totalNonCancelled || 0} lịch (chưa tính đã hủy)`}
          icon={faChartPie}
          iconBg={`linear-gradient(135deg,#5b21b6,${PURPLE})`}
        >
          <div style={{ padding: 16, height: 320 + 49 /* +header padding inside revenue */ }}>
            <canvas ref={statusChartRef} />
          </div>
        </Section>
      </div>

      {/* ── WARNINGS ROW: low stock + expiring ── */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: 16, marginBottom: 24 }}>

        {/* Low stock */}
        <Section
          title="Vaccine sắp hết kho"
          subtitle={`${stats.lowStockVaccines?.length ?? 0} loại có tồn kho ≤ 10`}
          icon={faTriangleExclamation}
          iconBg={`linear-gradient(135deg,#991b1b,${DANGER})`}
        >
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {!stats.lowStockVaccines || stats.lowStockVaccines.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: TEXT_2, fontSize: 13.5 }}>
                ✅ Tất cả vaccine đều đủ kho
              </div>
            ) : stats.lowStockVaccines.map((v, idx) => (
              <div key={v.id} style={{ padding: '12px 20px',
                borderBottom: idx === stats.lowStockVaccines.length - 1 ? 'none' : `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.name}
                  </div>
                  {v.vaccineType && (
                    <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>{v.vaccineType}</div>
                  )}
                </div>
                <span style={{ padding: '5px 12px', borderRadius: 16, fontSize: 13, fontWeight: 800,
                  background: v.inventory <= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                  color: v.inventory <= 3 ? DANGER : WARNING, whiteSpace: 'nowrap',
                }}>
                  {v.inventory} liều
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Expiring soon */}
        <Section
          title="Vaccine sắp hết hạn"
          subtitle={`${stats.expiringSoonVaccines?.length ?? 0} loại hết hạn trong 60 ngày`}
          icon={faClock}
          iconBg={`linear-gradient(135deg,#9a3412,${WARNING})`}
        >
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {!stats.expiringSoonVaccines || stats.expiringSoonVaccines.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: TEXT_2, fontSize: 13.5 }}>
                ✅ Không có vaccine nào sắp hết hạn
              </div>
            ) : stats.expiringSoonVaccines.map((v, idx) => (
              <div key={v.id} style={{ padding: '12px 20px',
                borderBottom: idx === stats.expiringSoonVaccines.length - 1 ? 'none' : `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.name}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>
                    HSD: {v.expirationDate ? new Date(v.expirationDate).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
                <span style={{ padding: '5px 12px', borderRadius: 16, fontSize: 13, fontWeight: 800,
                  background: v.daysLeft <= 14 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                  color: v.daysLeft <= 14 ? DANGER : WARNING, whiteSpace: 'nowrap',
                }}>
                  còn {v.daysLeft} ngày
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Top vaccines table ── */}
      <Section
        title="Top vaccine được đăng ký"
        subtitle="Xếp theo số mũi đã đăng ký"
        icon={faTrophy}
        iconBg={`linear-gradient(135deg,${WARNING},#92400e)`}
      >
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
              ) : topList.slice(0, 10).map((item, idx) => (
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
      </Section>
    </div>
  );
};

export default HomeAdmin;
