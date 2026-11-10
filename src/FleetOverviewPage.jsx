// FleetOverviewPage.jsx — Enhanced with:
// [1] PR Silent Loss Alert + ฿ Loss Calculator
// [2] Loss Breakdown Analysis Modal (Dust / Fault / Shading / Temperature / Mismatch)
// [3] Energy Balance Dual-Axis Chart (Actual kW + Theoretical kW + Irradiance W/m²)
// [4] String-Level Precision Monitoring Modal (Inverter → String heatmap)

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Thermometer, Wind, Droplets, AlertTriangle, Cpu } from 'lucide-react';
import { Area, BarChart, Bar, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { fetchWeatherDataByLocation } from './weatherService';

// ── Semi-circular Gauge ──────────────────────────────────────────────────────
const SemiGauge = ({ value = 50, min = 0, max = 100, theme }) => {
  const dk = theme === 'dark';
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const W = 90, H = 52;
  const cx = W / 2, cy = H - 8, r = 36;
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
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <path d={arcPath(0, 1)} fill="none" stroke={dk ? '#1e293b' : '#e2e8f0'} strokeWidth="9" strokeLinecap="butt" />
      {[
        { p0: 0, p1: 0.333, color: '#ef4444' },
        { p0: 0.333, p1: 0.666, color: '#f59e0b' },
        { p0: 0.666, p1: 1, color: '#22c55e' },
      ].map(z => (
        <path key={z.color} d={arcPath(z.p0, z.p1)} fill="none" stroke={z.color} strokeWidth="9" strokeLinecap="butt" opacity="0.9" />
      ))}
      <line x1={cx} y1={cy} x2={(nx + 0.8).toFixed(1)} y2={(ny + 0.8).toFixed(1)} stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke={dk ? '#f1f5f9' : '#1e293b'} strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4.5" fill={dk ? '#334155' : '#94a3b8'} />
      <circle cx={cx} cy={cy} r="2.5" fill={dk ? '#f1f5f9' : '#ffffff'} />
      <text x="3" y={H - 1} fontSize="5" fill="#ef4444" fontWeight="700" fontFamily="sans-serif">LOW</text>
      <text x={cx - 6} y="8" fontSize="5" fill="#f59e0b" fontWeight="700" fontFamily="sans-serif">MED</text>
      <text x={W - 19} y={H - 1} fontSize="5" fill="#22c55e" fontWeight="700" fontFamily="sans-serif">HIGH</text>
    </svg>
  );
};

// ── [NEW] PR Threshold & Loss Constants ─────────────────────────────────────
const PR_THRESHOLD = 80;             // % — industry standard for Thailand
const LOSS_PER_PCT_PER_MW = 50000;  // ฿/year per 1% loss per 1 MW of capacity

// [NEW] Simulated loss profiles per plant (% of theoretical energy lost per category)
const LOSS_PROFILES = {
  PV1: { dust: 2.0, fault: 3.2, shading: 0.6, temperature: 1.5, mismatch: 0.7 },
  PV2: { dust: 1.5, fault: 0.8, shading: 0.4, temperature: 1.2, mismatch: 0.4 },
  PV3: { dust: 3.8, fault: 4.2, shading: 1.1, temperature: 2.0, mismatch: 0.8 }, // worst — status: warning
  PV4: { dust: 1.2, fault: 0.5, shading: 0.3, temperature: 1.0, mismatch: 0.3 },
};

const LOSS_META = [
  { key: 'dust',        label: 'ฝุ่นสะสม (Soiling)',       color: '#f59e0b' },
  { key: 'fault',       label: 'อุปกรณ์ชำรุด (System Fault)', color: '#ef4444' },
  { key: 'shading',     label: 'เงาบัง (Shading)',           color: '#8b5cf6' },
  { key: 'temperature', label: 'ความร้อน (Temperature)',     color: '#f97316' },
  { key: 'mismatch',    label: 'ค่าไม่ตรงกัน (Mismatch)',   color: '#6366f1' },
];

// [NEW] Inverter / String configuration
const INVERTER_COUNT   = { PV1: 5, PV2: 5, PV3: 2, PV4: 5 };
const STRINGS_PER_INV  = 10;

// [NEW] Seeded random for deterministic string health simulation
const seededRandStr = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

// [NEW] Generate string health data
const getStringHealth = (plantId, invIdx, strIdx) => {
  const seed = plantId.charCodeAt(0) * 1000 + invIdx * 100 + strIdx;
  const r  = seededRandStr(seed);
  const r2 = seededRandStr(seed + 500);
  const isBad       = plantId === 'PV3';
  const faultProb   = isBad ? 0.12 : 0.03;
  const warnProb    = isBad ? 0.22 : 0.08;
  if (r < faultProb)              return { status: 'fault', currentA: +(3.0 + r2 * 4.0).toFixed(1), expectedA: 9.5 };
  if (r < faultProb + warnProb)   return { status: 'warn',  currentA: +(6.0 + r2 * 2.5).toFixed(1), expectedA: 9.5 };
  return                                  { status: 'ok',    currentA: +(8.8 + r2 * 0.9).toFixed(1), expectedA: 9.5 };
};

// ── Original constants & helpers ─────────────────────────────────────────────
const RATE_PER_KWH = 5.66;

const seededRand = (seed) => {
  let x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
};

const DAILY_MAX = { PV1: 5000, PV2: 5000, PV3: 1470, PV4: 5000 };

const SIN_HOURS = Array.from({ length: 13 }, (_, i) =>
  Math.sin((i / 12) * Math.PI)
);
const SIN_SUM = SIN_HOURS.reduce((s, v) => s + v, 0);

const getDailyYield = (plantId, date) => {
  const seed =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate() +
    plantId.charCodeAt(0) * 999;
  const rand = seededRand(seed);
  const pct = 0.84 + rand * 0.16;
  return Math.round(DAILY_MAX[plantId] * pct);
};

const getHourlyKwh = (dailyYield, h) => {
  if (h < 6 || h > 18) return 0;
  return Math.round(dailyYield * (SIN_HOURS[h - 6] / SIN_SUM));
};

const getYieldToNow = (dailyYield, curFrac) => {
  let acc = 0;
  for (let h = 6; h < 19; h++) {
    if (h > curFrac) break;
    const frac = Math.min(1, curFrac - h);
    acc += Math.round(dailyYield * (SIN_HOURS[h - 6] / SIN_SUM) * frac);
  }
  return acc;
};

const PLANTS = [
  { id: 'PV1', name: 'ETEM-PV1', lat: 12.312631, lng: 102.598152, capacity: 5000, power: 97.51, pr: 78.4, irradiation: 5.8, status: 'online',  type: 'solar' },
  { id: 'PV2', name: 'ETE-PV2',  lat: 13.821041, lng: 102.298019, capacity: 5000, power: 45.20, pr: 81.2, irradiation: 5.6, status: 'online',  type: 'solar', iconOffsetY: -10 },
  { id: 'PV3', name: 'ETE-PV3',  lat: 13.648165, lng: 102.461136, capacity: 1470, power: 62.80, pr: 72.1, irradiation: 5.4, status: 'warning', type: 'solar', iconOffsetY: 10  },
  { id: 'PV4', name: 'ETE-PV4',  lat: 11.090021, lng:  99.442207, capacity: 5000, power: 28.40, pr: 82.8, irradiation: 6.1, status: 'online',  type: 'solar' },
];

const fmt         = (v, d = 1) => Number(v).toFixed(d);
const statusColor = (s) =>
  s === 'online' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#ef4444';

const Panel = ({ children, className = '', theme }) => (
  <div className={`rounded-xl border ${
    theme === 'dark'
      ? 'bg-slate-800/80 border-slate-700'
      : 'bg-white border-slate-200 shadow-sm'
  } ${className}`}>
    {children}
  </div>
);

const SectionLabel = ({ label, dk, sub }) => (
  <div className="flex items-center gap-2 mt-1">
    <span className={`text-[9px] font-bold uppercase tracking-widest opacity-60 ${sub}`}>{label}</span>
    <div className={`flex-1 h-px ${dk ? 'bg-slate-700' : 'bg-slate-200'}`} />
  </div>
);

