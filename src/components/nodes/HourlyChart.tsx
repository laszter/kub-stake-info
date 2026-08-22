"use client";

import { useId, useState } from "react";

/** The 24-bucket shape every series on this chart shares. `BlocksProducedSeries`
    (`explorer.ts`) and `RewardSeries` (`rewards.ts`) are each assignable to it,
    which is why neither needs an adapter to be plotted. */
export type HourlySeries = {
  /** One value per bucket, oldest first (index 0 = 24h ago). */
  values: number[];
  /** Unix-ms start of each bucket, aligned 1:1 with `values`. */
  bucketStarts: number[];
  /** Anchor "now" — the timestamp the buckets were cut from. */
  to: number;
};

export type ChartSeries = {
  /** One value per bucket, oldest first. Every series must be the same length. */
  values: number[];
  /** Value → tooltip, legend and footer text. Also applied to the average, so a
      series of integers should round here rather than print "222.79 blocks/hr". */
  format: (v: number) => string;
  /** Value → y-axis tick. Usually terser than `format`; an axis has three labels
      and no room for four decimals. */
  formatTick: (v: number) => string;
  /** Unit noun for tooltip and screen-reader text: "blocks" · "KUB". */
  unit: string;
  /** Series name, for the legend, the footer and the accessible description. */
  name: string;
  /** CSS colour for this series' line, dots and axis labels. */
  color: string;
  /** Dash the stroke. Set on the second series so the two stay tellable apart
      without relying on colour alone. */
  dashed?: boolean;
  /** Soft area fill under the line. Deliberately off when two series overlay:
      two translucent fills stacked read as a third colour and hide the lines. */
  fill?: boolean;
};

export type HourlyChartProps = {
  /** One or two series. The first is scaled against the left axis, the second
      against its own scale on the right — the pair being compared here (blocks
      per hour vs KUB per hour) differ by two orders of magnitude, so a shared
      axis would flatten the smaller one onto the baseline. */
  series: ChartSeries[];
  /** Unix-ms start of each bucket, aligned 1:1 with every series' `values`. */
  bucketStarts: number[];
  /** Anchor "now" — the timestamp the buckets were cut from. */
  to: number;
  /** What the chart as a whole shows, for the group's accessible name. */
  title: string;
};

/** Round a peak up to a tidy axis maximum (1/2/5 × 10ⁿ) so the top gridline
    reads as a round number instead of e.g. 153. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Monotone cubic (Fritsch–Carlson) interpolation → a smooth curve that still
 * passes through every point and never overshoots the data, so the line can't
 * invent a dip below 0 or a phantom peak between hours.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;

  const dx: number[] = [];
  const slope: number[] = []; // secant slope of each segment
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  // Tangents: 0 at local extrema (sign change) to kill overshoot, else a
  // weighted harmonic mean of the neighbouring secant slopes.
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  m[n - 1] = slope[n - 2];

  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
}

/* SVG canvas, in user units — scaled to the container width via `w-full`. */
const W = 740;
const H = 184;
const PAD_T = 14;
const PAD_B = 22;
const PAD_L = 34;
/** Right gutter. A second series puts its axis labels there and needs the room;
    with one series the plot runs almost to the edge, as it always has. */
const PAD_R_BARE = 12;
const PAD_R_AXIS = 42;

/** Fractions of the plot height the gridlines sit at. Every series is scaled
    0→its own max over the same box, so one set of lines serves both axes: the
    left labels read series 0's scale and the right labels series 1's, and each
    label still lands exactly on a line. */
const GRID_FRACTIONS = [0, 0.5, 1];

/**
 * Hourly line chart for the last 24h — one series, or two overlaid on
 * independent y-axes.
 *
 * The smooth line and axes are plain SVG themed through `var(--color-*)` tokens
 * (so they flip with dark mode); a tiny bit of client state drives a tooltip
 * that reveals an hour's value on mouse hover *or* keyboard focus — each hour is
 * a focusable target, so Tab walks through them and screen readers announce
 * every series' value for that hour.
 *
 * Series are passed in rather than fetched: the same component draws blocks
 * produced, KUB paid out, and the two together, which differ only in how a value
 * is worded and scaled. Keeping that difference in the `ChartSeries` props is
 * what stops each view from becoming another copy of this file.
 */
