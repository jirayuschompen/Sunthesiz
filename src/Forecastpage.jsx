import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Sun, Zap, Thermometer, FlaskConical, Cpu, CheckCircle, Loader
} from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════════
// SIMULATED DATA + FORECAST ENGINE
// ─────────────────────────────────────────────────────────────────────────────
// ข้อมูลในหน้านี้เป็นข้อมูลจำลอง (deterministic — เปิดกี่ครั้งก็ได้ค่าเดิม) สร้างจาก
//   พลังงาน = กำลังติดตั้ง × รังสีรายวัน × จำนวนวัน × PR
// โดยใช้ค่ารังสีอาทิตย์/อุณหภูมิตามฤดูกาลของไทย (หน้าแล้ง/ฝน), การแกว่งของสภาพอากาศ,
// ผล derate จากอุณหภูมิ, การเสื่อมของแผง 0.5%/ปี และมี 1 เดือนที่ผลผลิตตกจากเหตุขัดข้อง
// เมื่อมีข้อมูลจริง/โมเดลจริง ให้แทน buildHistory() และ runModel() ด้วยข้อมูลจาก Firebase
// ═════════════════════════════════════════════════════════════════════════════
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PLANT_KWP = 140; // kWp — ปรับให้ตรงกับโรงไฟฟ้าจริงได้
const CLIMATE = [
  { ghi:5.2, t:27.6, sd:0.04 }, { ghi:5.9, t:29.0, sd:0.04 }, { ghi:6.2, t:30.6, sd:0.04 },
  { ghi:6.2, t:31.6, sd:0.05 }, { ghi:5.6, t:30.6, sd:0.07 }, { ghi:5.1, t:29.8, sd:0.08 },
  { ghi:4.9, t:29.4, sd:0.08 }, { ghi:4.8, t:29.2, sd:0.08 }, { ghi:4.6, t:28.8, sd:0.08 },
  { ghi:4.6, t:28.6, sd:0.07 }, { ghi:4.8, t:28.0, sd:0.05 }, { ghi:4.9, t:26.8, sd:0.04 },
];
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (r) => Math.max(-1.8, Math.min(1.8, (r() + r() + r() + r() - 2) * 1.732));
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const addMonths = (y, m, k) => { const t = y * 12 + m + k; return { year: Math.floor(t / 12), month: t % 12 }; };

const buildHistory = (now = new Date(), count = 36) => {
  const rng = mulberry32(20260101);
  const end = addMonths(now.getFullYear(), now.getMonth(), -1);
  const outageIdx = 17;
  return Array.from({ length: count }, (_, i) => {
    const { year, month } = addMonths(end.year, end.month, i - (count - 1));
    const c = CLIMATE[month], days = dim(year, month);
    const ghi = c.ghi * (1 + gauss(rng) * c.sd * 0.45);
    const t = c.t + gauss(rng) * 0.6 + (year - 2024) * 0.15;
    const gDay = (ghi * 1000) / 12;
    const pr = (0.88 - 0.0038 * (t + 0.03 * gDay - 25)) * (1 - 0.005 * (i / 12)) * (1 + gauss(rng) * 0.006);
    let demand = PLANT_KWP * ghi * days * pr;
    if (i === outageIdx) demand *= 0.91;
    return { year, month, days, label: `${MONTHS[month]} ${String(year).slice(2)}`,
      demand: Math.round(demand), glob_avg: +gDay.toFixed(1), t_amb: +t.toFixed(1) };
  });
};

const FIREBASE_MODELS = [
  { id:'lstm_model', label:'LSTM', desc:'Univariate (P_Grid / demand)', w:0.62, mv:false, nf:0.028 },
  { id:'cnn_lstm_model', label:'CNN-LSTM', desc:'CNN feature extractor + LSTM', w:0.70, mv:false, nf:0.024 },
  { id:'tft_model', label:'TFT', desc:'Temporal Fusion Transformer', w:0.80, mv:false, nf:0.018 },
  { id:'tft_model_multivariate', label:'TFT Multivariate', desc:'TFT + GlobHor + T_Amb features', w:0.85, mv:true, nf:0.012 },
];
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
const wmean = (xs) => { const w = xs.map((_, i) => i + 1); return xs.reduce((s, x, i) => s + x * w[i], 0) / w.reduce((a, b) => a + b, 0); };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