// ── Weather condition → SVG icon ─────────────────────────────────────────────
const WeatherIcon = ({ condition = 'Clear', size = 40 }) => {
  const s = size;
  const icons = {
    'Clear': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="9" fill="#fbbf24" opacity="0.95" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const r = deg * Math.PI / 180;
          return <line key={deg} x1={20 + 13 * Math.cos(r)} y1={20 + 13 * Math.sin(r)} x2={20 + 17 * Math.cos(r)} y2={20 + 17 * Math.sin(r)} stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />;
        })}
      </svg>
    ),
    'Partly Cloudy': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <circle cx="16" cy="17" r="7" fill="#fbbf24" opacity="0.9" />
        {[225, 270, 315].map(deg => {
          const r = deg * Math.PI / 180;
          return <line key={deg} x1={16 + 10 * Math.cos(r)} y1={17 + 10 * Math.sin(r)} x2={16 + 13 * Math.cos(r)} y2={17 + 13 * Math.sin(r)} stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />;
        })}
        <ellipse cx="24" cy="26" rx="9" ry="6" fill="#94a3b8" opacity="0.85" />
        <ellipse cx="18" cy="27" rx="7" ry="5" fill="#94a3b8" opacity="0.85" />
        <ellipse cx="28" cy="28" rx="6" ry="4.5" fill="#cbd5e1" opacity="0.8" />
      </svg>
    ),
    'Cloudy': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="22" cy="22" rx="11" ry="7" fill="#64748b" opacity="0.9" />
        <ellipse cx="15" cy="23" rx="9" ry="6" fill="#64748b" opacity="0.9" />
        <ellipse cx="27" cy="24" rx="8" ry="5.5" fill="#94a3b8" opacity="0.8" />
        <ellipse cx="20" cy="18" rx="7" ry="5" fill="#94a3b8" opacity="0.75" />
      </svg>
    ),
    'Overcast': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="23" rx="13" ry="8" fill="#475569" opacity="0.95" />
        <ellipse cx="14" cy="22" rx="9" ry="6" fill="#475569" />
        <ellipse cx="27" cy="22" rx="9" ry="6" fill="#475569" />
        <ellipse cx="20" cy="17" rx="8" ry="5.5" fill="#64748b" opacity="0.8" />
      </svg>
    ),
    'Light Rain': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="18" rx="11" ry="7" fill="#64748b" opacity="0.85" />
        <ellipse cx="14" cy="19" rx="8" ry="5.5" fill="#64748b" opacity="0.85" />
        {[14, 20, 26].map((x, i) => (
          <line key={i} x1={x} y1="28" x2={x - 2} y2="34" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        ))}
      </svg>
    ),
    'Moderate Rain': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="17" rx="12" ry="7" fill="#475569" opacity="0.9" />
        <ellipse cx="13" cy="18" rx="8" ry="5.5" fill="#475569" opacity="0.9" />
        {[12, 18, 24, 30].map((x, i) => (
          <line key={i} x1={x} y1="26" x2={x - 3} y2="34" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        ))}
      </svg>
    ),
    'Heavy Rain': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="15" rx="13" ry="8" fill="#334155" opacity="0.95" />
        <ellipse cx="12" cy="16" rx="8" ry="5.5" fill="#334155" />
        {[11, 17, 23, 29].map((x, i) => (
          <line key={i} x1={x} y1="24" x2={x - 4} y2="35" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        ))}
      </svg>
    ),
    'Thunderstorm': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="14" rx="13" ry="8" fill="#1e293b" opacity="0.95" />
        <ellipse cx="12" cy="15" rx="8" ry="5.5" fill="#1e293b" />
        {[11, 27].map((x, i) => (
          <line key={i} x1={x} y1="23" x2={x - 3} y2="31" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        ))}
        <path d="M22 20 L17 29 L21 29 L18 38 L26 26 L22 26 Z" fill="#fbbf24" opacity="0.95" />
      </svg>
    ),
    'Very Cold': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <line x1="20" y1="6" x2="20" y2="34" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="6" y1="20" x2="34" y2="20" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="10" x2="30" y2="30" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="30" y1="10" x2="10" y2="30" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3.5" fill="#bfdbfe" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const r = deg * Math.PI / 180, d = 9;
          return <circle key={deg} cx={20 + d * Math.cos(r)} cy={20 + d * Math.sin(r)} r="1.5" fill="#93c5fd" />;
        })}
      </svg>
    ),
    'Cold': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="18" rx="11" ry="7" fill="#64748b" opacity="0.8" />
        {[13, 20, 27].map((x, i) => (
          <g key={i}>
            <line x1={x} y1="27" x2={x} y2="33" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" />
            <circle cx={x} cy="35" r="2" fill="#bfdbfe" opacity="0.8" />
          </g>
        ))}
      </svg>
    ),
    'Cool': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <circle cx="15" cy="17" r="6.5" fill="#fbbf24" opacity="0.8" />
        <ellipse cx="24" cy="24" rx="10" ry="6.5" fill="#93c5fd" opacity="0.7" />
        <ellipse cx="18" cy="25" rx="7.5" ry="5" fill="#bfdbfe" opacity="0.7" />
      </svg>
    ),
    'Very Hot': (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="10" fill="#f97316" opacity="0.95" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const r = deg * Math.PI / 180;
          return <line key={deg} x1={20 + 13 * Math.cos(r)} y1={20 + 13 * Math.sin(r)} x2={20 + 18 * Math.cos(r)} y2={20 + 18 * Math.sin(r)} stroke="#f97316" strokeWidth="3" strokeLinecap="round" />;
        })}
        <circle cx="20" cy="20" r="6" fill="#fbbf24" opacity="0.6" />
      </svg>
    ),
  };
  return icons[condition] ?? icons['Partly Cloudy'];
};

// ── Floating weather card ─────────────────────────────────────────────────────
const WeatherFloatCard = ({ weather, plantName, theme }) => {
  if (!weather) return null;
  const dk  = theme === 'dark';
  const sub = dk ? 'text-slate-400' : 'text-slate-500';
  const tempColor = weather.temp > 35 ? 'text-orange-400' : weather.temp < 20 ? 'text-blue-400' : 'text-green-400';
  return (
    <div className={`absolute top-3 left-3 z-10 rounded-2xl border shadow-2xl px-5 py-9 min-w-[290px]
      backdrop-blur-md transition-all duration-300
      ${dk ? 'bg-slate-900/88 border-slate-600/60' : 'bg-white/92 border-slate-200'}`}>
      <div className="flex items-center gap-3.5 mb-3">
        <div className="flex-shrink-0 drop-shadow-lg">
          <WeatherIcon condition={weather.condition} size={52} />
        </div>
        <div>
          <p className={`text-base font-bold leading-tight ${dk ? 'text-white' : 'text-slate-800'}`}>{weather.condition}</p>
          <p className={`text-xs font-semibold mt-0.5 ${sub}`}>{plantName ?? 'Fleet'}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-700/40">
        <div className="flex flex-col items-center gap-1">
          <Thermometer className={`w-4 h-4 ${tempColor}`} />
          <span className={`text-sm font-bold ${tempColor}`}>{weather.temp}°C</span>
          <span className={`text-[9px] ${sub}`}>temp</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Droplets className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-blue-400">{weather.humidity}%</span>
          <span className={`text-[9px] ${sub}`}>humid</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-400">{weather.windSpeed}</span>
          <span className={`text-[9px] ${sub}`}>km/h</span>
        </div>
      </div>
      {weather.isFallback && (
        <p className={`text-[8px] mt-1.5 text-center ${sub} opacity-40`}>* estimated</p>
      )}
    </div>
  );
};

// ── Build Leaflet HTML ────────────────────────────────────────────────────────
// [FIX] CARTO's dark_all tiles now require an API key (basemaps.cartocdn.com
// started gating requests). We no longer call CARTO at all — we use the
// free, key-less OpenStreetMap tile layer for both themes, and simulate the
// dark look with a CSS filter on the tile pane. This removes the
// "API KEY REQUIRED" watermark entirely and needs no signup/key.
const buildMapHTML = (isDark, weatherMap = {}, powerMap = {}, irradianceMap = {}) => {
  const plantsJson = JSON.stringify(PLANTS.map(p => ({
    id: p.id, name: p.name, lat: p.lat, lng: p.lng,
    status: p.status,
    power: powerMap[p.id] ?? p.power,
    irradiance: irradianceMap[p.id] ?? 0,
    pr: p.pr,
    type: p.type ?? 'solar',
    weather: weatherMap[p.id] || null,
    iconOffsetY: p.iconOffsetY ?? 0,
    iconOffsetX: p.iconOffsetX ?? 0,
  })));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background: ${isDark ? '#0f172a' : '#f8fafc'}; }
  .leaflet-container { background: ${isDark ? '#0f172a' : '#f0f4f8'} !important; }
  .plant-marker { display:flex; align-items:center; justify-content:center; border-radius:50%; border:2.5px solid; cursor:pointer; box-shadow:0 0 10px rgba(0,0,0,0.4); transition: transform 0.15s; position:relative; z-index:2; }
  .plant-marker:hover { transform: scale(1.2); }
  .plant-marker.selected { box-shadow: 0 0 0 4px rgba(255,255,255,0.9), 0 0 0 7px rgba(255,255,255,0.3), 0 0 20px rgba(255,255,255,0.5) !important; border-width: 3px !important; }
  .leaflet-control-attribution { font-size:8px !important; }
  @keyframes ping { 0%{transform:scale(1);opacity:0.25} 70%{transform:scale(1.8);opacity:0} 100%{transform:scale(1.8);opacity:0} }
  /* [FIX] Fake a dark basemap by inverting the free OSM raster tiles.
     No external dark-tile service (and therefore no API key) required. */
  ${isDark ? `
  .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.9); }
  ` : ''}
