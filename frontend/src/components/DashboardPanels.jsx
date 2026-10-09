import { useId } from "react";
import Icon from "./Icon.jsx";

/* Shared building blocks for the three role dashboards: the stat card, the
   range-switched trend panel and the status donut. Hand-rolled SVG because the
   frontend deliberately ships no chart dependency. */

export const SERIES = {
  blue: "#58a6ff",
  amber: "#fb8500",
  green: "#3ddc8b",
  purple: "#b5a8ff",
  teal: "#4fd8d1",
  red: "#ff6b6b",
  grey: "#5f6b7f",
};

const DAY = 86400000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const dayLabel = (d) => `${d.getDate()} ${MON[d.getMonth()]}`;

// Contiguous past buckets ending at "now", one per range option in the panel.
export function buckets(range) {
  const today = startOfDay(new Date());
  if (range === "Yearly") {
    return [-2, -1, 0].map((k) => ({
      label: String(today.getFullYear() + k),
      from: new Date(today.getFullYear() + k, 0, 1),
      to: new Date(today.getFullYear() + k + 1, 0, 1),
    }));
  }
  if (range === "Monthly") {
    return Array.from({ length: 6 }, (_, i) => {
      const from = addMonths(today, i - 5);
      return { label: MON[from.getMonth()], from, to: addMonths(from, 1) };
    });
  }
  if (range === "Weekly") {
    return Array.from({ length: 8 }, (_, i) => {
      const from = startOfDay(addDays(today, -7 * (7 - i)));
      return { label: dayLabel(from), from, to: addDays(from, 7) };
    });
  }
  return Array.from({ length: 7 }, (_, i) => {
    const from = addDays(today, i - 6);
    return { label: DOW[from.getDay()], from, to: addDays(from, 1) };
  });
}

export function countByBucket(rows, bs, filter = () => true) {
  return bs.map((b) => rows.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return filter(r) && t >= b.from.getTime() && t < b.to.getTime();
  }).length);
}

export function sumByBucket(rows, bs, pick, filter = () => true) {
  return bs.map((b) => rows.reduce((n, r) => {
    const t = new Date(r.createdAt).getTime();
    return filter(r) && t >= b.from.getTime() && t < b.to.getTime() ? n + pick(r) : n;
  }, 0));
}

export function StatCard({ icon, color = "blue", label, value, foot, footColor, trend, dir = "up" }) {
  return (
    <div className={`stat-card sc-${color}`}>
      <span className={`stat-icon solid-${color}`}><Icon name={icon} size={19} /></span>
      <span className="stat-text">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {foot && <span className={`stat-foot${footColor ? ` foot-${footColor}` : ""}`}>{foot}</span>}
        {trend && <span className={`stat-trend trend-${dir}`}>{dir === "up" ? "↑" : "↓"} {trend}</span>}
      </span>
    </div>
  );
}

export function RangeSwitch({ options, value, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={value === o ? "active" : ""}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const W = 600;
const H = 250;
const PAD = { top: 14, right: 12, bottom: 10, left: 12 };

function niceMax(v) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

function TrendChart({ series, labels }) {
  const uid = useId().replace(/:/g, "");
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const count = Math.max(...series.map((s) => s.points.length), 1);
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.points)));

  const x = (i) => PAD.left + (count === 1 ? innerW / 2 : (i * innerW) / (count - 1));
  const y = (v) => PAD.top + innerH - (v / max) * innerH;

  // Every 5th label at most, so the axis never collides with itself.
  const stride = Math.max(1, Math.ceil(labels.length / 6));
  const shown = labels.filter((_, i) => i % stride === 0 || i === labels.length - 1);

  return (
    <div className="chart-body">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.name} id={`${uid}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            className="chart-grid"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * f}
            y2={PAD.top + innerH * f}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {series.map((s) => {
          const line = s.points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
          const last = x(s.points.length - 1);
          const first = x(0);
          return (
            <g key={s.name}>
              <path className="chart-area" d={`${line} L${last},${PAD.top + innerH} L${first},${PAD.top + innerH} Z`} fill={`url(#${uid}-${s.name})`} />
              <path className="chart-line" d={line} stroke={s.color} vectorEffect="non-scaling-stroke" />
              {s.points.map((v, i) => (
                <circle key={i} className="chart-point" cx={x(i)} cy={y(v)} r="3" fill={s.color} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="chart-x">
        {shown.map((text, i) => <span key={i}>{text}</span>)}
      </div>
    </div>
  );
}

export function ChartLegend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((it) => (
        <span key={it.name}><i className="dot" style={{ background: it.color }} />{it.name}</span>
      ))}
    </div>
  );
}

export function ChartPanel({ title, icon = "chart", action, ranges, range, onRange, series, labels, emptyTitle, emptyText }) {
  const hasData = series.some((s) => s.points.some((v) => v > 0));
  return (
    <section className="panel">
      <div className="panel-head">
        <h3><Icon name={icon} size={17} />{title}</h3>
        {ranges ? <RangeSwitch options={ranges} value={range} onChange={onRange} /> : action}
      </div>
      <div className="panel-body">
        {hasData ? <TrendChart series={series} labels={labels} /> : (
          <div className="chart-empty">
            <Icon name="chart" size={26} />
            <strong>{emptyTitle || "No activity for this period."}</strong>
            {emptyText && <p>{emptyText}</p>}
          </div>
        )}
        <ChartLegend items={series.map((s) => ({ name: s.name, color: s.color }))} />
      </div>
    </section>
  );
}

const R = 70;
const C = 2 * Math.PI * R;

export function DonutPanel({ title, icon = "inbox", total, totalLabel, slices, action }) {
  const sum = slices.reduce((n, s) => n + s.value, 0) || 1;
  let offset = 0;
  return (
    <section className="panel">
      <div className="panel-head">
        <h3><Icon name={icon} size={17} />{title}</h3>
        {action}
      </div>
      <div className="panel-body">
        <div className="donut-wrap">
          <div className="donut">
            <svg viewBox="0 0 186 186" role="img">
              <g transform="rotate(-90 93 93)">
                <circle cx="93" cy="93" r={R} stroke="#1a212c" strokeWidth="26" />
                {slices.map((s) => {
                  const len = (s.value / sum) * C;
                  const el = (
                    <circle
                      key={s.label}
                      cx="93"
                      cy="93"
                      r={R}
                      stroke={s.color}
                      strokeWidth="26"
                      strokeDasharray={`${len} ${C - len}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += len;
                  return el;
                })}
              </g>
            </svg>
            <div className="donut-center">
              <span className="donut-total">{total ?? sum}</span>
              <span className="donut-cap">{totalLabel}</span>
            </div>
          </div>
          <ul className="donut-legend">
            {slices.map((s) => (
              <li key={s.label}>
                <i className="dot" style={{ background: s.color }} />
                <span>{s.label}</span>
                <span className="legend-value">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