const predict = (train, modelId, steps, salt = 0) => {
  const model = FIREBASE_MODELS.find(m => m.id === modelId);
  const rng = mulberry32(hash(modelId) + salt);
  const last = train[train.length - 1];
  const l12 = sum(train.slice(-12).map(r => r.demand)), p12 = sum(train.slice(-24, -12).map(r => r.demand));
  const level = p12 > 0 ? Math.min(1.07, Math.max(0.93, l12 / p12)) : 1;
  const wmaDaily = wmean(train.slice(-6).map(r => r.demand / r.days));
  const yieldF = sum(train.slice(-12).map(r => r.demand)) / sum(train.slice(-12).map(r => r.glob_avg * r.days));
  return Array.from({ length: steps }, (_, h) => {
    const { year, month } = addMonths(last.year, last.month, h + 1);
    const days = dim(year, month);
    const same = train.filter(r => r.month === month);
    const seasonal = wmean(same.map(r => r.demand / r.days)) * days * (1 + (level - 1) * 0.5);
    const wma = wmaDaily * days;
    let base;
    if (model.mv) {
      const physical = yieldF * (sum(same.map(r => r.glob_avg)) / same.length) * days;
      base = model.w * (0.5 * seasonal + 0.5 * physical) + (1 - model.w) * wma;
    } else base = model.w * seasonal + (1 - model.w) * wma;
    base *= 1 + (rng() - 0.5) * 2 * model.nf;
    return { year, month, days, label: `${MONTHS[month]} ${String(year).slice(2)}`, value: Math.round(base) };
  });
};

const runModel = (hist, modelId, steps = 6, hold = 6) => {
  const bt = predict(hist.slice(0, -hold), modelId, hold, 1);
  const act = hist.slice(-hold);
  const mape = (sum(act.map((a, i) => Math.abs(a.demand - bt[i].value) / a.demand)) / hold) * 100;
  const rmse = Math.sqrt(sum(act.map((a, i) => (a.demand - bt[i].value) ** 2)) / hold);
  const fc = predict(hist, modelId, steps, 2).map((f, i) => {
    const ci = 1.96 * rmse * Math.sqrt(1 + 0.08 * i);
    return { ...f, upper: Math.round(f.value + ci), lower: Math.max(0, Math.round(f.value - ci)) };
  });
  return { backtest: bt, fc, mape, rmse };
};