</style>
</head>
<body>
<div id="map"></div>
<script>
const plants = ${plantsJson};
const isDark = ${isDark};
const map = L.map('map', { zoomControl: false, scrollWheelZoom: true });
const bounds = L.latLngBounds(plants.map(p => [p.lat, p.lng]));
map.fitBounds(bounds, { padding: [60, 60] });
// [FIX] Always use the free, key-less OpenStreetMap tile layer.
// Dark appearance is produced by the .leaflet-tile-pane CSS filter above,
// not by requesting CARTO's key-gated dark_all tiles.
L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }
).addTo(map);
const statusColor = (s) => s === 'online' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#ef4444';
const markerMap = {};
function buildChipsInner(plant) {
  const pCol = plant.status === 'warning' ? '#f59e0b' : '#facc15';
  const pKw = Math.round(plant.power);
  const irrW = plant.irradiance ?? 0;
  const irrCol = '#c084fc';
  return \`<div style="display:flex;align-items:center;gap:6px;font-size:18px;font-weight:400;white-space:nowrap;">
    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="\${pCol}" stroke-width="2" fill="\${pCol}" opacity="0.9"/></svg>
    <span style="color:\${pCol}">\${pKw} kW</span>
    <span style="color:rgba(255,255,255,0.25);font-weight:300">│</span>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="\${irrCol}" stroke-width="2.5"/>
    \${[0,45,90,135,180,225,270,315].map(deg=>{const a=deg*Math.PI/180;const x1=(12+7.5*Math.cos(a)).toFixed(1);const y1=(12+7.5*Math.sin(a)).toFixed(1);const x2=(12+10*Math.cos(a)).toFixed(1);const y2=(12+10*Math.sin(a)).toFixed(1);return \`<line x1="\${x1}" y1="\${y1}" x2="\${x2}" y2="\${y2}" stroke="\${irrCol}" stroke-width="2" stroke-linecap="round"/>\`;}).join('')}</svg>
    <span style="color:\${irrCol}">\${irrW} W/m²</span>
  </div>\`;
}
function buildTypeIcon(type) {
  return \`<svg viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M2 17 L8 6 L22 8 L16 19 Z" fill="white" opacity="0.95"/><line x1="3.5" y1="12.3" x2="19.5" y2="14" stroke="rgba(0,0,0,0.25)" stroke-width="1"/><line x1="9.8" y1="6.6" x2="7.5" y2="18.3" stroke="rgba(0,0,0,0.25)" stroke-width="1"/><line x1="15.8" y1="7.3" x2="13.5" y2="19" stroke="rgba(0,0,0,0.25)" stroke-width="1"/><line x1="12" y1="19" x2="12" y2="22" stroke="white" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="22" x2="14.5" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>\`;
}
function buildMarkerHtml(p) {
  const col = statusColor(p.status);
  const typeIcon = buildTypeIcon(p.type);
  const pingHtml = p.status === 'online' ? \`<div style="position:absolute;inset:0;border-radius:50%;background:\${col};opacity:0.2;animation:ping 1.5s infinite;pointer-events:none;z-index:1;"></div>\` : '';
  const bg = isDark ? 'rgba(2,6,23,0.92)' : 'rgba(10,18,38,0.86)';
  // [FIX] Marker/chip colors are set explicitly below (col, bg, text colors)
  // and must NOT be affected by the tile-pane's dark-mode invert filter —
  // no filter is applied here on purpose.
  return \`<div style="display:inline-flex;align-items:center;gap:7px;pointer-events:none;">
    <div style="position:relative;width:40px;height:40px;flex-shrink:0;">
      \${pingHtml}
      <div class="plant-marker" data-plant-id="\${p.id}" data-plant-type="\${p.type}" style="width:40px;height:40px;background:radial-gradient(circle at 35% 35%, \${col}ee, \${col}66);border-color:\${col};pointer-events:auto;">\${typeIcon}</div>
    </div>
    <div data-chip-wrapper style="display:flex;flex-direction:column;gap:3px;background:\${bg};border:1.5px solid rgba(255,255,255,0.14);border-radius:9px;padding:5px 10px 6px 10px;box-shadow:0 2px 10px rgba(0,0,0,0.55);backdrop-filter:blur(6px);pointer-events:none;transition:opacity 0.25s ease;">
      <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.50);letter-spacing:0.7px;text-transform:uppercase;line-height:1;">\${p.name}</span>
      <div data-chips-row>\${buildChipsInner(p)}</div>
    </div>
  </div>\`;
}
plants.forEach(p => {
  const svgIcon = L.divIcon({ className: '', html: buildMarkerHtml(p), iconSize: [40, 40], iconAnchor: [20 - (p.iconOffsetX ?? 0), 20 - (p.iconOffsetY ?? 0)] });
  const marker = L.marker([p.lat, p.lng], { icon: svgIcon }).addTo(map);
  markerMap[p.id] = marker;
  marker.on('click', () => { window.parent.postMessage({ type:'plant-click', id: p.id }, '*'); });
});
const CHIP_SHOW_ZOOM = 8;
const updateChipVisibility = () => {
  const z = map.getZoom();
  document.querySelectorAll('[data-chip-wrapper]').forEach(el => { el.style.opacity = z >= CHIP_SHOW_ZOOM ? '1' : '0'; el.style.pointerEvents = 'none'; });
};
map.on('zoomend', updateChipVisibility);
map.on('zoomstart', () => { document.querySelectorAll('[data-chip-wrapper]').forEach(el => { el.style.opacity = '0'; }); });
map.whenReady(() => setTimeout(updateChipVisibility, 300));
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'zoom-plant') map.flyTo([e.data.lat, e.data.lng], 10, { duration: 1.5 });
  if (e.data.type === 'zoom-reset') { const b = L.latLngBounds(plants.map(p => [p.lat, p.lng])); map.flyToBounds(b, { padding: [60, 60], duration: 1.2 }); }
  if (e.data.type === 'filter-type') { const ft = e.data.filterType; plants.forEach(p => { const m = markerMap[p.id]; if (!m) return; const el = m.getElement(); if (!el) return; const show = ft === 'all' || p.type === ft; el.style.opacity = show ? '1' : '0.15'; el.style.pointerEvents = show ? 'auto' : 'none'; }); }
  if (e.data.type === 'highlight') { Object.entries(markerMap).forEach(([id, m]) => { if (!m) return; const el = m.getElement()?.querySelector('.plant-marker'); if (!el) return; id === e.data.id ? el.classList.add('selected') : el.classList.remove('selected'); }); }
  if (e.data.type === 'update-chips') {
    const plant = plants.find(p => p.id === e.data.id); if (!plant) return;
    plant.power = e.data.power; plant.irradiance = e.data.irradiance ?? 0; plant.weather = e.data.weather;
    const marker = markerMap[e.data.id]; if (!marker) return;
    const markerEl = marker.getElement(); if (!markerEl) return;
    const chipsRow = markerEl.querySelector('[data-chips-row]'); if (chipsRow) chipsRow.innerHTML = buildChipsInner(plant);
    const wrapper = markerEl.querySelector('[data-chip-wrapper]'); if (wrapper) { const z = map.getZoom(); wrapper.style.opacity = z >= CHIP_SHOW_ZOOM ? '1' : '0'; }
  }
});
</script>
</body>
</html>`;
};

