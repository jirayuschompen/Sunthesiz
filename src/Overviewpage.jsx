/* eslint-disable no-unused-vars */
import { useState } from 'react';
import {
  Wind, Droplets, Gauge, Eye, Sun, CloudRain, Leaf, Zap,
  AlertTriangle, Factory, TrendingUp, Activity, DollarSign,
  Bell, X, Clock, Trash2, Banknote,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, ComposedChart,
  CartesianGrid, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// ─── Semi-circular Gauge ──────────────────────────────────────────────────────
const SemiGauge = ({ value = 50, min = 0, max = 100, invert = false, theme }) => {
  const dk = theme === 'dark';
  let pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (invert) pct = 1 - pct;
  const W = 108, H = 62;
  const cx = W / 2, cy = H - 10, r = 44;
  const pt = (p) => {
    const rad = Math.PI * (1 - p);
    return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
  };
  const arcPath = (p0, p1) => {
    const [x0, y0] = pt(p0);
    const [x1, y1] = pt(p1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${(p1 - p0) > 0.5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const [nx, ny] = pt(pct);
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <path d={arcPath(0, 1)} fill="none" stroke={dk ? '#1e293b' : '#e2e8f0'} strokeWidth="11" strokeLinecap="butt" />
      {[{ p0: 0, p1: 0.333, color: '#ef4444' }, { p0: 0.333, p1: 0.666, color: '#f59e0b' }, { p0: 0.666, p1: 1, color: '#22c55e' }].map((z) => (
        <path key={z.color} d={arcPath(z.p0, z.p1)} fill="none" stroke={z.color} strokeWidth="11" strokeLinecap="butt" opacity="0.9" />
      ))}
      {ticks.map((p) => {
        const [tx0, ty0] = pt(p);
        const [tx1, ty1] = [cx + (r * 0.85) * Math.cos(Math.PI * (1 - p)), cy - (r * 0.85) * Math.sin(Math.PI * (1 - p))];
        return <line key={p} x1={tx0.toFixed(1)} y1={ty0.toFixed(1)} x2={tx1.toFixed(1)} y2={ty1.toFixed(1)} stroke={dk ? '#0f172a' : '#ffffff'} strokeWidth={p % 0.5 === 0 ? 2 : 1} opacity="0.7" />;
      })}
      <line x1={cx} y1={cy} x2={(nx + 1).toFixed(1)} y2={(ny + 1).toFixed(1)} stroke="rgba(0,0,0,0.3)" strokeWidth="3" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke={dk ? '#f1f5f9' : '#1e293b'} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5.5" fill={dk ? '#334155' : '#94a3b8'} />
      <circle cx={cx} cy={cy} r="3" fill={dk ? '#f1f5f9' : '#ffffff'} />
      <text x="5" y={H - 1} fontSize="6" fill="#ef4444" fontWeight="700" fontFamily="sans-serif">LOW</text>
      <text x={cx - 8} y="10" fontSize="6" fill="#f59e0b" fontWeight="700" fontFamily="sans-serif">MED</text>
      <text x={W - 24} y={H - 1} fontSize="6" fill="#22c55e" fontWeight="700" fontFamily="sans-serif">HIGH</text>
    </svg>
  );
};

// ─── Static mock data ─────────────────────────────────────────────────────────
const generateEnvData = () =>
  Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    irradiation: h >= 6 && h <= 18 ? Math.max(0, Math.round(1000 * Math.sin(((h - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 80)) : 0,
    temperature: Math.round(28 + 6 * Math.sin(((h - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 2),
  }));

const revenueForcastDataSets = {
  daily: Array.from({ length: 24 }, (_, h) => {
    const base = h >= 6 && h <= 18 ? Math.round(500 * Math.sin(((h - 6) / 12) * Math.PI)) : 0;
    return { label: `${String(h).padStart(2, '0')}:00`, actual: h <= 14 ? Math.round(base + (Math.random() - 0.5) * 40) : 0, forecast: Math.round(base * 1.05), upper: Math.round(base * 1.2), lower: Math.round(base * 0.85) };
  }),
  weekly: [
    { label: 'Mon', actual: 4250, forecast: 4300, upper: 4800, lower: 3800 },
    { label: 'Tue', actual: 4600, forecast: 4500, upper: 5000, lower: 4000 },
    { label: 'Wed', actual: 4100, forecast: 4200, upper: 4700, lower: 3700 },
    { label: 'Thu', actual: 4850, forecast: 4800, upper: 5300, lower: 4300 },
    { label: 'Fri', actual: 5100, forecast: 5000, upper: 5600, lower: 4500 },
    { label: 'Sat', actual: 3800, forecast: 3900, upper: 4400, lower: 3400 },
    { label: 'Sun', actual: 0,    forecast: 3600, upper: 4100, lower: 3100 },
  ],
  monthly: [
    { label: 'Jan', actual: 125000, forecast: 122000, upper: 138000, lower: 108000 },
    { label: 'Feb', actual: 132000, forecast: 130000, upper: 147000, lower: 115000 },
    { label: 'Mar', actual: 148000, forecast: 145000, upper: 163000, lower: 129000 },
    { label: 'Apr', actual: 162000, forecast: 158000, upper: 178000, lower: 140000 },
    { label: 'May', actual: 171000, forecast: 175000, upper: 197000, lower: 155000 },
    { label: 'Jun', actual: 155000, forecast: 160000, upper: 180000, lower: 142000 },
    { label: 'Jul', actual: 0,      forecast: 168000, upper: 190000, lower: 148000 },
    { label: 'Aug', actual: 0,      forecast: 180000, upper: 203000, lower: 159000 },
    { label: 'Sep', actual: 0,      forecast: 172000, upper: 194000, lower: 152000 },
    { label: 'Oct', actual: 0,      forecast: 185000, upper: 209000, lower: 163000 },
    { label: 'Nov', actual: 0,      forecast: 178000, upper: 201000, lower: 157000 },
    { label: 'Dec', actual: 0,      forecast: 192000, upper: 217000, lower: 169000 },
  ],
  yearly: [
    { label: '2021', actual: 1420000, forecast: 1380000, upper: 1560000, lower: 1220000 },
    { label: '2022', actual: 1680000, forecast: 1650000, upper: 1860000, lower: 1460000 },
    { label: '2023', actual: 1920000, forecast: 1950000, upper: 2200000, lower: 1720000 },
    { label: '2024', actual: 2150000, forecast: 2100000, upper: 2370000, lower: 1860000 },
    { label: '2025', actual: 0,       forecast: 2450000, upper: 2770000, lower: 2170000 },
  ],
};

const fmtRevenue = (v) => {
  if (!v) return '฿0';
  if (v >= 1000000) return `฿${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `฿${(v / 1000).toFixed(0)}k`;
  return `฿${v}`;
};

const envData = generateEnvData();

// ─── Severity icon ────────────────────────────────────────────────────────────
const SevIcon = ({ s }) => {
  if (s === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />;
  if (s === 'high')     return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  if (s === 'medium')   return <Clock className="w-4 h-4 text-yellow-500" />;
  return <Bell className="w-4 h-4 text-blue-500" />;
};

// ─── Period toggle ────────────────────────────────────────────────────────────
const PeriodToggle = ({ value, onChange, options, active = 'bg-blue-600', isDark }) => (
  <div className={`flex rounded-lg overflow-hidden border text-[10px] font-semibold ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
    {options.map((p) => (
      <button key={p} onClick={() => onChange(p)}
        className={`px-2.5 py-1 capitalize transition-all ${value === p ? `${active} text-white` : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
        {p.charAt(0).toUpperCase() + p.slice(1)}
      </button>
    ))}
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    online:  { bg: 'bg-green-500/15',  text: 'text-green-400',  dot: 'bg-green-400',  label: 'ONLINE'  },
    warning: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'WARNING' },
    offline: { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: 'bg-red-400',    label: 'OFFLINE' },
  }[status] ?? { bg: 'bg-slate-700', text: 'text-slate-300', dot: 'bg-slate-400', label: status?.toUpperCase() };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
};

// ─── SIN helper for hourly distribution ──────────────────────────────────────
const SIN_HRS_CF = Array.from({ length: 13 }, (_, i) => Math.sin((i / 12) * Math.PI));
const SIN_SUM_CF = SIN_HRS_CF.reduce((s, v) => s + v, 0);

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_IN_MO   = [31,28,31,30,31,30,31,31,30,31,30,31];
const IRR_FACTOR   = [0.88,0.93,1.04,1.07,1.00,0.84,0.80,0.83,0.86,0.92,0.88,0.86];
const RATE         = 5.66;
const COST_RATIO   = 0.29;

// ─── Main ─────────────────────────────────────────────────────────────────────
const Overview = ({
  theme, currentLang, weatherData,
  productionDataSets, productionPeriod, setProductionPeriod,
  demandDataSets,     demandPeriod,     setDemandPeriod,
  alerts, unreadCount, markAsRead, markAllAsRead, deleteAlert,
  showAllAlerts, setShowAllAlerts,
  alertSearch, setAlertSearch, alertFilter, setAlertFilter, filteredAlerts,
  fleetSummary = null,
  plantId = null,
  activePlantData = null,
  onBackToFleet = null,
  allPlantsData = [],
  onEnterDashboard = null,
}) => {
  const dk   = theme === 'dark';
  const [overviewModal, setOverviewModal] = useState(null);

  // ── SHARED PERIOD STATE — controls all charts ────────────────────────────
  const [sharedPeriod, setSharedPeriod] = useState('monthly');
  const periods = ['daily', 'weekly', 'monthly', 'yearly'];

  const card = `rounded-2xl shadow-sm ${dk ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`;
  const tx   = dk ? 'text-white'     : 'text-slate-800';
  const sub  = dk ? 'text-slate-400' : 'text-slate-500';
  const grid = dk ? '#334155'        : '#f1f5f9';

  // ─── Custom Tooltip ────────────────────────────────────────────────────────
  const ChartTip = ({ active, payload, label, fmt, colors = {} }) => {
    if (!active || !payload?.length) return null;
    const col  = dk ? '#f1f5f9' : '#1e293b';
    const bg   = dk ? '#1e293b' : '#fff';
    const bord = dk ? '#334155' : '#e2e8f0';
    return (
      <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 8, fontSize: 11, padding: '8px 12px', color: col }}>
        <p style={{ color: col, fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.filter(e => e.value != null).map((e, i) => {
          const [val, name] = fmt ? fmt(e.value, e.name) : [e.value, e.name];
          const itemColor = colors[e.name] ?? e.color ?? col;
          return <p key={i} style={{ color: itemColor, margin: '1px 0' }}>{name} : {val}</p>;
        })}
      </div>
    );
  };

  // ── Plant-aware capacity & PR ────────────────────────────────────────────
  const p = activePlantData;
  const totalCapacityKwp =
    fleetSummary?.totalCapacity ??
    allPlantsData.reduce((s, ap) => s + ap.capacity, 0) ?? 16470;
  const avgPR = (fleetSummary?.avgPR ?? 79) / 100;
  const cfCapacity = p ? p.capacity : totalCapacityKwp;
  const cfPR       = p ? (p.pr / 100) : avgPR;

  const currentMonthIdx = new Date().getMonth();
  const currentDay      = new Date().getDate();
  const currentHour     = new Date().getHours();

  // ── Base monthly yield ───────────────────────────────────────────────────
  const baseYieldByMonth = MONTHS_SHORT.map((_, i) => {
    const peakHours = 5 * IRR_FACTOR[i];
    return Math.round(cfCapacity * peakHours * DAYS_IN_MO[i] * cfPR);
  });

  const cfActualYtdKwh = p
    ? (p.monthly ?? []).reduce((s, v) => s + (v ?? 0), 0)
    : allPlantsData.reduce((tot, ap) => tot + (ap.monthly ?? []).reduce((s, v) => s + (v ?? 0), 0), 0);

  const cfRunRate = cfActualYtdKwh > 0 && currentDay > 0
    ? (cfActualYtdKwh / currentDay) * DAYS_IN_MO[currentMonthIdx]
    : baseYieldByMonth[currentMonthIdx];
  const rawRatio = baseYieldByMonth[currentMonthIdx] > 0
    ? cfRunRate / baseYieldByMonth[currentMonthIdx] : 1;
  const calibrationRatio = Math.max(0.85, Math.min(1.15, rawRatio));

  // ── Monthly cash flow (base) ─────────────────────────────────────────────
  const cashFlowMonthly = MONTHS_SHORT.map((month, i) => {
    const isFuture  = i > currentMonthIdx;
    const isCurrent = i === currentMonthIdx;
    let monthlyYieldKwh;
    if (isCurrent) {
      monthlyYieldKwh = Math.round(cfActualYtdKwh > 0
        ? (cfActualYtdKwh / Math.max(currentDay, 1)) * DAYS_IN_MO[i]
        : baseYieldByMonth[i]);
    } else if (isFuture) {
      monthlyYieldKwh = Math.round(baseYieldByMonth[i] * calibrationRatio);
    } else {
      monthlyYieldKwh = baseYieldByMonth[i];
    }
    const totalBaht = Math.round(monthlyYieldKwh * RATE / 1000);
    const cost      = Math.round(totalBaht * COST_RATIO);
    const net       = totalBaht - cost;
    return {
      month,
      revenue:         !isFuture ? totalBaht : null,
      cost:            !isFuture ? cost      : null,
      net:             !isFuture ? net       : null,
      forecastRevenue: isFuture  ? totalBaht : null,
      forecastCost:    isFuture  ? cost      : null,
      forecastNet:     isFuture  ? net       : null,
    };
  });

  // ── Daily cash flow (hourly today) ───────────────────────────────────────
  const monthRevToday = cashFlowMonthly[currentMonthIdx]?.revenue ?? cashFlowMonthly[currentMonthIdx]?.forecastRevenue ?? 0;
  const dayRevEst = monthRevToday / DAYS_IN_MO[currentMonthIdx];
  const cashFlowDaily = Array.from({ length: 24 }, (_, h) => {
    const sinV    = h >= 6 && h <= 18 ? SIN_HRS_CF[h - 6] / SIN_SUM_CF : 0;
    const rev     = Math.round(dayRevEst * sinV * 100) / 100;
    const cost    = Math.round(rev * COST_RATIO * 100) / 100;
    const net     = Math.round((rev - cost) * 100) / 100;
    const isFuture = h > currentHour;
    const isActive = h >= 6 && h <= 18;
    return {
      label: `${String(h).padStart(2, '0')}:00`,
      revenue:         !isFuture && isActive ? rev  : null,
      cost:            !isFuture && isActive ? cost : null,
      net:             !isFuture && isActive ? net  : null,
      forecastRevenue: isFuture  && isActive ? rev  : null,
      forecastCost:    isFuture  && isActive ? cost : null,
      forecastNet:     isFuture  && isActive ? net  : null,
    };
  });

  // ── Weekly cash flow (Mon–Sun) ───────────────────────────────────────────
  const todayDow = ((new Date().getDay() + 6) % 7); // Mon=0 … Sun=6
  const dayVariation = [0.95, 0.93, 1.02, 1.05, 1.0, 0.88, 0.82];
  const cashFlowWeekly = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label, i) => {
    const isFuture = i >= todayDow;
    const rev      = Math.round(dayRevEst * dayVariation[i] * 10) / 10;
    const cost     = Math.round(rev * COST_RATIO * 10) / 10;
    const net      = Math.round((rev - cost) * 10) / 10;
    return {
      label,
      revenue:         !isFuture ? rev  : null,
      cost:            !isFuture ? cost : null,
      net:             !isFuture ? net  : null,
      forecastRevenue: isFuture  ? rev  : null,
      forecastCost:    isFuture  ? cost : null,
      forecastNet:     isFuture  ? net  : null,
    };
  });

  // ── Yearly cash flow ─────────────────────────────────────────────────────
  const yearTotal = cashFlowMonthly.reduce((s, d) => s + (d.revenue ?? d.forecastRevenue ?? 0), 0);
  const growthFactors = [0.70, 0.83, 0.93, 1.0, 1.12];
  const cashFlowYearly = [2021, 2022, 2023, 2024, 2025].map((year, i) => {
    const curYear   = new Date().getFullYear();
    const isFuture  = year > curYear;
    const rev       = Math.round(yearTotal * 12 * growthFactors[i] / 10);
    const cost      = Math.round(rev * COST_RATIO);
    const net       = rev - cost;
    return {
      label: String(year),
      revenue:         !isFuture ? rev  : null,
      cost:            !isFuture ? cost : null,
      net:             !isFuture ? net  : null,
      forecastRevenue: isFuture  ? rev  : null,
      forecastCost:    isFuture  ? cost : null,
      forecastNet:     isFuture  ? net  : null,
    };
  });

  const cashFlowDataSets = {
    daily:   cashFlowDaily,
    weekly:  cashFlowWeekly,
    monthly: cashFlowMonthly,
    yearly:  cashFlowYearly,
  };

  // ── Cash flow tooltip formatter ──────────────────────────────────────────
  const cfFmt = (v, n) => {
    if (v == null) return ['-', n];
    return [`฿${(v * 1000).toLocaleString()}`, n];
  };

  // ── RA irradiation data sets ─────────────────────────────────────────────
  const baseIrr = p
    ? (p.irradiation ?? 5.4)
    : allPlantsData.length > 0
      ? allPlantsData.reduce((s, x) => s + (x.irradiation ?? 5.4), 0) / allPlantsData.length
      : 5.4;

  const raDataSets = {
    daily: Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, '0')}:00`,
      ra: h >= 6 && h <= 18 ? +(baseIrr * SIN_HRS_CF[h - 6] / Math.max(...SIN_HRS_CF) * 1.05).toFixed(2) : 0,
    })),
    weekly: [
      { label: 'Mon', ra: +(baseIrr * 0.95).toFixed(2) },
      { label: 'Tue', ra: +(baseIrr * 0.92).toFixed(2) },
      { label: 'Wed', ra: +(baseIrr * 1.02).toFixed(2) },
      { label: 'Thu', ra: +(baseIrr * 1.05).toFixed(2) },
      { label: 'Fri', ra: +(baseIrr * 1.00).toFixed(2) },
      { label: 'Sat', ra: +(baseIrr * 0.88).toFixed(2) },
      { label: 'Sun', ra: +(baseIrr * 0.82).toFixed(2) },
    ],
    monthly: MONTHS_SHORT.map((label, i) => ({
      label,
      ra: +(baseIrr * IRR_FACTOR[i]).toFixed(2),
    })),
    yearly: [2021, 2022, 2023, 2024, 2025].map((y, i) => ({
      label: String(y),
      ra: +(baseIrr * [0.91, 0.93, 0.97, 1.0, 1.02][i]).toFixed(2),
    })),
  };

  // ── KPI values ───────────────────────────────────────────────────────────
  const f = fleetSummary;
  const yieldVal  = p ? p.toNow    : (f?.totalYield   ?? 0);
  const yieldMax2 = p ? p.capacity * 8 : ((f?.totalCapacity ?? 0) * 8);
  const revVal    = p ? p.revenue  : (f?.totalRevenue ?? 0);
  const prVal     = p ? p.pr       : (f?.avgPR        ?? 0);

  // ── Weekly yield from real data ──────────────────────────────────────────
  const today      = new Date();
  const dayOfMonth = today.getDate();
  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const realYieldData = Array.from({ length: 7 }, (_, i) => {
    const dayIdx  = dayOfMonth - 7 + i;
    const dayDate = new Date(today.getFullYear(), today.getMonth(), dayIdx + 1);
    const label   = dayNames[dayDate.getDay()];
    const yVal    = dayIdx >= 0
      ? (p
          ? (p.monthly[dayIdx] ?? 0)
          : (allPlantsData ?? []).reduce((s, pd) => s + (pd.monthly?.[dayIdx] ?? 0), 0))
      : 0;
    return { label, yield: yVal };
  });

  // ── Energy yield data sets (actual vs forecast) ──────────────────────────
  const yieldDataSets = {
    daily: Array.from({ length: 24 }, (_, h) => {
      const sinV    = h >= 6 && h <= 18 ? SIN_HRS_CF[h - 6] / SIN_SUM_CF : 0;
      const val     = Math.round(yieldVal * sinV);
      const isPast  = h <= currentHour && h >= 6 && h <= 18;
      const isFcast = h >  currentHour && h >= 6 && h <= 18;
      return {
        label: `${String(h).padStart(2, '0')}:00`,
        yield:         isPast  ? val : null,
        forecastYield: isFcast ? val : null,
      };
    }),
    weekly: realYieldData.map((d, i) => {
      const isFcast = i > todayDow;
      return {
        ...d,
        forecastYield: isFcast ? d.yield : null,
        yield:         isFcast ? null    : d.yield,
      };
    }),
    monthly: MONTHS_SHORT.map((label, i) => {
      const val      = Math.round(cfCapacity * 5 * IRR_FACTOR[i] * DAYS_IN_MO[i] * cfPR);
      const isFuture = i > currentMonthIdx;
      return {
        label,
        yield:         !isFuture ? val : null,
        forecastYield: isFuture  ? val : null,
      };
    }),
    yearly: [2021, 2022, 2023, 2024, 2025].map((y, i) => {
      const curYear  = new Date().getFullYear();
      const isFuture = y > curYear;
      const val      = Math.round(cfCapacity * 5 * 365 * cfPR * [0.88, 0.91, 0.95, 1.0, 1.03][i]);
      return {
        label: String(y),
        yield:         !isFuture ? val : null,
        forecastYield: isFuture  ? val : null,
      };
    }),
  };

  const periodYieldData  = yieldDataSets[sharedPeriod];
  const periodRaData     = raDataSets[sharedPeriod];
  const maxYieldInPeriod = Math.max(...periodYieldData.map(d => d.yield ?? d.forecastYield ?? 0));
  const periodTarget     = Math.round(maxYieldInPeriod * 0.8);
  const periodYieldMax   = Math.max(maxYieldInPeriod, periodTarget);

  const plantsToCheck  = plantId ? allPlantsData.filter(p => p.id === plantId) : allPlantsData;
  const criticalCount  = plantsToCheck.filter(p => p.status === 'offline').length;
  const warningCount   = plantsToCheck.filter(p => p.status === 'warning').length;
  const totalAlarms    = criticalCount + warningCount;

  const kpis = [
    {
      title: 'Yield (Today)',
      value: `${yieldVal.toLocaleString()} kWh`,
      badge: p ? p.name : `${(f?.totalCapacity ?? 0) * 8} kWh`,
      up: true,
      icon: Zap, col: 'text-yellow-500',
      bg:  dk ? 'bg-yellow-900/30' : 'bg-yellow-50',
      bdr: dk ? 'border-yellow-700/30' : 'border-yellow-200',
      gv: yieldVal, gmin: 0, gmax: yieldMax2,
    },
    {
      title: 'Revenue (Today)',
      value: `฿${revVal.toLocaleString()}`,
      target: `฿${(93220.2).toLocaleString()}`,
      badge: `฿${RATE}/kWh`,
      up: true,
      icon: Banknote, col: 'text-green-500',
      bg:  dk ? 'bg-green-900/30' : 'bg-green-50',
      bdr: dk ? 'border-green-700/30' : 'border-green-200',
      gv: revVal, gmin: 0, gmax: 93220.2,
    },
    {
      title: 'Performance Ratio',
      value: `${prVal.toFixed(1)}%`,
      target: '100%',
      badge: p ? p.name : 'Fleet avg',
      up: true,
      icon: TrendingUp, col: 'text-blue-500',
      bg:  dk ? 'bg-blue-900/30' : 'bg-blue-50',
      bdr: dk ? 'border-blue-700/30' : 'border-blue-200',
      gv: prVal, gmin: 0, gmax: 100,
    },
    {
      title: 'Active Alarms',
      value: String(totalAlarms),
      target: null,
      badge: criticalCount > 0
        ? `${criticalCount} critical`
        : warningCount > 0
          ? `${warningCount} warning${warningCount > 1 ? 's' : ''}`
          : 'All clear',
      up: totalAlarms === 0,
      icon: AlertTriangle,
      col:  totalAlarms === 0 ? 'text-green-500' : criticalCount > 0 ? 'text-red-500' : 'text-yellow-500',
      bg:   totalAlarms === 0 ? (dk ? 'bg-green-900/30' : 'bg-green-50')
          : criticalCount > 0 ? (dk ? 'bg-red-900/30'   : 'bg-red-50')
          :                     (dk ? 'bg-yellow-900/30' : 'bg-yellow-50'),
      bdr:  totalAlarms === 0 ? (dk ? 'border-green-700/30' : 'border-green-200')
          : criticalCount > 0 ? (dk ? 'border-red-700/30'   : 'border-red-200')
          :                     (dk ? 'border-yellow-700/30' : 'border-yellow-200'),
      gv: null, gmin: 0, gmax: 100,
    },
  ];

  // ── Period-aware labels ───────────────────────────────────────────────────
  const periodLabel = {
    daily:   { ra: 'RA – Daily Irradiance', raSub: 'kWh/m² per hour', yield: 'Daily Energy Yield', yieldSub: 'kWh produced per hour' },
    weekly:  { ra: 'RA – Weekly Irradiation', raSub: 'kWh/m² per day', yield: 'Weekly Energy Yield', yieldSub: 'kWh produced per day vs. target' },
    monthly: { ra: 'RA – Monthly Irradiation', raSub: 'kWh/m² avg per month', yield: 'Monthly Energy Yield', yieldSub: 'kWh produced per month vs. target' },
    yearly:  { ra: 'RA – Yearly Irradiation', raSub: 'kWh/m² yearly avg', yield: 'Yearly Energy Yield', yieldSub: 'kWh produced per year vs. target' },
  };

  return (
    <div className="w-full space-y-2">

      {/* ── Plant selector ── */}
      {allPlantsData.length > 0 && (
        <div className={`flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl border ${
          dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-xs font-semibold mr-1 ${sub}`}>{currentLang.selectPlant ?? 'Select Plant'}:</span>
          {[{ id: null, name: currentLang.allPlants ?? 'All Plants' }, ...allPlantsData].map((pl) => {
            const active = (plantId ?? null) === pl.id;
            const dot = pl.status === 'warning' ? '#f59e0b' : pl.status === 'offline' ? '#ef4444' : '#22c55e';
            return (
              <button
                key={pl.id ?? 'all'}
                onClick={() => {
                  if (pl.id === null) { onBackToFleet && onBackToFleet(); }
                  else { onEnterDashboard && onEnterDashboard(pl.id, pl); }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : (dk ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')
                }`}
              >
                {pl.id !== null && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
                {pl.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Plant header bar ── */}
      {p && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
          dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            {onBackToFleet && (
              <button onClick={onBackToFleet}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition
                  ${dk ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Overview
              </button>
            )}
            <div className={`w-px h-5 ${dk ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div>
              <p className={`text-sm font-bold ${tx}`}>{p.name}</p>
              <p className={`text-[10px] ${sub}`}>{p.type} · {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 1: KPI Cards ── */}
      <div className={`grid grid-cols-1 gap-2 ${p ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {kpis.map((k, i) => (
          <div key={i}
            onClick={!p ? () => setOverviewModal(i === 0 ? 'yield' : i === 1 ? 'revenue' : i === 2 ? 'pr' : 'alarms') : undefined}
            className={`${card} p-4 border ${k.bdr} overflow-hidden ${!p ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-xl ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.col}`} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full leading-none
                ${k.up
                  ? (dk ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700')
                  : (dk ? 'bg-red-900/40   text-red-400'   : 'bg-red-100   text-red-700')}`}>
                {k.badge}
              </span>
            </div>
            <div className="flex items-end justify-between gap-1">
              <div className="min-w-0">
                <p className={`text-2xl font-bold ${tx} leading-none`}>{k.value}</p>
                {k.target && <p className={`text-[11px] font-semibold mt-0.5 ${k.col}`}>/ {k.target}</p>}
                <p className={`text-xs font-medium mt-1 ${sub}`}>{k.title}</p>
                {i === 0 && p && (
                  <p className={`text-[9px] mt-0.5 ${sub} opacity-60`}>
                    {p.type} · {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                  </p>
                )}
              </div>
              {k.gv != null && (
                <div className="flex-shrink-0 -mb-1">
                  <SemiGauge value={k.gv} min={k.gmin} max={k.gmax} theme={theme} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Weather + Status card */}
        {p && (
          <div className={`${card} p-4 border ${dk ? 'border-slate-700' : 'border-slate-200'} overflow-hidden`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-xl ${dk ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                <span className="text-xl leading-none">
                  {(() => {
                    const iconMap = {
                      'Clear': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️',
                      'Overcast': '☁️', 'Light Rain': '🌦️', 'Moderate Rain': '🌧️',
                      'Heavy Rain': '🌧️', 'Thunderstorm': '⛈️',
                    };
                    return iconMap[weatherData?.condition] ?? '🌤️';
                  })()}
                </span>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="min-w-0 mt-1">
              <p className={`text-2xl font-bold ${tx} leading-none`}>{weatherData?.temp ?? '--'}°C</p>
              <p className="text-[11px] font-semibold mt-0.5 text-sky-400">{weatherData?.condition ?? '—'}</p>
              <div className={`flex items-center justify-between mt-3 pt-2 border-t ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                <p className={`text-xs font-medium ${sub}`}>Weather</p>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-blue-400">
                    <Droplets className="w-3 h-3" />{weatherData?.humidity ?? '--'}%
                  </span>
                  <span className={dk ? 'text-slate-600' : 'text-slate-300'}>│</span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Wind className="w-3 h-3" />{weatherData?.windSpeed ?? '--'} km/h
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SHARED PERIOD SELECTOR ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
        dk ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>View Period</span>
          <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
            applies to all charts
          </span>
        </div>
        <PeriodToggle
          value={sharedPeriod}
          onChange={(p) => {
            setSharedPeriod(p);
            if (setProductionPeriod) setProductionPeriod(p);
            if (setDemandPeriod) setDemandPeriod(p);
          }}
          options={periods}
          active="bg-indigo-600"
          isDark={dk}
        />
      </div>

      {/* ── ROW 2: Cash Flow + RA / Yield ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className={`${card} p-4 lg:col-span-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className={`text-sm font-bold ${tx}`}>
                {p ? `${p.name} — Cash Flow` : 'Project Cash Flow'}
              </h3>
              <p className={`text-xs ${sub}`}>
                {p
                  ? `${p.name} · ${p.capacity} kWp · PR ${p.pr.toFixed(1)}% — ${sharedPeriod} revenue, cost & net (฿ thousands)`
                  : `Fleet total — ${sharedPeriod} revenue, cost & net profit (฿ thousands)`}
              </p>
            </div>
            <div className={`flex flex-wrap items-center gap-3 text-xs ${sub}`}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400  inline-block" />Cost</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-green-400 inline-block" />Net</span>
              <span className={`flex items-center gap-1.5 pl-2 border-l ${dk ? 'border-slate-600' : 'border-slate-200'}`}>
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400/40 border border-blue-400 border-dashed inline-block" />Forecast Rev.
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400/30 border border-red-400 border-dashed inline-block" />Forecast Cost
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={323}>
            <ComposedChart data={cashFlowDataSets[sharedPeriod]} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey={sharedPeriod === 'monthly' ? 'month' : 'label'} tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} />
              <Tooltip
                content={(props) => (
                  <ChartTip
                    {...props}
                    fmt={cfFmt}
                    colors={{
                      Revenue: '#3b82f6', Cost: '#f87171', Net: '#4ade80',
                      'Forecast Rev.': '#93c5fd', 'Forecast Cost': '#fca5a5', 'Forecast Net': '#4ade80',
                    }}
                  />
                )}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.9} />
              <Bar dataKey="cost"    name="Cost"    fill="#f87171" radius={[4,4,0,0]} opacity={0.9} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#4ade80" strokeWidth={2.5} dot={false} connectNulls={false} />
              <Bar dataKey="forecastRevenue" name="Forecast Rev." fill="#93c5fd" radius={[4,4,0,0]} opacity={0.55}
                shape={(props) => {
                  const { x, y, width, height } = props;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} rx={4} ry={4}
                        fill="#93c5fd" fillOpacity={0.45}
                        stroke="#3b82f6" strokeWidth={1.2} strokeDasharray="4 2" />
                    </g>
                  );
                }}
              />
              <Bar dataKey="forecastCost" name="Forecast Cost" fill="#fca5a5" radius={[4,4,0,0]} opacity={0.55}
                shape={(props) => {
                  const { x, y, width, height } = props;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} rx={4} ry={4}
                        fill="#fca5a5" fillOpacity={0.45}
                        stroke="#f87171" strokeWidth={1.2} strokeDasharray="4 2" />
                    </g>
                  );
                }}
              />
              <Line type="monotone" dataKey="forecastNet" name="Forecast Net"
                stroke="#4ade80" strokeWidth={1.8} strokeDasharray="5 3" dot={false} connectNulls={false} opacity={0.6} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-2">
          <div className={`${card} p-4 flex-1`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`text-sm font-bold ${tx}`}>{periodLabel[sharedPeriod].ra}</h3>
                <p className={`text-[10px] ${sub}`}>{periodLabel[sharedPeriod].raSub}</p>
              </div>
              <span className="text-xl font-bold text-yellow-500">{baseIrr.toFixed(1)}</span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={periodRaData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={grid} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: dk ? '#94a3b8' : '#64748b' }}
                  interval={sharedPeriod === 'daily' ? 5 : 'preserveStartEnd'} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 8]} />
                <Tooltip
                  content={(props) => (
                    <ChartTip {...props} colors={{ Radiation: '#facc15' }} />
                  )}
                />
                <Area type="monotone" dataKey="ra" name="Radiation" stroke="#facc15" fill="#facc1525" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={`${card} p-4 flex-1`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`text-sm font-bold ${tx}`}>{periodLabel[sharedPeriod].yield}</h3>
                <p className={`text-[10px] ${sub}`}>{periodLabel[sharedPeriod].yieldSub}</p>
              </div>
              <span className="text-xl font-bold text-emerald-400">{yieldVal.toLocaleString()} kWh</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <ComposedChart
                data={periodYieldData.map(d => ({ ...d, target: periodTarget }))}
                margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={grid} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: dk ? '#94a3b8' : '#64748b' }}
                  interval={sharedPeriod === 'daily' ? 5 : 'preserveStartEnd'} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, Math.ceil(periodYieldMax * 1.15)]} />
                <Tooltip
                  content={(props) => (
                    <ChartTip
                      {...props}
                      fmt={(v, n) => v != null ? [`${v.toLocaleString()} kWh`, n] : ['-', n]}
                      colors={{ Yield: '#22c55e', Forecast: '#60a5fa', Target: '#f59e0b' }}
                    />
                  )}
                />
                <Bar dataKey="yield" name="Yield" radius={[4,4,0,0]}
                  shape={(props) => {
                    const { x, y, width, height, value } = props;
                    if (!value && value !== 0) return null;
                    return <rect x={x} y={y} width={width} height={height} rx={4} ry={4}
                      fill={value >= periodTarget ? '#22c55e' : '#60a5fa'} />;
                  }}
                />
                <Bar dataKey="forecastYield" name="Forecast" radius={[4,4,0,0]}
                  shape={(props) => {
                    const { x, y, width, height, value } = props;
                    if (!value && value !== 0) return null;
                    const solidFill = value >= periodTarget ? '#22c55e' : '#60a5fa';
                    const borderCol = value >= periodTarget ? '#22c55e' : '#3b82f6';
                    return (
                      <g>
                        <rect x={x} y={y} width={width} height={height} rx={4} ry={4}
                          fill={solidFill} fillOpacity={0.35}
                          stroke={borderCol} strokeWidth={1.2} strokeDasharray="4 2" />
                      </g>
                    );
                  }}
                />
                <Line type="monotone" dataKey="target" name="Target" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className={`flex items-center gap-3 mt-1.5 text-[9px] ${sub}`}>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Hit target</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-400 inline-block" />Target</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />Below target</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/40 border border-emerald-400 border-dashed inline-block" />Forecast</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Production Efficiency + Revenue Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className={`${card} p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className={`text-sm font-bold ${tx}`}>{currentLang?.weeklyProduction || 'Production Efficiency'}</h3>
              <p className={`text-xs ${sub}`}>OEE over time</p>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold capitalize ${dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {sharedPeriod}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={productionDataSets[sharedPeriod]} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="oeeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} domain={[0, 100]} unit="%" />
              <Tooltip
                content={(props) => (
                  <ChartTip
                    {...props}
                    fmt={(v) => [`${v}%`, 'OEE']}
                    colors={{ OEE: '#3b82f6' }}
                  />
                )}
              />
              <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
                label={{ value: 'Target 80%', fontSize: 9, fill: '#f59e0b', position: 'insideTopRight' }} />
              <Area type="monotone" dataKey="oee" name="OEE" stroke="#3b82f6" fill="url(#oeeGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`${card} p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className={`text-sm font-bold ${tx}`}>Revenue Forecast</h3>
              <p className={`text-xs ${sub}`}>Actual vs. predicted revenue with confidence band</p>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold capitalize ${dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {sharedPeriod}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Actual (YTD)',         value: fmtRevenue(revenueForcastDataSets.monthly.filter(d => d.actual > 0).reduce((s, d) => s + d.actual, 0)), color: 'text-cyan-400' },
              { label: 'Forecast (Full Year)',  value: fmtRevenue(revenueForcastDataSets.monthly.reduce((s, d) => s + d.forecast, 0)),                          color: 'text-violet-400' },
              { label: 'Accuracy',              value: '94.2%',                                                                                                   color: 'text-green-400' },
            ].map((s) => (
              <div key={s.label} className={`p-3 rounded-xl ${dk ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-[10px] font-medium ${sub} mb-0.5`}>{s.label}</p>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={revenueForcastDataSets[sharedPeriod]} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b' }} tickFormatter={fmtRevenue} width={52} />
              <Tooltip
                content={(props) => (
                  <ChartTip
                    {...props}
                    fmt={(v, n) => [fmtRevenue(v), n]}
                    colors={{ Actual: '#22d3ee', Forecast: '#a78bfa', 'Upper bound': '#a78bfa', 'Lower bound': '#a78bfa' }}
                  />
                )}
              />
              <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#confGrad)" name="Upper bound" />
              <Area type="monotone" dataKey="lower" stroke="transparent" fill={dk ? '#0f172a' : '#ffffff'} name="Lower bound" />
              <Line type="monotone" dataKey="forecast" stroke="#a78bfa" strokeWidth={2}   dot={false} strokeDasharray="5 3" name="Forecast" />
              <Line type="monotone" dataKey="actual"   stroke="#22d3ee" strokeWidth={2.5} dot={false} name="Actual" connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className={`flex items-center gap-4 mt-2 text-xs ${sub}`}>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-cyan-400   rounded inline-block" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-violet-400 rounded inline-block" />Forecast</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 bg-violet-400/20 rounded inline-block" />Confidence band</span>
          </div>
        </div>
      </div>

      {/* ── All Alerts Modal ── */}
      {showAllAlerts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ${dk ? 'bg-slate-800' : 'bg-white'}`} style={{ maxHeight: '85vh' }}>
            <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-base ${tx}`}>{currentLang?.allAlerts || 'All Alerts'}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{alerts.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={markAllAsRead} className="text-xs text-blue-500 hover:text-blue-600 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 transition">
                  {currentLang?.markAllRead || 'Mark all read'}
                </button>
                <button onClick={() => setShowAllAlerts(false)} className={`p-1.5 rounded-full transition ${dk ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className={`px-4 py-3 flex flex-wrap gap-2 border-b flex-shrink-0 ${dk ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`flex items-center gap-2 flex-1 min-w-[180px] px-3 py-2 rounded-lg border ${dk ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                <svg className={`w-3.5 h-3.5 ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={alertSearch} onChange={(e) => setAlertSearch(e.target.value)}
                  placeholder={currentLang?.searchAlerts || 'Search alerts...'}
                  className={`flex-1 text-xs bg-transparent outline-none ${tx}`} />
              </div>
              {['all', 'unread', 'critical', 'high', 'medium'].map((f) => (
                <button key={f} onClick={() => setAlertFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-semibold capitalize transition ${alertFilter === f ? 'bg-blue-600 text-white shadow-sm' : dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bell className={`w-10 h-10 ${sub} opacity-30 mb-3`} />
                  <p className={`text-sm ${sub}`}>{currentLang?.noAlertsFound || 'No alerts found'}</p>
                </div>
              ) : filteredAlerts.map((a) => (
                <div key={a.id} onClick={() => markAsRead(a.id)}
                  className={`flex items-start gap-4 px-6 py-4 border-b last:border-0 cursor-pointer transition
                    ${!a.read ? (dk ? 'bg-blue-900/10' : 'bg-blue-50/60') : (dk ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50')}
                    ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div className="mt-0.5 flex-shrink-0"><SevIcon s={a.severity} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-bold ${tx}`}>{a.machine}</p>
                      <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${
                        a.severity === 'critical' ? 'bg-red-100 text-red-700'
                        : a.severity === 'high'   ? 'bg-orange-100 text-orange-700'
                        : a.severity === 'medium' ? 'bg-yellow-100 text-yellow-700'
                        :                           'bg-blue-100 text-blue-700'}`}>{a.severity}</span>
                      {!a.read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </div>
                    <p className={`text-xs ${sub}`}>{a.message}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{a.time}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteAlert(a.id); }}
                      className={`p-1.5 rounded-lg opacity-50 hover:opacity-100 transition ${dk ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Overview Breakdown Modal ── */}
      {overviewModal && !p && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setOverviewModal(null)}>
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-base font-bold ${tx}`}>
                  {overviewModal === 'yield'   ? '⚡ Yield Breakdown'
                 : overviewModal === 'revenue' ? '💰 Revenue Breakdown'
                 : overviewModal === 'pr'      ? '📊 Performance Ratio'
                 :                              '🚨 Active Alarms'}
                </h3>
                <p className={`text-xs mt-0.5 ${sub}`}>
                  {overviewModal === 'yield'   ? 'Energy produced today — by plant'
                 : overviewModal === 'revenue' ? 'Revenue earned today — by plant'
                 : overviewModal === 'pr'      ? 'PR per plant'
                 :                              'Plants with active alarms'}
                </p>
              </div>
              <button onClick={() => setOverviewModal(null)}
                className={`p-1.5 rounded-lg transition ${dk ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {(() => {
                const sorted = [...allPlantsData].sort((a, b) => {
                  if (overviewModal === 'yield')   return b.toNow   - a.toNow;
                  if (overviewModal === 'revenue') return b.revenue - a.revenue;
                  if (overviewModal === 'pr')      return b.pr      - a.pr;
                  const order = { warning: 0, offline: 1, online: 2 };
                  return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                });
                const total =
                  overviewModal === 'yield'   ? allPlantsData.reduce((s, x) => s + x.toNow,   0) :
                  overviewModal === 'revenue' ? allPlantsData.reduce((s, x) => s + x.revenue, 0) :
                  overviewModal === 'pr'      ? 100 : null;

                return sorted.map((pd, i) => {
                  const val =
                    overviewModal === 'yield'   ? pd.toNow   :
                    overviewModal === 'revenue' ? pd.revenue :
                    overviewModal === 'pr'      ? pd.pr      : null;
                  const pct    = total > 0 && val != null ? (val / total) * 100 : 0;
                  const sCol   = pd.status === 'online' ? '#22c55e' : pd.status === 'warning' ? '#f59e0b' : '#ef4444';
                  const barCol = overviewModal === 'pr'
                    ? (pd.pr >= 80 ? '#22c55e' : pd.pr >= 70 ? '#f59e0b' : '#ef4444')
                    : i === 0 ? '#22c55e' : '#3b82f6';

                  if (overviewModal === 'alarms') {
                    return (
                      <div key={pd.id}
                        onClick={() => { if (onEnterDashboard) { setOverviewModal(null); onEnterDashboard(pd.id, pd); } }}
                        className={`rounded-xl p-3.5 border flex items-center justify-between transition-all
                          ${onEnterDashboard ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/40' : ''}
                          ${dk ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: sCol }} />
                          <div>
                            <p className={`text-sm font-bold ${tx}`}>{pd.name}</p>
                            <p className={`text-[10px] ${sub}`}>{pd.capacity} kWp</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            pd.status === 'online'  ? (dk ? 'bg-green-900/30 text-green-400'   : 'bg-green-100 text-green-700')
                          : pd.status === 'warning' ? (dk ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                          :                           (dk ? 'bg-red-900/30 text-red-400'       : 'bg-red-100 text-red-700')
                          }`}>{pd.status.toUpperCase()}</span>
                          {onEnterDashboard && (
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={sub}>
                              <path d="M9 18l6-6-6-6"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={pd.id}
                      onClick={() => { if (onEnterDashboard) { setOverviewModal(null); onEnterDashboard(pd.id, pd); } }}
                      className={`rounded-xl p-3.5 border transition-all
                        ${onEnterDashboard ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/40' : ''}
                        ${dk ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sCol }} />
                          <span className={`text-sm font-bold ${tx}`}>{pd.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${dk ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{pd.capacity} kWp</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            overviewModal === 'pr'
                              ? (pd.pr >= 80 ? 'text-green-400' : pd.pr >= 70 ? 'text-yellow-400' : 'text-red-400')
                              : i === 0 ? 'text-green-400' : 'text-blue-400'
                          }`}>
                            {overviewModal === 'yield'   ? `${val.toLocaleString()} kWh`
                           : overviewModal === 'revenue' ? `฿${val.toLocaleString()}`
                           :                              `${val.toFixed(1)}%`}
                          </span>
                          {onEnterDashboard && (
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={sub}>
                              <path d="M9 18l6-6-6-6"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-600' : 'bg-slate-200'}`}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${overviewModal === 'pr' ? val : pct}%`, background: barCol }} />
                      </div>
                      {overviewModal !== 'pr' && (
                        <p className={`text-right text-[9px] mt-1 font-semibold ${sub}`}>{pct.toFixed(1)}% of total</p>
                      )}
                    </div>
                  );
                });
              })()}

              {overviewModal !== 'alarms' && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${dk ? 'bg-blue-900/20 border-blue-800/40' : 'bg-blue-50 border-blue-100'}`}>
                  <span className={`text-xs font-bold ${dk ? 'text-blue-300' : 'text-blue-700'}`}>Fleet Total</span>
                  <span className="text-base font-bold text-blue-400">
                    {overviewModal === 'yield'
                      ? `${allPlantsData.reduce((s, x) => s + x.toNow, 0).toLocaleString()} kWh`
                     : overviewModal === 'revenue'
                      ? `฿${allPlantsData.reduce((s, x) => s + x.revenue, 0).toLocaleString()}`
                     : `${(allPlantsData.reduce((s, x) => s + x.pr, 0) / (allPlantsData.length || 1)).toFixed(1)}% avg`}
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => setOverviewModal(null)}
              className="mt-4 w-full py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;