// ─────────────────────────────────────────────────────────────────────────────
const Forecast = ({ theme, currentLang, setShowForecastModal }) => {
  const [selectedModel, setSelectedModel] = useState('tft_model_multivariate');
  const [chartData,     setChartData]     = useState(null);
  const [fcRows,        setFcRows]        = useState([]);
  const [status,        setStatus]        = useState('idle');
  const [metrics,       setMetrics]       = useState({ mape:'—', rmse:'—', interval:'—', inferenceMs:'—' });

  const activeData = useMemo(() => buildHistory(), []);
  const dark  = theme === 'dark';
  const model = FIREBASE_MODELS.find(m => m.id === selectedModel);
  const first = activeData[0];
  const lastH = activeData[activeData.length - 1];

  const colors = {
    actual:   '#26df9b', forecast: dark?'#ffe70e':'#ff9f0e',
    band:     dark?'#38e1ff':'#1fbfff', backtest: dark?'#c4b5fd':'#8b5cf6',
    grid:     dark?'#334155':'#e2e8f0', text: dark?'#94a3b8':'#64748b',
    ttBg:     dark?'#1e293b':'#fff',    ttText:dark?'#fff':'#0f172a',
    bar:      dark?'#38bdf8':'#3b82f6',
  };

  // KPI stats — rolling last 12 months, with YoY vs the 12 months before
  const stats = useMemo(() => {
    const d12  = activeData.slice(-12);
    const p12  = activeData.slice(-24, -12);
    const sum  = (xs, k) => xs.reduce((s, r) => s + r[k], 0);
    const total = sum(d12, 'demand');
    const yoy   = p12.length ? ((total / sum(p12, 'demand')) - 1) * 100 : null;
    const peak  = d12.reduce((a, b) => b.demand > a.demand ? b : a, d12[0]);
    return {
      total: total.toLocaleString(),
      yoy: yoy == null ? null : `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}% YoY`,
      peak: peak.label,
      gAvg: (sum(d12, 'glob_avg') / d12.length).toFixed(0),
      tAvg: (sum(d12, 't_amb') / d12.length).toFixed(1),
      last12: d12,
    };
  }, [activeData]);

  // ── Run forecast: 6-month hold-out backtest → metrics, then 6-month forecast ──
  const runForecast = async () => {
    setStatus('running');
    await new Promise(r => setTimeout(r, 650));
    const t0 = performance.now();
    const { backtest, fc, mape, rmse } = runModel(activeData, selectedModel, 6, 6);

    const hist = activeData.map((d, i) => {
      const b = i >= activeData.length - 6 ? backtest[i - (activeData.length - 6)] : null;
      return { label: d.label, actual: d.demand, backtest: b ? b.value : null,
               forecast: null, band: null };
    });
    // join the forecast line to the last actual point
    hist[hist.length - 1] = { ...hist[hist.length - 1],
      forecast: lastH.demand, band: [lastH.demand, lastH.demand] };
    const future = fc.map(f => ({ label: f.label, actual: null, backtest: null,
      forecast: f.value, band: [f.lower, f.upper] }));

    setChartData([...hist, ...future]);
    setFcRows(fc);
    setMetrics({
      mape: `${mape.toFixed(1)}%`,
      rmse: `${Math.round(rmse).toLocaleString()} kWh`,
      interval: '95% PI',
      inferenceMs: `${Math.round(performance.now() - t0)}ms`,
    });
    setStatus('done');
  };

  const resetForecast = () => {
    setChartData(null); setFcRows([]); setStatus('idle');
    setMetrics({ mape:'—', rmse:'—', interval:'—', inferenceMs:'—' });
  };

  const displayData = chartData ?? activeData.map(d => ({ label: d.label, actual: d.demand, backtest: null, forecast: null, band: null }));
  const card  = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const card2 = dark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200';
  const tt = { backgroundColor:colors.ttBg, border:`1px solid ${colors.grid}`, borderRadius:'8px', color:colors.ttText };
  const fmtKwh = (v) => Array.isArray(v)
    ? `${Math.round(v[0]).toLocaleString()} – ${Math.round(v[1]).toLocaleString()} kWh`
    : (v != null ? `${Math.round(v).toLocaleString()} kWh` : '—');

  return (
    <div className="space-y-6">
      <div className={`${card} rounded-xl shadow-sm border p-6`}>

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${dark?'text-white':'text-slate-800'}`}>
              {currentLang?.demandForecasting ?? 'Solar Energy Forecasting'}
            </h2>
            <p className={`mt-1 text-sm ${dark?'text-slate-400':'text-slate-500'}`}>
              SANKO Solar PV · {PLANT_KWP} kWp · ข้อมูลจำลองรายเดือน {first.label} – {lastH.label} ({activeData.length} เดือน)
            </p>
          </div>
          <button onClick={() => setShowForecastModal?.(true)}
            className="self-start bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
            {currentLang?.generateForecast ?? 'Generate Forecast'}
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon:<Zap className="w-4 h-4"/>,         label:'Energy (last 12 mo)', value:`${stats.total} kWh`, sub:stats.yoy, c:'blue'   },
            { icon:<Sun className="w-4 h-4"/>,          label:'Peak Month',          value:stats.peak,           sub:'highest yield', c:'yellow' },
            { icon:<Sun className="w-4 h-4"/>,          label:'Avg Irradiance',      value:`${stats.gAvg} W/m²`, sub:'daytime mean',  c:'orange' },
            { icon:<Thermometer className="w-4 h-4"/>,  label:'Avg Temp',            value:`${stats.tAvg} °C`,   sub:'ambient',       c:'red'    },
          ].map(({ icon, label, value, sub, c }) => (
            <div key={label} className={`rounded-lg p-3 border ${
              c==='blue'  ?(dark?'bg-blue-900/30 border-blue-700'  :'bg-blue-50 border-blue-200')
              :c==='yellow'?(dark?'bg-yellow-900/30 border-yellow-700':'bg-yellow-50 border-yellow-200')
              :c==='orange'?(dark?'bg-orange-900/30 border-orange-700':'bg-orange-50 border-orange-200')
              :             (dark?'bg-red-900/30 border-red-700'   :'bg-red-50 border-red-200')}`}>
              <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${
                c==='blue'?'text-blue-400':c==='yellow'?'text-yellow-400':c==='orange'?'text-orange-400':'text-red-400'}`}>
                {icon}{label}
              </div>
              <p className={`text-lg font-bold ${dark?'text-white':'text-slate-800'}`}>{value}</p>
              {sub && <p className={`text-[10px] mt-0.5 ${dark?'text-slate-400':'text-slate-500'}`}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Model + Metrics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <p className={`text-sm font-semibold mb-2 ${dark?'text-slate-300':'text-slate-700'}`}>
              เลือกโมเดล Firebase ML
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FIREBASE_MODELS.map(m => (
                <button key={m.id} onClick={() => { setSelectedModel(m.id); resetForecast(); }}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedModel===m.id
                      ?(dark?'border-blue-500 bg-blue-900/40':'border-blue-500 bg-blue-50')
                      :(dark?'border-slate-600 bg-slate-700 hover:border-slate-500':'border-slate-200 hover:border-slate-300')}`}>
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-4 h-4 flex-shrink-0 ${selectedModel===m.id?'text-blue-400':(dark?'text-slate-500':'text-slate-400')}`} />
                    <div className="min-w-0">
                      <p className={`font-semibold text-xs truncate ${selectedModel===m.id?(dark?'text-blue-300':'text-blue-700'):(dark?'text-white':'text-slate-800')}`}>{m.label}</p>
                      <p className={`text-xs truncate ${dark?'text-slate-400':'text-slate-500'}`}>{m.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={runForecast}
              disabled={status==='running'}
              className={`mt-3 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                status==='running'
                  ?'bg-slate-600 text-slate-400 cursor-not-allowed opacity-60'
                  :'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'}`}>
              {status==='running'
                ?<><Loader className="w-4 h-4 animate-spin"/>กำลังพยากรณ์ด้วย {model?.label}...</>
                :status==='done'
                ?<><CheckCircle className="w-4 h-4"/>รันโมเดลใหม่</>
                :<><Cpu className="w-4 h-4"/>Run {model?.label} Forecast</>}
            </button>
          </div>

          {/* Metrics panel — measured on a 6-month hold-out backtest */}
          <div className={`${card2} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <p className={`text-sm font-semibold ${dark?'text-slate-300':'text-slate-700'}`}>Forecast Metrics</p>
            </div>
            <div className="space-y-2.5">
              {[
                { label:'MAPE',     value:metrics.mape,        vc:status==='done'?'text-green-400':'' },
                { label:'RMSE',     value:metrics.rmse,        vc:status==='done'?'text-green-400':'' },
                { label:'Interval', value:metrics.interval,    vc:'' },
                { label:'Time',     value:metrics.inferenceMs, vc:'' },
                { label:'Model',    value:model?.label??'—',   vc:dark?'text-blue-300':'text-blue-600' },
                { label:'Backtest', value:'6-mo hold-out',     vc:'' },
              ].map(({ label, value, vc }) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className={dark?'text-slate-400':'text-slate-500'}>{label}:</span>
                  <span className={`font-semibold truncate max-w-[120px] ${vc||(dark?'text-white':'text-slate-800')}`} title={value}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Chart ── */}
        <div className="h-[380px] w-full">
          <p className={`text-xs font-semibold mb-2 ${dark?'text-slate-400':'text-slate-500'}`}>
            Monthly Energy Yield (kWh) + AI Forecast 6 Months
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} margin={{ top:5, right:10, bottom:5, left:10 }}>
              <defs>
                <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colors.actual} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={colors.actual} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="label" stroke={colors.text} tick={{ fill:colors.text, fontSize:10 }}
                interval="preserveStartEnd" minTickGap={18} />
              <YAxis stroke={colors.text} tick={{ fill:colors.text, fontSize:11 }}
                domain={[(min) => Math.floor((min * 0.85) / 1000) * 1000, (max) => Math.ceil((max * 1.05) / 1000) * 1000]}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={tt} formatter={(v, name) => [fmtKwh(v), name]} />
              <Legend />
              {status==='done' && (
                <ReferenceLine x={lastH.label}
                  stroke={dark?'#64748b':'#94a3b8'} strokeDasharray="4 4"
                  label={{ value:'▶ Forecast', fill:dark?'#94a3b8':'#64748b', fontSize:10 }} />
              )}
              <Area type="monotone" dataKey="band" name="95% Interval" stroke="none"
                fill={colors.band} fillOpacity={0.18} connectNulls />
              <Area type="monotone" dataKey="actual" name="Actual" stroke={colors.actual}
                fill="url(#gAct)" strokeWidth={2.5} connectNulls />
              <Line type="monotone" dataKey="backtest" name="Backtest (hold-out)" stroke={colors.backtest}
                strokeWidth={2} strokeDasharray="5 4" dot={{ r:3 }} connectNulls />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke={colors.forecast}
                strokeWidth={2.5} dot={{ r:3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Forecast table ── */}
        {status==='done' && fcRows.length > 0 && (
          <div className="mt-6">
            <p className={`text-xs font-semibold mb-2 ${dark?'text-slate-400':'text-slate-500'}`}>
              Forecast Detail — {model?.label}
            </p>
            <div className={`overflow-x-auto rounded-lg border ${dark?'border-slate-700':'border-slate-200'}`}>
              <table className="w-full text-xs">
                <thead className={dark?'bg-slate-700/60 text-slate-300':'bg-slate-50 text-slate-600'}>
                  <tr>
                    {['Month','Forecast (kWh)','95% Range (kWh)','vs same month last year'].map(h => (
                      <th key={h} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fcRows.map(f => {
                    const prev = activeData.find(r => r.month === f.month && r.year === f.year - 1);
                    const d = prev ? ((f.value / prev.demand) - 1) * 100 : null;
                    return (
                      <tr key={f.label} className={`border-t ${dark?'border-slate-700 text-slate-200':'border-slate-100 text-slate-700'}`}>
                        <td className="px-3 py-2 font-semibold">{f.label}</td>
                        <td className="px-3 py-2">{f.value.toLocaleString()}</td>
                        <td className="px-3 py-2">{f.lower.toLocaleString()} – {f.upper.toLocaleString()}</td>
                        <td className={`px-3 py-2 font-medium ${d == null ? '' : d >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {d == null ? '—' : `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Bar breakdown (last 12 months) ── */}
        <div className="mt-6">
          <p className={`text-xs font-semibold mb-2 ${dark?'text-slate-400':'text-slate-500'}`}>
            Feature Breakdown (last 12 months): Energy vs Irradiance vs Temperature
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last12} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="label" stroke={colors.text} tick={{ fill:colors.text, fontSize:10 }} />
                <YAxis yAxisId="l" stroke={colors.text} tick={{ fill:colors.text, fontSize:10 }}
                  tickFormatter={v => v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                <YAxis yAxisId="r" orientation="right" stroke={colors.text} tick={{ fill:colors.text, fontSize:10 }} />
                <Tooltip contentStyle={tt} />
                <Legend />
                <Bar yAxisId="l" dataKey="demand"   name="Energy (kWh)"    fill={colors.bar} radius={[3,3,0,0]} />
                <Bar yAxisId="r" dataKey="glob_avg" name="GlobHor (W/m²)"  fill="#f59e0b" radius={[3,3,0,0]} fillOpacity={0.8} />
                <Bar yAxisId="r" dataKey="t_amb"    name="T_Amb (°C)"      fill="#f87171" radius={[3,3,0,0]} fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Forecast;