// ═══════════════════════════════════════════════════════════════════════════
// FleetOverviewPage Component
// ═══════════════════════════════════════════════════════════════════════════
const FleetOverviewPage = ({ theme, onEnterDashboard, onFleetDataUpdate, onWeatherUpdate, onPlantDataUpdate, headless = false }) => {
  const dk  = theme === 'dark';
  const tx  = dk ? 'text-white'     : 'text-slate-800';
  const sub = dk ? 'text-slate-400' : 'text-slate-500';
  const tip = {
    background: dk ? '#1e293b' : '#fff',
    border: `1px solid ${dk ? '#334155' : '#e2e8f0'}`,
    borderRadius: 8, fontSize: 10,
  };

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [plantWeather, setPlantWeather]     = useState({});
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    setWeatherLoading(true);
    Promise.allSettled(
      PLANTS.map(plant =>
        fetchWeatherDataByLocation(plant.lat, plant.lng)
          .then(data => ({ id: plant.id, data }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.data; });
      setPlantWeather(map);
      setWeatherLoading(false);
      if (onWeatherUpdate) onWeatherUpdate(map);
    });
  }, []);

  const curHour   = now.getHours();
  const curMin    = now.getMinutes();
  const curFrac   = curHour + curMin / 60;
  const DAY_TODAY = now.getDate();
  const DAYS_TOTAL = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const getCurrentPower = (dailyYield, cf) => {
    const h = Math.floor(cf);
    const m = cf - h;
    if (h < 6 || h > 18) return 0;
    return Math.round(getHourlyKwh(dailyYield, h) * (m || 1));
  };

  const getCurrentIrradiance = (cf) => {
    if (cf < 6 || cf > 18) return 0;
    return Math.round(Math.max(0, 950 * Math.sin(((cf - 6) / 12) * Math.PI)));
  };

  // ── [ENHANCED] Plant data — now includes `theoretical` & `irr` in powerHourly ──
  const plantData = PLANTS.map(p => {
    const dayYield   = getDailyYield(p.id, now);
    const toNow      = getYieldToNow(dayYield, curFrac);
    const powerNow   = getCurrentPower(dayYield, curFrac);
    const irradiance = getCurrentIrradiance(curFrac);
    const revenue    = Math.round(toNow * RATE_PER_KWH);

    const monthly = Array.from({ length: DAYS_TOTAL }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      if (i + 1 < DAY_TODAY)     return getDailyYield(p.id, d);
      if (i + 1 === DAY_TODAY)   return toNow;
      return null;
    });
    const monthForecast = Array.from({ length: DAYS_TOTAL }, (_, i) =>
      i + 1 > DAY_TODAY ? getDailyYield(p.id, new Date(now.getFullYear(), now.getMonth(), i + 1)) : null
    );

    // [ENHANCED] Hourly data now includes theoretical kW and irradiance W/m²
    // Hourly: actual (past) + forecast (future) + irradiance full day
    const powerHourly = Array.from({ length: 24 }, (_, h) => {
      const sinFrac  = h >= 6 && h <= 18 ? Math.sin(((h - 6) / 12) * Math.PI) : 0;
      const recorded = h <= curHour && h >= 6 && h <= 18;
      const isFuture = h > curHour && h >= 6 && h <= 18;
      const irrH     = (recorded || isFuture) ? Math.round(950 * sinFrac) : null;
      const forecastH = isFuture ? getHourlyKwh(dayYield, h) : null;
      const kwH = recorded
        ? (h === curHour
            ? Math.round(getHourlyKwh(dayYield, h) * (curMin / 60))
            : getHourlyKwh(dayYield, h))
        : null;
      return { h, kw: kwH, forecast: forecastH, irr: irrH };
    });

    return { ...p, power: powerNow, irradiance, dayYield, toNow, revenue, monthly, monthForecast, powerHourly };
  });

  const totalPower   = plantData.reduce((s, p) => s + p.power, 0);
  const totalYield   = plantData.reduce((s, p) => s + p.toNow, 0);
  const totalRevenue = plantData.reduce((s, p) => s + p.revenue, 0);

  useEffect(() => {
    if (!onFleetDataUpdate) return;
    onFleetDataUpdate({
      totalPower, totalYield, totalRevenue,
      avgPR: PLANTS.reduce((s, x) => s + x.pr, 0) / PLANTS.length,
      totalCapacity: PLANTS.reduce((s, p) => s + p.capacity, 0),
      plantCount: PLANTS.length,
    });
    if (onPlantDataUpdate) onPlantDataUpdate(plantData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPower, totalYield, totalRevenue]);

  const [selected,       setSelected]       = useState(null);
  const [filterType,     setFilterType]     = useState('all');
  const [showPRFormula,  setShowPRFormula]  = useState(false);
  const [breakdownModal, setBreakdownModal] = useState(null);

  // [NEW] Modal states
  const [showLossBreakdown,   setShowLossBreakdown]   = useState(false);
  const [lossBreakdownPlantId, setLossBreakdownPlantId] = useState(PLANTS[0].id);
  const [showStringLevel,     setShowStringLevel]     = useState(false);
  const [stringLevelPlantId,  setStringLevelPlantId]  = useState(PLANTS[0].id);

  const activePlant   = plantData.find(p => p.id === selected) ?? null;
  const activeWeather = selected ? plantWeather[selected] : null;
  const mapRef        = useRef(null);

  const selectPlant = (id) => {
    setSelected(prev => {
      const newId = prev === id ? null : id;
      setTimeout(() => {
        const win = mapRef.current?.contentWindow;
        if (!win) return;
        if (newId) {
          const plant = PLANTS.find(p => p.id === newId);
          if (plant) win.postMessage({ type: 'zoom-plant', lat: plant.lat, lng: plant.lng, id: newId }, '*');
        } else {
          win.postMessage({ type: 'zoom-reset' }, '*');
          win.postMessage({ type: 'filter-type', filterType }, '*');
        }
        win.postMessage({ type: 'highlight', id: newId }, '*');
      }, 50);
      return newId;
    });
  };

  const handleFilter = (ft) => {
    setFilterType(ft);
    const win = mapRef.current?.contentWindow;
    if (win) win.postMessage({ type: 'filter-type', filterType: ft }, '*');
  };

  useEffect(() => {
    const handler = (e) => { if (e.data?.type === 'plant-click') selectPlant(e.data.id); };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const powerMap      = Object.fromEntries(plantData.map(p => [p.id, p.power]));
  const irradianceMap = Object.fromEntries(plantData.map(p => [p.id, p.irradiance]));
  const mapHTML       = buildMapHTML(dk, plantWeather, powerMap, irradianceMap);

  useEffect(() => {
    if (!mapRef.current?.contentWindow) return;
    if (Object.keys(plantWeather).length === 0) return;
    const win = mapRef.current.contentWindow;
    PLANTS.forEach(p => {
      win.postMessage({ type: 'update-chips', id: p.id, power: powerMap[p.id] ?? p.power, irradiance: irradianceMap[p.id] ?? 0, weather: plantWeather[p.id] || null }, '*');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantWeather, JSON.stringify(powerMap), JSON.stringify(irradianceMap)]);

  const yieldBarData = Array.from({ length: DAYS_TOTAL }, (_, i) => {
    const src = activePlant ? [activePlant] : plantData;
    return {
      m:        String(i + 1),
      yield:    src[0].monthly[i]      != null ? src.reduce((s, p) => s + (p.monthly[i]      ?? 0), 0) : null,
      forecast: src[0].monthForecast[i] != null ? src.reduce((s, p) => s + (p.monthForecast[i] ?? 0), 0) : null,
    };
  });

  // [NEW] Combined dual-axis chart data (actual + theoretical + irradiance)
  const chartData = activePlant
    ? activePlant.powerHourly
    : plantData[0].powerHourly.map((d, i) => ({
        h: d.h,
        kw: plantData.some(p => p.powerHourly[i].kw != null)
          ? plantData.reduce((s, p) => s + (p.powerHourly[i].kw ?? 0), 0)
          : null,
        theoretical: plantData.some(p => p.powerHourly[i].theoretical != null)
          ? plantData.reduce((s, p) => s + (p.powerHourly[i].theoretical ?? 0), 0)
          : null,
        irr: d.irr,
      }));

  // [NEW] PR loss value helper
  const getCapacityMW = (plant) =>
    plant ? plant.capacity / 1000 : PLANTS.reduce((s, p) => s + p.capacity, 0) / 1000;

  // headless: only compute/push plant + weather data up to the parent (used by Overview), render no UI
  if (headless) return null;

  return (
    <>
    <div className={`flex flex-col h-full ${dk ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ══════════════════════════════════════════════════
            LEFT COLUMN
        ══════════════════════════════════════════════════ */}
        <div className={`w-80 flex-shrink-0 flex flex-col gap-2 p-3 overflow-y-auto border-r ${dk ? 'border-slate-700' : 'border-slate-200'}`}>

          {/* ── Group A · Live Monitoring ── */}
          <SectionLabel label="Live Monitoring" dk={dk} sub={sub} />

          {/* [ENHANCED] Real-Time Power — dual-axis ComposedChart (Actual + Theoretical + Irradiance) */}
          <Panel theme={theme} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-bold ${tx}`}>Real-Time Power</p>
              <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {fmt(activePlant ? activePlant.power : totalPower)} kW
            </p>

            {/* [NEW] Energy Balance chart legend */}
            <div className="flex items-center gap-3 mb-1 mt-0.5">
              <span className="flex items-center gap-1 text-[8px] text-blue-400 font-semibold">
                <span className="w-3 h-0.5 bg-blue-400 inline-block rounded"/>Actual
              </span>
              <span className="flex items-center gap-1 text-[8px] text-blue-300 font-semibold">
                <span className="w-3 inline-block" style={{ borderTop: '1.5px dashed #93c5fd', display: 'inline-block' }}/>Forecast
              </span>
              <span className="flex items-center gap-1 text-[8px] text-amber-400 font-semibold">
                <span className="w-3 inline-block" style={{ borderTop: '1.5px dashed #f59e0b', display: 'inline-block' }}/>Irr W/m²
              </span>
            </div>

            {/* [ENHANCED] ComposedChart with dual Y-axis */}
            
            <ResponsiveContainer width="100%" height={120}>
              <ComposedChart data={chartData} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="pwG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="thG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="h" tick={{ fontSize: 8, fill: dk ? '#64748b' : '#94a3b8' }} interval={5} />
                <YAxis yAxisId="left" tick={{ fontSize: 8 }} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 7, fill: '#f59e0b' }} width={36} />
                <Tooltip
                  contentStyle={tip}
                  formatter={(v, n) => {
                    if (v == null) return ['-'];
                    if (n === 'Irradiance') return [`${v} W/m²`, 'Irradiance'];
                    return [`${v} kW`, n];
                  }}
                />
                {/* Forecast (dashed blue area) */}
                <Area
                  yAxisId="left" type="monotone" dataKey="forecast"
                  name="Forecast" stroke="#93c5fd" fill="url(#pwG)"
                  strokeWidth={1.5} strokeDasharray="5 3" dot={false}
                  connectNulls={false} opacity={0.6}
                />
                {/* Actual (solid blue area) */}
                <Area
                  yAxisId="left" type="monotone" dataKey="kw"
                  name="Actual" stroke="#3b82f6" fill="url(#pwG)"
                  strokeWidth={1.5} dot={false} connectNulls={false}
                />
                {/* Irradiance (amber dashed line — right axis) */}
                <Line
                  yAxisId="right" type="monotone" dataKey="irr"
                  name="Irradiance" stroke="#f59e0b" strokeWidth={1.5}
                  strokeDasharray="3 2" dot={false} connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          {/* ── Group B · Key Metrics ── */}
          <SectionLabel label="Key Metrics" dk={dk} sub={sub} />

          {(() => {
            const p        = activePlant;
            const yieldVal = p ? p.toNow   : totalYield;
            const revVal   = p ? p.revenue : totalRevenue;
            const prVal    = p ? p.pr      : PLANTS.reduce((s, x) => s + x.pr, 0) / PLANTS.length;
            const capMW    = getCapacityMW(p);
            const prLoss   = Math.round(Math.max(0, PR_THRESHOLD - prVal) * LOSS_PER_PCT_PER_MW * capMW);

            return [
              {
                label: 'Yield Today', col: 'text-yellow-400',
                bdr: dk ? 'border-yellow-700/30' : 'border-yellow-200',
                value: `${yieldVal.toLocaleString()} kWh`,
                gv: yieldVal, gmin: 0, gmax: 16470,
                isYield: true,
              },
              {
                label: 'Revenue Today', col: 'text-green-400',
                bdr: dk ? 'border-green-700/30' : 'border-green-200',
                value: `฿${revVal.toLocaleString()}`,
                target: ` / ฿${(5.66 * 16470).toLocaleString()}`,
                sub2: `฿${RATE_PER_KWH} / kWh`,
                gv: revVal, gmin: 0, gmax: 5.66 * 16470,
                isRev: true,
              },
              {
                label: 'Performance Ratio', col: 'text-blue-400',
                bdr: dk ? 'border-blue-700/30' : 'border-blue-200',
                value: `${prVal.toFixed(1)}%`,
                target: '/ 100%',
                sub2: p ? p.name : 'Fleet avg',
                gv: prVal, gmin: 0, gmax: 100,
                isPR: true,
                prLoss, prVal,
              },
            ].map((k) => (
              <div key={k.label}
                onClick={
                  k.isPR    ? () => setShowPRFormula(true) :
                  k.isYield ? () => setBreakdownModal('yield') :
                  k.isRev   ? () => setBreakdownModal('revenue') :
                  undefined
                }
                className={`rounded-xl border p-3 overflow-hidden transition-all duration-300 ${
                  dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                } border-l-2 ${k.bdr} ${
                  (k.isPR || k.isYield || k.isRev)
                    ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/40' : ''
                }`}>
                <div className="flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    {/* [ENHANCED] PR card — show threshold badge when below target */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-lg font-bold ${k.col} leading-tight`}>{k.value}</p>
                      {k.isPR && k.prVal < PR_THRESHOLD && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                          <AlertTriangle className="w-2 h-2" />
                          Below target
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] font-semibold ${k.col} opacity-70`}>{k.target}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className={`text-xs font-medium ${sub}`}>{k.label}</p>
                      {k.isPR && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${dk ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>ƒ(x)</span>
                      )}
                      {(k.isYield || k.isRev) && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>↗ breakdown</span>
                      )}
                    </div>
                    <p className={`text-[9px] mt-0.5 ${sub} opacity-60`}>{k.sub2}</p>

                    {/* [NEW] PR loss value indicator */}
                    {k.isPR && k.prLoss > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <AlertTriangle className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
                        <span className="text-[9px] font-bold text-red-400">
                          ฿{k.prLoss.toLocaleString()}/yr at risk
                        </span>
                      </div>
                    )}
                  </div>
                  <SemiGauge value={k.gv} min={k.gmin} max={k.gmax} theme={theme} />
                </div>
              </div>
            ));
          })()}

          {/* [NEW] Loss Breakdown Analysis trigger button */}
          <button
            onClick={() => {
              setLossBreakdownPlantId(activePlant?.id ?? PLANTS[0].id);
              setShowLossBreakdown(true);
            }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-[1.01] active:scale-[0.99] ${
              dk
                ? 'bg-red-900/20 border-red-800/40 text-red-400 hover:bg-red-900/30'
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Loss Breakdown Analysis
          </button>

          {/* ── Group C · Operations ── */}
          <SectionLabel label="Operations" dk={dk} sub={sub} />

          <Panel theme={theme} className="p-3">
            <p className={`text-sm font-bold mb-2 ${tx}`}>O&M Statistics</p>
            <div className="flex items-center gap-3">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke={dk ? '#334155' : '#e2e8f0'} strokeWidth="9" />
                <text x="24" y="28" textAnchor="middle" fontSize="8" fill={dk ? '#94a3b8' : '#64748b'} fontWeight="bold">O&M</text>
              </svg>
              <div className="space-y-1 text-[9px]">
                {[
                  { col: 'bg-green-400',  label: 'To be approved',   val: 0 },
                  { col: 'bg-orange-400', label: 'To be dispatched', val: 0 },
                  { col: 'bg-blue-400',   label: 'Discarded',        val: 0 },
                  { col: 'bg-purple-400', label: 'Ongoing',          val: 0 },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.col}`} />
                    <span className={sub}>{r.label}</span>
                    <span className={`ml-auto font-bold ${tx}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`border-t mt-3 pt-3 ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-sm font-bold mb-2 ${tx}`}>Environmental Benefits</p>
              <div className="flex justify-around mb-2">
                {[{ icon: '🚂', label: 'Coal saved' }, { icon: '🏭', label: 'CO₂ avoided' }, { icon: '🌲', label: 'Trees equiv.' }].map((e, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-xl">{e.icon}</span>
                    <p className={`text-[9px] text-center ${sub}`}>{e.label}</p>
                  </div>
                ))}
              </div>
              <div className={`rounded-lg overflow-hidden border text-[9px] ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className={`grid grid-cols-4 font-bold px-2 py-1 ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <span /><span className="text-right">Coal</span><span className="text-right">CO₂</span><span className="text-right">Trees</span>
                </div>
                {[
                  { label: 'Annual', coal: '11.75K', co2: '13.95K', trees: '19.45K' },
                  { label: 'Total',  coal: '122.3K', co2: '145.2K', trees: '198.9K' },
                ].map(r => (
                  <div key={r.label} className={`grid grid-cols-4 px-2 py-1 border-t ${dk ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-600'}`}>
                    <span className="font-semibold">{r.label}</span>
                    <span className="text-right text-green-400">{r.coal}</span>
                    <span className="text-right text-blue-400">{r.co2}</span>
                    <span className="text-right text-emerald-400">{r.trees}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ══════════════════════════════════════════════════
            CENTER: Leaflet Map
        ══════════════════════════════════════════════════ */}
        <div className={`flex-1 relative overflow-hidden ${dk ? 'bg-slate-950' : 'bg-slate-100'}`}>

          {activePlant && activeWeather && (
            <WeatherFloatCard weather={activeWeather} plantName={activePlant.name} theme={theme} />
          )}

          <button
            onClick={() => {
              const el = document.documentElement;
              if (!document.fullscreenElement) el.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}
            title="Toggle fullscreen"
            className={`absolute bottom-10 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg border shadow-lg transition hover:scale-110 active:scale-95 ${
              dk ? 'bg-slate-800/90 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white/90 border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          {weatherLoading && (
            <div className={`absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-medium border backdrop-blur-md ${
              dk ? 'bg-slate-900/80 border-slate-600/60 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-500'
            }`}>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Fetching weather...
            </div>
          )}

          {!activePlant && (
            <div className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 p-1 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${dk ? 'bg-slate-900/85 border-slate-600/60' : 'bg-white/90 border-slate-200'}`}>
              {[{ id: 'all', label: 'All' }, { id: 'solar', label: 'Solar' }, { id: 'biomass', label: 'Biomass' }].map(btn => {
                const active = filterType === btn.id;
                return (
                  <button key={btn.id} onClick={() => handleFilter(btn.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      active
                        ? btn.id === 'solar'   ? 'bg-yellow-500/90 text-slate-900 shadow-md shadow-yellow-500/30'
                        : btn.id === 'biomass' ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-600/30'
                        :                        'bg-blue-600/90 text-white shadow-md shadow-blue-600/30'
                        : dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/80'
                             : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}

          <iframe
            ref={mapRef}
            key={dk ? 'dark' : 'light'}
            title="Fleet Map"
            srcDoc={mapHTML}
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />

          {/* [ENHANCED] Plant detail panel — now with String-Level Monitor button */}
          {activePlant && (
            <div className={`absolute top-3 right-3 w-72 rounded-2xl shadow-2xl border p-4 z-10 ${dk ? 'bg-slate-800/96 border-slate-600' : 'bg-white/96 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-base font-bold ${tx}`}>{activePlant.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: statusColor(activePlant.status) + '25', color: statusColor(activePlant.status) }}>
                  {activePlant.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs mb-3">
                {[
                  { label: 'Power',      value: `${fmt(activePlant.power)} kW`,              col: 'text-blue-400'   },
                  { label: 'Yield Today', value: `${activePlant.toNow.toLocaleString()} kWh`, col: 'text-yellow-400' },
                  { label: 'Revenue',    value: `฿${activePlant.revenue.toLocaleString()}`,  col: 'text-green-400'  },
                  { label: 'PR',         value: `${fmt(activePlant.pr)}%`,                   col: activePlant.pr < PR_THRESHOLD ? 'text-red-400' : 'text-cyan-400' },
                  { label: 'Irradiance', value: `${activePlant.irradiance} W/m²`,            col: 'text-purple-400' },
                ].map(r => (
                  <div key={r.label}>
                    <p className={`text-[10px] ${sub}`}>{r.label}</p>
                    <p className={`font-bold text-sm ${r.col}`}>{r.value}</p>
                  </div>
                ))}
              </div>

              {/* [NEW] Loss summary in plant detail */}
              {(() => {
                const lp = LOSS_PROFILES[activePlant.id];
                const totalLoss = lp ? Object.values(lp).reduce((s, v) => s + v, 0) : 0;
                const capMW = activePlant.capacity / 1000;
                const annualLoss = Math.round(totalLoss * LOSS_PER_PCT_PER_MW * capMW);
                return lp ? (
                  <div className={`rounded-lg p-2 mb-3 border ${dk ? 'bg-red-900/15 border-red-800/30' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-red-400">Total Energy Loss</span>
                      <span className="text-[9px] font-bold text-red-400">{totalLoss.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-1">
                      {LOSS_META.map(lm => (
                        <div key={lm.key} style={{ width: `${((lp[lm.key] ?? 0) / totalLoss) * 100}%`, background: lm.color }} />
                      ))}
                    </div>
                    <p className={`text-[9px] ${sub}`}>Impact: <span className="text-orange-400 font-bold">฿{annualLoss.toLocaleString()}/yr</span></p>
                  </div>
                ) : null;
              })()}

              <div className="flex flex-col gap-2 mt-1">
                {onEnterDashboard && (
                  <button
                    onClick={() => onEnterDashboard(activePlant.id, activePlant)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    View {activePlant.name} Dashboard
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}

                {/* [NEW] String-Level Monitor button */}
                <button
                  onClick={() => { setStringLevelPlantId(activePlant.id); setShowStringLevel(true); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <Cpu className="w-3 h-3" />
                  String-Level Monitor
                </button>

                {/* [NEW] Loss Analysis shortcut */}
                <button
                  onClick={() => { setLossBreakdownPlantId(activePlant.id); setShowLossBreakdown(true); }}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                    dk ? 'border-red-800/40 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Loss Breakdown
                </button>
              </div>
            </div>
          )}

          {!activePlant && (
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-[10px] font-medium border pointer-events-none ${dk ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white/80 border-slate-200 text-slate-500'}`}>
              Click a marker to view plant details
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT COLUMN
        ══════════════════════════════════════════════════ */}
        <div className={`w-80 flex-shrink-0 flex flex-col gap-2 p-3 overflow-y-auto border-l ${dk ? 'border-slate-700' : 'border-slate-200'}`}>

          <SectionLabel label="Production" dk={dk} sub={sub} />

          <Panel theme={theme} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-bold ${tx}`}>Yield This Month</p>
              <span className="text-base font-bold text-green-400">
                {(activePlant
                  ? activePlant.monthly.reduce((s, v) => s + (v ?? 0), 0)
                  : plantData.reduce((s, p) => s + p.monthly.reduce((a, v) => a + (v ?? 0), 0), 0)
                ).toLocaleString()} kWh
              </span>
            </div>
            <p className={`text-[10px] ${sub} mb-2`}>{activePlant?.name ?? 'All plants'}</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={yieldBarData} margin={{ top: 4, right: 4, left: -28, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={dk ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="m" tick={{ fontSize: 8, fill: dk ? '#64748b' : '#94a3b8' }} />
                <YAxis tick={{ fontSize: 8 }} />
                <Tooltip contentStyle={tip} formatter={(v, n) => v ? [`${Number(v).toLocaleString()} kWh`, n] : ['-']} />
                <Bar dataKey="yield"    name="Actual"   fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.9} barSize={16} />
                <Bar dataKey="forecast" name="Forecast" fill="#7dd3fc" radius={[3, 3, 0, 0]} opacity={0.5} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <SectionLabel label="Fleet Status" dk={dk} sub={sub} />

          <Panel theme={theme} className="p-3">
            <p className={`text-sm font-bold mb-1 ${tx}`}>Energy Yield Ranking</p>
            <p className={`text-xs ${sub} mb-2`}>Yield today (kWh)</p>
            {[...plantData].sort((a, b) => b.toNow - a.toNow).map((p, i) => {
              const max = Math.max(...plantData.map(x => x.toNow));
              return (
                <div key={p.id} className="mb-2 cursor-pointer" onClick={() => selectPlant(p.id)}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className={`font-semibold ${selected === p.id ? 'text-blue-400' : sub}`}>{p.name}</span>
                    <span className={`font-bold ${tx}`}>{p.toNow.toLocaleString()} kWh</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(p.toNow / max) * 100}%`, background: i === 0 ? '#22c55e' : '#3b82f6' }} />
                  </div>
                </div>
              );
            })}

            <div className={`border-t mt-3 pt-3 ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-sm font-bold mb-2 ${tx}`}>Plant Status</p>
              <div className="space-y-1.5">
                {plantData.map(p => {
                  const w = plantWeather[p.id];
                  const tempCol = w
                    ? (w.temp > 35 ? 'text-orange-400' : w.temp < 20 ? 'text-blue-400' : 'text-green-400')
                    : sub;
                  return (
                    <div key={p.id}
                      onClick={() => selectPlant(p.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition border ${
                        selected === p.id
                          ? dk ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
                          : dk ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-100'
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: statusColor(p.status) }} />
                        <div>
                          <p className={`text-sm font-semibold ${tx}`}>{p.name}</p>
                          <p className={`text-xs ${sub}`}>{fmt(p.power)} kW · {p.toNow.toLocaleString()} kWh today</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {w && <span className={`text-[9px] font-bold ${tempCol}`}>{w.temp}°C</span>}
                        <ChevronRight className={`w-3.5 h-3.5 ${sub}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <SectionLabel label="Alerts" dk={dk} sub={sub} />

          {(() => {
            const src = activePlant ? [activePlant] : plantData;
            const alarmCounts = {
              Critical: src.filter(p => p.status === 'offline').length,
              Major:    0,
              Minor:    0,
              Warning:  src.filter(p => p.status === 'warning').length,
            };
            const total = Object.values(alarmCounts).reduce((s, v) => s + v, 0);
            const alarmColors = { Critical: '#ef4444', Major: '#f59e0b', Minor: '#3b82f6', Warning: '#f59e0b' };
            const R = 26, STROKE = 12, CIRC = 2 * Math.PI * R;
            const warningPct = total > 0 ? alarmCounts.Warning / total : 0;
            const critPct    = total > 0 ? alarmCounts.Critical / total : 0;
            return (
              <Panel theme={theme} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-bold ${tx}`}>Active Alarms</p>
                  <span className={`text-[10px] font-semibold ${total > 0 ? 'text-yellow-400' : sub}`}>Total: {total}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r={R} fill="none" stroke={dk ? '#334155' : '#e2e8f0'} strokeWidth={STROKE} />
                    {alarmCounts.Warning > 0 && (
                      <circle cx="36" cy="36" r={R} fill="none" stroke="#f59e0b" strokeWidth={STROKE}
                        strokeDasharray={`${warningPct * CIRC} ${CIRC}`}
                        strokeDashoffset={CIRC * 0.25}
                        strokeLinecap="round" transform="rotate(-90 36 36)" />
                    )}
                    {alarmCounts.Critical > 0 && (
                      <circle cx="36" cy="36" r={R} fill="none" stroke="#ef4444" strokeWidth={STROKE}
                        strokeDasharray={`${critPct * CIRC} ${CIRC}`}
                        strokeDashoffset={CIRC * (0.25 - warningPct)}
                        strokeLinecap="round" transform="rotate(-90 36 36)" />
                    )}
                    <text x="36" y="41" textAnchor="middle" fontSize="18" fontWeight="bold"
                      fill={total > 0 ? '#f59e0b' : (dk ? '#f1f5f9' : '#1e293b')}>{total}</text>
                  </svg>
                  <div className="space-y-1 text-xs flex-1">
                    {Object.entries(alarmCounts).map(([label, val]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: alarmColors[label] }} />
                        <span className={sub}>{label}:</span>
                        <span className={`ml-auto font-bold ${val > 0 ? 'text-yellow-400' : tx}`}>{val}</span>
                      </div>
                    ))}
                    {!activePlant && alarmCounts.Warning > 0 && (
                      <p className="text-[9px] text-yellow-400 mt-1 pt-1 border-t border-yellow-700/30">
                        ⚠ {plantData.filter(p => p.status === 'warning').map(p => p.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })()}
        </div>
      </div>
    </div>

    {/* ═══════════════════════════════════════════════════════════════════
        MODALS
    ═══════════════════════════════════════════════════════════════════ */}

    {/* Yield / Revenue Breakdown Modal (original) */}
    {breakdownModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setBreakdownModal(null)}>
        <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-base font-bold ${tx}`}>{breakdownModal === 'yield' ? '⚡ Yield Breakdown' : '💰 Revenue Breakdown'}</h3>
              <p className={`text-xs mt-0.5 ${sub}`}>{breakdownModal === 'yield' ? 'Energy produced today — by plant' : 'Revenue earned today — by plant'}</p>
            </div>
            <button onClick={() => setBreakdownModal(null)} className={`p-1.5 rounded-lg transition ${dk ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          {(() => {
            const isYield = breakdownModal === 'yield';
            const total   = plantData.reduce((s, p) => s + (isYield ? p.toNow : p.revenue), 0);
            const sorted  = [...plantData].sort((a, b) => isYield ? b.toNow - a.toNow : b.revenue - a.revenue);
            return (
              <div className="space-y-3">
                {sorted.map((p, i) => {
                  const val = isYield ? p.toNow : p.revenue;
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  const w   = plantWeather[p.id];
                  const sCol = p.status === 'online' ? '#22c55e' : p.status === 'warning' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={p.id} className={`rounded-xl p-3.5 border ${dk ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: sCol }} />
                          <span className={`text-sm font-bold ${tx}`}>{p.name}</span>
                          {w && <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${dk ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{w.temp}°C · {w.condition}</span>}
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 ${i === 0 ? 'text-green-400' : 'text-blue-400'}`}>
                          {isYield ? `${val.toLocaleString()} kWh` : `฿${val.toLocaleString()}`}
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-600' : 'bg-slate-200'}`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: i === 0 ? '#22c55e' : '#3b82f6' }} />
                      </div>
                      <div className={`flex justify-between mt-1.5 text-[9px] ${sub}`}>
                        <span>{p.capacity} kWp · {p.status}</span>
                        <span className="font-semibold">{pct.toFixed(1)}% of total</span>
                      </div>
                    </div>
                  );
                })}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${dk ? 'bg-blue-900/20 border-blue-800/40' : 'bg-blue-50 border-blue-100'}`}>
                  <span className={`text-xs font-bold ${dk ? 'text-blue-300' : 'text-blue-700'}`}>Fleet Total</span>
                  <span className="text-base font-bold text-blue-400">{isYield ? `${total.toLocaleString()} kWh` : `฿${total.toLocaleString()}`}</span>
                </div>
              </div>
            );
          })()}
          <button onClick={() => setBreakdownModal(null)} className="mt-4 w-full py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">Close</button>
        </div>
      </div>
    )}

    {/* PR Formula Modal (original) */}
    {showPRFormula && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPRFormula(false)}>
        <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${dk ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-base font-bold ${tx}`}>Performance Ratio Formula</h3>
              <p className={`text-xs mt-0.5 ${sub}`}>PR actual calculation method</p>
            </div>
            <button onClick={() => setShowPRFormula(false)} className={`p-1.5 rounded-lg transition ${dk ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className={`rounded-xl p-5 mb-5 border ${dk ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-col items-center gap-1 mb-4">
              <p className={`text-sm font-bold italic ${dk ? 'text-blue-300' : 'text-blue-700'}`}>PR<sub>actual</sub><span className={`mx-2 not-italic font-bold text-lg ${tx}`}>=</span></p>
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <p className={`text-sm font-semibold italic text-center ${dk ? 'text-slate-200' : 'text-slate-700'}`}>E<sub>produced system energy</sub></p>
                <div className={`w-full h-px my-1 ${dk ? 'bg-slate-500' : 'bg-slate-400'}`} />
                <p className={`text-xs font-semibold italic text-center leading-relaxed ${dk ? 'text-slate-300' : 'text-slate-600'}`}>GTI &nbsp;×&nbsp; A<sub>total module area</sub> &nbsp;×&nbsp; η<sub>STC module</sub> &nbsp;×&nbsp; α<sub>temperature correction</sub></p>
              </div>
            </div>
            <div className={`flex items-start gap-2 pt-3 border-t ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`text-[10px] font-bold mt-0.5 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>GTI =</span>
              <p className={`text-[10px] leading-relaxed ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Global Horizontal Irradiance &nbsp;<span className="font-bold text-red-400">×</span>&nbsp; Inclined Adjustment Factor<span className={`ml-1 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>(From PV sys report)</span></p>
            </div>
          </div>
          <div className={`rounded-xl overflow-hidden border text-xs ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`grid grid-cols-2 px-3 py-2 font-bold text-[10px] uppercase tracking-wide ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}><span>Symbol</span><span>Description</span></div>
            {[
              { sym: 'E',   desc: 'Energy produced by the system (kWh)' },
              { sym: 'GTI', desc: 'Global Tilted Irradiance (kWh/m²)' },
              { sym: 'A',   desc: 'Total PV module area (m²)' },
              { sym: 'η',   desc: 'Module efficiency at STC (%)' },
              { sym: 'α',   desc: 'Temperature correction factor' },
            ].map((r, i) => (
              <div key={r.sym} className={`grid grid-cols-2 px-3 py-2 border-t ${dk ? 'border-slate-700 text-slate-300' : 'border-slate-100 text-slate-700'} ${i % 2 === 0 ? (dk ? 'bg-slate-800/40' : 'bg-white') : (dk ? 'bg-slate-800/80' : 'bg-slate-50/60')}`}>
                <span className="font-bold italic text-blue-400">{r.sym}</span>
                <span className={sub}>{r.desc}</span>
              </div>
            ))}
          </div>
          <div className={`mt-4 flex items-center justify-between px-4 py-3 rounded-xl ${dk ? 'bg-blue-900/20 border border-blue-800/40' : 'bg-blue-50 border border-blue-100'}`}>
            <p className={`text-xs font-semibold ${dk ? 'text-blue-300' : 'text-blue-700'}`}>Current PR {activePlant ? `— ${activePlant.name}` : '— Fleet Avg'}</p>
            <p className="text-xl font-bold text-blue-400">{activePlant ? `${activePlant.pr.toFixed(1)}%` : `${(PLANTS.reduce((s, p) => s + p.pr, 0) / PLANTS.length).toFixed(1)}%`}</p>
          </div>
          <button onClick={() => setShowPRFormula(false)} className="mt-4 w-full py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">Close</button>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════════════════════
        [NEW] Loss Breakdown Analysis Modal
    ══════════════════════════════════════════════════════════════════ */}
    {showLossBreakdown && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLossBreakdown(false)}>
        <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-base font-bold ${tx}`}>📉 Loss Breakdown Analysis</h3>
              <p className={`text-xs mt-0.5 ${sub}`}>แยกหมวดความสูญเสียพลังงาน + มูลค่าผลกระทบต่อปี</p>
            </div>
            <button onClick={() => setShowLossBreakdown(false)} className={`p-1.5 rounded-lg transition ${dk ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Plant tabs */}
          <div className={`flex gap-1 p-1 rounded-xl mb-4 ${dk ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
            {plantData.map(p => (
              <button key={p.id}
                onClick={() => setLossBreakdownPlantId(p.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  lossBreakdownPlantId === p.id
                    ? 'bg-blue-600 text-white shadow'
                    : dk ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}>
                {p.name}
              </button>
            ))}
          </div>

          {(() => {
            const plant   = plantData.find(p => p.id === lossBreakdownPlantId) ?? plantData[0];
            const lossData = LOSS_PROFILES[plant.id] ?? LOSS_PROFILES.PV1;
            const capMW   = plant.capacity / 1000;
            const totalLoss = Object.values(lossData).reduce((s, v) => s + v, 0);
            const maxLoss   = Math.max(...Object.values(lossData));
            const annualImpact = Math.round(totalLoss * LOSS_PER_PCT_PER_MW * capMW);

            return (
              <div className="space-y-3">
                {/* PR Overview bar */}
                <div className={`rounded-xl p-3.5 border ${dk ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-bold ${tx}`}>PR Overview — {plant.name}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${plant.pr < PR_THRESHOLD ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                      {plant.pr < PR_THRESHOLD ? `▼ Below ${PR_THRESHOLD}% target` : `▲ Above ${PR_THRESHOLD}% target`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Theoretical', val: '100.0%', col: 'text-slate-400' },
                      { label: 'Total Loss',  val: `-${totalLoss.toFixed(1)}%`, col: 'text-red-400' },
                      { label: 'Actual PR',   val: `${plant.pr.toFixed(1)}%`, col: plant.pr < PR_THRESHOLD ? 'text-red-400' : 'text-green-400' },
                      { label: 'Loss/yr',     val: `฿${annualImpact.toLocaleString()}`, col: 'text-orange-400' },
                    ].map(item => (
                      <div key={item.label} className={`rounded-lg p-2 ${dk ? 'bg-slate-800/60' : 'bg-white'}`}>
                        <p className={`text-sm font-bold ${item.col}`}>{item.val}</p>
                        <p className={`text-[9px] mt-0.5 ${sub}`}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loss stacked mini-waterfall */}
                <div className={`rounded-xl p-3 border ${dk ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-2 ${sub} uppercase tracking-wide`}>Loss Composition</p>
                  <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                    {LOSS_META.map(lm => (
                      <div key={lm.key}
                        title={`${lm.label}: ${lossData[lm.key]}%`}
                        style={{ width: `${((lossData[lm.key] ?? 0) / totalLoss) * 100}%`, background: lm.color }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {LOSS_META.map(lm => (
                      <span key={lm.key} className="flex items-center gap-1 text-[9px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lm.color }}/>
                        <span className={sub}>{lm.key}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Per-category breakdown bars */}
                {LOSS_META.map(lm => {
                  const pct     = lossData[lm.key] ?? 0;
                  const bahtVal = Math.round(pct * LOSS_PER_PCT_PER_MW * capMW);
                  const barW    = maxLoss > 0 ? (pct / maxLoss) * 100 : 0;
                  const isBig   = pct === maxLoss;
                  return (
                    <div key={lm.key} className={`rounded-xl p-3.5 border transition-all ${
                      isBig
                        ? dk ? 'bg-slate-700/60 border-slate-500 ring-1 ring-red-500/30' : 'bg-white border-slate-300 ring-1 ring-red-200'
                        : dk ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: lm.color }}/>
                          <span className={`text-xs font-semibold ${tx}`}>{lm.label}</span>
                          {isBig && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">Highest</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span style={{ color: lm.color }} className="font-bold">{pct.toFixed(1)}%</span>
                          <span className={`font-bold ${dk ? 'text-slate-300' : 'text-slate-700'}`}>฿{bahtVal.toLocaleString()}/yr</span>
                        </div>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-600' : 'bg-slate-200'}`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, background: lm.color }}/>
                      </div>
                      <p className={`text-[9px] mt-1 ${sub}`}>
                        {lm.key === 'dust'        && 'ล้างแผงทุก 2-4 สัปดาห์ช่วยลดได้ 60-80%'}
                        {lm.key === 'fault'       && 'ตรวจสอบ Inverter และสาย String ทันที'}
                        {lm.key === 'shading'     && 'พิจารณาตัด / ปรับทิศวัสดุที่บัง'}
                        {lm.key === 'temperature' && 'เพิ่มการระบายอากาศหลังโมดูล'}
                        {lm.key === 'mismatch'    && 'ตรวจสอบ I-V curve และ string balance'}
                      </p>
                    </div>
                  );
                })}

                {/* Total impact */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${dk ? 'bg-orange-900/20 border-orange-800/40' : 'bg-orange-50 border-orange-100'}`}>
                  <div>
                    <p className={`text-xs font-bold ${dk ? 'text-orange-300' : 'text-orange-700'}`}>รวมความเสียหายต่อปี — {plant.name}</p>
                    <p className={`text-[9px] ${sub}`}>{plant.capacity.toLocaleString()} kWp · {capMW.toFixed(2)} MW · {totalLoss.toFixed(1)}% total loss</p>
                  </div>
                  <span className="text-lg font-bold text-orange-400">฿{annualImpact.toLocaleString()}</span>
                </div>
              </div>
            );
          })()}

          <button onClick={() => setShowLossBreakdown(false)} className="mt-4 w-full py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">Close</button>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════════════════════
        [NEW] String-Level Precision Monitoring Modal
    ══════════════════════════════════════════════════════════════════ */}
    {showStringLevel && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowStringLevel(false)}>
        <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-base font-bold ${tx}`}>🔋 String-Level Monitor</h3>
              <p className={`text-xs mt-0.5 ${sub}`}>ตรวจสอบสถานะระดับ String — ระบุจุดผิดปกติแม่นยำ ลดเวลาตรวจหน้างาน</p>
            </div>
            <button onClick={() => setShowStringLevel(false)} className={`p-1.5 rounded-lg transition ${dk ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Plant tabs */}
          <div className={`flex gap-1 p-1 rounded-xl mb-4 ${dk ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
            {plantData.map(p => (
              <button key={p.id}
                onClick={() => setStringLevelPlantId(p.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  stringLevelPlantId === p.id
                    ? 'bg-purple-600 text-white shadow'
                    : dk ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}>
                {p.name}
              </button>
            ))}
          </div>

          {(() => {
            const plant    = plantData.find(p => p.id === stringLevelPlantId) ?? plantData[0];
            const invCount = INVERTER_COUNT[plant.id] ?? 5;

            // Pre-compute all string data
            const allStrings = Array.from({ length: invCount }, (_, invIdx) =>
              Array.from({ length: STRINGS_PER_INV }, (_, strIdx) =>
                getStringHealth(plant.id, invIdx, strIdx)
              )
            );

            const fleetFault = allStrings.flat().filter(s => s.status === 'fault').length;
            const fleetWarn  = allStrings.flat().filter(s => s.status === 'warn').length;
            const fleetOk    = allStrings.flat().filter(s => s.status === 'ok').length;
            const fleetTotal = fleetFault + fleetWarn + fleetOk;

            return (
              <>
                {/* Fleet summary badges */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Total Strings', val: fleetTotal, col: tx, bg: dk ? 'bg-slate-700/50' : 'bg-slate-100' },
                    { label: 'Normal',  val: fleetOk,    col: 'text-green-400',  bg: dk ? 'bg-green-900/20'  : 'bg-green-50'  },
                    { label: 'Warning', val: fleetWarn,  col: 'text-yellow-400', bg: dk ? 'bg-yellow-900/20' : 'bg-yellow-50' },
                    { label: 'Fault',   val: fleetFault, col: 'text-red-400',    bg: dk ? 'bg-red-900/20'    : 'bg-red-50'    },
                  ].map(b => (
                    <div key={b.label} className={`${b.bg} rounded-xl p-2.5 text-center border ${dk ? 'border-slate-600/50' : 'border-slate-200'}`}>
                      <p className={`text-lg font-bold ${b.col}`}>{b.val}</p>
                      <p className={`text-[9px] ${sub}`}>{b.label}</p>
                    </div>
                  ))}
                </div>

                {/* Health progress bar */}
                <div className="flex h-2 rounded-full overflow-hidden mb-4 gap-0.5">
                  <div style={{ width: `${(fleetOk    / fleetTotal) * 100}%` }} className="bg-green-500 rounded-full"/>
                  <div style={{ width: `${(fleetWarn  / fleetTotal) * 100}%` }} className="bg-yellow-500 rounded-full"/>
                  <div style={{ width: `${(fleetFault / fleetTotal) * 100}%` }} className="bg-red-500 rounded-full"/>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-4 text-[10px]">
                  {[
                    { col: 'bg-green-500/20 border-green-500/30 text-green-400', label: 'Normal  ≥ 92%' },
                    { col: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400', label: 'Degraded 63–92%' },
                    { col: 'bg-red-500/20 border-red-500/30 text-red-400', label: 'Fault  < 63%' },
                  ].map(l => (
                    <span key={l.label} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${l.col} font-semibold`}>{l.label}</span>
                  ))}
                </div>

                {/* Inverter grid */}
                <div className={`grid gap-3 ${invCount <= 2 ? 'grid-cols-2' : invCount <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {allStrings.map((strings, invIdx) => {
                    const invFault = strings.filter(s => s.status === 'fault').length;
                    const invWarn  = strings.filter(s => s.status === 'warn').length;
                    const avgCurrent = (strings.reduce((s, x) => s + x.currentA, 0) / strings.length).toFixed(1);
                    return (
                      <div key={invIdx} className={`rounded-xl border p-3 ${
                        invFault > 0
                          ? dk ? 'bg-red-900/15 border-red-700/40' : 'bg-red-50 border-red-200'
                          : invWarn > 0
                          ? dk ? 'bg-yellow-900/15 border-yellow-700/40' : 'bg-yellow-50 border-yellow-200'
                          : dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'
                      }`}>
                        {/* Inverter header */}
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className={`text-xs font-bold ${tx}`}>INV-{String(invIdx + 1).padStart(2, '0')}</p>
                            <p className={`text-[9px] ${sub}`}>avg {avgCurrent}A</p>
                          </div>
                          {invFault > 0 && (
                            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-md font-bold">
                              {invFault} fault
                            </span>
                          )}
                          {invFault === 0 && invWarn > 0 && (
                            <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-md font-bold">
                              {invWarn} warn
                            </span>
                          )}
                          {invFault === 0 && invWarn === 0 && (
                            <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-md font-bold">
                              ✓ OK
                            </span>
                          )}
                        </div>

                        {/* String heatmap grid — 2 rows × 5 cols */}
                        <div className="grid grid-cols-5 gap-1">
                          {strings.map((s, strIdx) => {
                            const healthPct = Math.round((s.currentA / s.expectedA) * 100);
                            return (
                              <div key={strIdx}
                                title={`STR-${String(strIdx + 1).padStart(2, '0')}: ${s.currentA}A / ${s.expectedA}A (${healthPct}%)`}
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-md py-1.5 cursor-pointer hover:scale-110 transition-transform border ${
                                  s.status === 'fault'
                                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                    : s.status === 'warn'
                                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                                    : 'bg-green-500/15 border-green-500/30 text-green-400'
                                }`}>
                                <span className="text-[9px] font-bold leading-none">{strIdx + 1}</span>
                                <span className="text-[7px] leading-none opacity-70">{healthPct}%</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Mini current bar */}
                        <div className={`mt-2 h-1 rounded-full overflow-hidden ${dk ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${(parseFloat(avgCurrent) / 9.5) * 100}%`,
                              background: invFault > 0 ? '#ef4444' : invWarn > 0 ? '#f59e0b' : '#22c55e',
                            }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fault detail list */}
                {fleetFault > 0 && (
                  <div className={`mt-4 rounded-xl border p-3.5 ${dk ? 'bg-red-900/15 border-red-700/40' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3"/>
                      Fault Strings — ต้องตรวจสอบทันที
                    </p>
                    <div className="space-y-1">
                      {allStrings.flatMap((strings, invIdx) =>
                        strings
                          .map((s, strIdx) => ({ ...s, invIdx, strIdx }))
                          .filter(s => s.status === 'fault')
                          .map(s => (
                            <div key={`${s.invIdx}-${s.strIdx}`} className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-red-400">
                                INV-{String(s.invIdx + 1).padStart(2, '0')} · STR-{String(s.strIdx + 1).padStart(2, '0')}
                              </span>
                              <span className={sub}>
                                {s.currentA}A / {s.expectedA}A → {Math.round((s.currentA / s.expectedA) * 100)}% ({Math.round((1 - s.currentA / s.expectedA) * 100)}% below)
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <button onClick={() => setShowStringLevel(false)} className="mt-4 w-full py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition">Close</button>
        </div>
      </div>
    )}
    </>
  );
};

export default FleetOverviewPage;