export function HourlyChart({ series, bucketStarts, to, title }: HourlyChartProps) {
  const [active, setActive] = useState<number | null>(null);
  // Scoped so several charts' gradients can never collide on one document —
  // a hardcoded id would make whichever mounted second reuse the first's fill.
  const gradId = useId();

  const dual = series.length > 1;
  const padR = dual ? PAD_R_AXIS : PAD_R_BARE;
  const innerW = W - PAD_L - padR;
  const innerH = H - PAD_T - PAD_B;
  const baseY = PAD_T + innerH;

  const n = series[0].values.length;
  const x = (i: number) => PAD_L + (n === 1 ? 0 : (i / (n - 1)) * innerW);
  const step = n > 1 ? innerW / (n - 1) : innerW;

  // Per-series scale, summary and geometry. Each series owns its own yMax, which
  // is the whole point of the dual axis.
  const plots = series.map((s) => {
    const total = s.values.reduce((a, b) => a + b, 0);
    const peak = Math.max(...s.values, 0);
    const yMax = niceMax(peak);
    const y = (v: number) => PAD_T + (1 - v / yMax) * innerH;
    const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
    const line = smoothPath(pts);
    return {
      s,
      total,
      peak,
      avg: total / n,
      yMax,
      y,
      line,
      area: `${line} L${x(n - 1).toFixed(2)},${baseY} L${x(0).toFixed(2)},${baseY} Z`,
    };
  });

  /** Ticks for one axis, de-duplicated on the *rendered* label rather than the
      raw value: a tiny yMax (e.g. 1) puts the midpoint at 0.5, a distinct number
      that formats to the same "1" as the max once an integer series rounds it.
      Deduping here also keeps the React keys unique. */
  const ticksFor = (p: (typeof plots)[number]) => {
    const out: { frac: number; label: string }[] = [];
    for (const frac of GRID_FRACTIONS) {
      const label = p.s.formatTick(p.yMax * frac);
      if (!out.some((t) => t.label === label)) out.push({ frac, label });
    }
    return out;
  };

  /** Short axis tick: "now" for the past hour, else hours-before-now. */
  const agoLabel = (i: number) =>
    i === n - 1 ? "now" : `${Math.round((to - bucketStarts[i]) / 3_600_000)}h`;
  /** Phrase for tooltip / screen reader. */
  const whenLabel = (i: number) =>
    i === n - 1 ? "Past hour" : `${Math.round((to - bucketStarts[i]) / 3_600_000)}h ago`;

  /** "631 blocks and 4.99 KUB" — one hour across every series. */
  const valuesAt = (i: number) =>
    plots.map((p) => `${p.s.format(p.s.values[i])} ${p.s.unit}`).join(" and ");

  return (
    <figure className="mt-3">
      {dual && (
        <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          {plots.map((p) => (
            <span key={p.s.name} className="inline-flex items-center gap-1.5">
              <svg width="14" height="8" aria-hidden className="shrink-0">
                <line
                  x1="0"
                  y1="4"
                  x2="14"
                  y2="4"
                  stroke={p.s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={p.s.dashed ? "4 3" : undefined}
                />
              </svg>
              {p.s.name}
            </span>
          ))}
        </div>
      )}

      <div className="relative" onMouseLeave={() => setActive(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="group"
          aria-label={`${title} over the last 24 hours. ${plots
            .map(
              (p) =>
                `${p.s.name}: ${p.s.format(p.total)} ${p.s.unit} total, averaging ${p.s.format(
                  p.avg,
                )} per hour, peaking at ${p.s.format(p.peak)}.`,
            )
            .join(" ")}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0].color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={series[0].color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* gridlines — one set, shared by both axes */}
          {GRID_FRACTIONS.map((frac) => (
            <line
              key={frac}
              x1={PAD_L}
              x2={W - padR}
              y1={PAD_T + (1 - frac) * innerH}
              y2={PAD_T + (1 - frac) * innerH}
              stroke="var(--color-line)"
              strokeWidth={1}
              aria-hidden
            />
          ))}

          {/* left axis (series 0), and the right axis (series 1) when overlaid.
              Labels take their series' colour so it is unambiguous which scale
              belongs to which line. */}
          {plots.map((p, si) =>
            si > 1 ? null : (
              <g key={p.s.name} aria-hidden>
                {ticksFor(p).map((t) => (
                  <text
                    key={t.label}
                    x={si === 0 ? PAD_L - 6 : W - padR + 6}
                    y={PAD_T + (1 - t.frac) * innerH + 3.5}
                    textAnchor={si === 0 ? "end" : "start"}
                    fontSize={11}
                    fill={dual ? p.s.color : "var(--color-ink-muted)"}
                    className="tabular-nums"
                  >
                    {t.label}
                  </text>
                ))}
              </g>
            ),
          )}

          {/* x labels */}
          {[0, 6, 12, 18, n - 1].map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--color-ink-muted)"
              aria-hidden
            >
              {agoLabel(i)}
            </text>
          ))}

          {/* series: fill (single-series only), then line */}
          {plots.map((p) => (
            <g key={p.s.name} aria-hidden>
              {p.s.fill && <path d={p.area} fill={`url(#${gradId})`} />}
              <path
                d={p.line}
                fill="none"
                stroke={p.s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={p.s.dashed ? "5 4" : undefined}
              />
            </g>
          ))}

          {/* active hour: one guideline, a marker on every series */}
          {active !== null && (
            <g aria-hidden>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD_T}
                y2={baseY}
                stroke="var(--color-ink-muted)"
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {plots.map((p) => (
                <circle
                  key={p.s.name}
                  cx={x(active)}
                  cy={p.y(p.s.values[active])}
                  r={4}
                  fill={p.s.color}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {/* resting dots (hidden under the marker for the active hour) */}
          {plots.map((p) => (
            <g key={p.s.name} aria-hidden>
              {p.s.values.map((v, i) =>
                i === active ? null : (
                  <circle key={i} cx={x(i)} cy={p.y(v)} r={2} fill={p.s.color} />
                ),
              )}
            </g>
          ))}

          {/* focusable / hoverable per-hour hit areas drive the tooltip */}
          {series[0].values.map((_, i) => (
            <rect
              key={i}
              x={x(i) - step / 2}
              y={PAD_T}
              width={step}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${valuesAt(i)}, ${
                i === n - 1
                  ? "in the past hour"
                  : `${Math.round((to - bucketStarts[i]) / 3_600_000)} hours ago`
              }`}
              className="cursor-crosshair outline-none"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>

        {/* Tooltip — positioned over the chart in %, so it tracks the point at
            any container width. Lives in this svg-sized wrapper (not the figure)
            so the percentages aren't thrown off by the caption below. */}
        {active !== null && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-xs shadow-sm"
            style={{
              left: `${(x(active) / W) * 100}%`,
              // Hang off whichever series sits highest at this hour, so the
              // panel never lands on top of the other line.
              top: `${(Math.min(...plots.map((p) => p.y(p.s.values[active]))) / H) * 100}%`,
              transform: `translate(${
                active === 0 ? "0" : active === n - 1 ? "-100%" : "-50%"
              }, calc(-100% - 8px))`,
            }}
            role="status"
          >
            {plots.map((p) => (
              <div key={p.s.name} className="flex items-center gap-1.5">
                {dual && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: p.s.color }}
                    aria-hidden
                  />
                )}
                <span className="font-semibold tabular-nums text-ink">
                  {p.s.format(p.s.values[active])} {p.s.unit}
                </span>
              </div>
            ))}
            <div className={`text-ink-muted ${dual ? "mt-0.5" : ""}`}>
              {whenLabel(active)}
            </div>
          </div>
        )}
      </div>

      <figcaption className="mt-3 space-y-1 text-xs text-ink-muted">
        {plots.map((p) => (
          <div key={p.s.name} className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {dual && (
              <span className="inline-flex min-w-24 items-center gap-1.5 text-ink-soft">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: p.s.color }}
                  aria-hidden
                />
                {p.s.name}
              </span>
            )}
            <span>
              Total{" "}
              <b className="font-semibold tabular-nums text-ink">{p.s.format(p.total)}</b>
            </span>
            <span>
              Avg <b className="font-semibold tabular-nums text-ink">{p.s.format(p.avg)}</b>
              /hr
            </span>
            <span>
              Peak <b className="font-semibold tabular-nums text-ink">{p.s.format(p.peak)}</b>
              /hr
            </span>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}
