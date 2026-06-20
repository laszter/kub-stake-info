"use client";

import { useState } from "react";
import type { BlocksProducedSeries } from "@/lib/explorer";

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
const PAD = { t: 14, r: 12, b: 22, l: 34 };
const INNER_W = W - PAD.l - PAD.r;
const INNER_H = H - PAD.t - PAD.b;

/**
 * Blocks-produced-per-hour line chart for the last 24h. The smooth line and axes
 * are plain SVG themed through `var(--color-*)` tokens (so they flip with dark
 * mode); a tiny bit of client state drives a tooltip that reveals an hour's count
 * on mouse hover *or* keyboard focus — each hour is a focusable target, so Tab
 * walks through them and screen readers announce the value.
 */
export function BlocksProducedChart({ counts, bucketStarts, to }: BlocksProducedSeries) {
  const [active, setActive] = useState<number | null>(null);

  const n = counts.length;
  const total = counts.reduce((a, b) => a + b, 0);
  const peak = Math.max(...counts, 0);
  const avg = Math.round(total / n);
  const yMax = niceMax(peak);

  const x = (i: number) => PAD.l + (n === 1 ? 0 : (i / (n - 1)) * INNER_W);
  const y = (v: number) => PAD.t + (1 - v / yMax) * INNER_H;
  const baseY = PAD.t + INNER_H;

  const pts = counts.map((v, i) => ({ x: x(i), y: y(v) }));
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L${x(n - 1).toFixed(2)},${baseY} L${x(0).toFixed(2)},${baseY} Z`;

  // De-duplicate: a tiny yMax (e.g. 1) collapses 0/mid/max into repeats, which
  // would otherwise draw overlapping gridlines with duplicate React keys.
  const yTicks = [...new Set([0, Math.round(yMax / 2), yMax])];
  const xTicks = [0, 6, 12, 18, n - 1];
  const step = n > 1 ? INNER_W / (n - 1) : INNER_W;

  /** Short axis tick: "now" for the past hour, else hours-before-now. */
  const agoLabel = (i: number) =>
    i === n - 1 ? "now" : `${Math.round((to - bucketStarts[i]) / 3_600_000)}h`;
  /** Phrase for tooltip / screen reader. */
  const whenLabel = (i: number) =>
    i === n - 1 ? "Past hour" : `${Math.round((to - bucketStarts[i]) / 3_600_000)}h ago`;

  return (
    <figure className="mt-3">
      <div className="relative" onMouseLeave={() => setActive(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="group"
          aria-label={`Blocks produced per hour over the last 24 hours: ${total.toLocaleString(
            "en-US",
          )} total, averaging ${avg} per hour, peaking at ${peak}.`}
        >
          <defs>
            <linearGradient id="bpc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* horizontal gridlines + y labels */}
          {yTicks.map((t) => (
            <g key={t} aria-hidden>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-line)"
                strokeWidth={1}
              />
              <text
                x={PAD.l - 6}
                y={y(t) + 3.5}
                textAnchor="end"
                fontSize={11}
                fill="var(--color-ink-muted)"
                className="tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}

          {/* x labels */}
          {xTicks.map((i) => (
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

          {/* series */}
          <path d={areaPath} fill="url(#bpc-fill)" aria-hidden />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            aria-hidden
          />

          {/* active hour: guideline + enlarged marker */}
          {active !== null && (
            <g aria-hidden>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD.t}
                y2={baseY}
                stroke="var(--color-brand)"
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={x(active)}
                cy={y(counts[active])}
                r={4}
                fill="var(--color-brand)"
                stroke="var(--color-card)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* resting dots (hidden under the marker for the active hour) */}
          {counts.map((v, i) =>
            i === active ? null : (
              <circle key={i} cx={x(i)} cy={y(v)} r={2} fill="var(--color-brand)" aria-hidden />
            ),
          )}

          {/* focusable / hoverable per-hour hit areas drive the tooltip */}
          {counts.map((_, i) => (
            <rect
              key={i}
              x={x(i) - step / 2}
              y={PAD.t}
              width={step}
              height={INNER_H}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${counts[i].toLocaleString("en-US")} blocks, ${
                i === n - 1 ? "in the past hour" : `${Math.round((to - bucketStarts[i]) / 3_600_000)} hours ago`
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
              top: `${(y(counts[active]) / H) * 100}%`,
              transform: `translate(${
                active === 0 ? "0" : active === n - 1 ? "-100%" : "-50%"
              }, calc(-100% - 8px))`,
            }}
            role="status"
          >
            <div className="font-semibold tabular-nums text-ink">
              {counts[active].toLocaleString("en-US")} blocks
            </div>
            <div className="text-ink-muted">{whenLabel(active)}</div>
          </div>
        )}
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        <span>
          Total{" "}
          <b className="font-semibold tabular-nums text-ink">
            {total.toLocaleString("en-US")}
          </b>
        </span>
        <span>
          Avg <b className="font-semibold tabular-nums text-ink">{avg}</b>/hr
        </span>
        <span>
          Peak <b className="font-semibold tabular-nums text-ink">{peak}</b>/hr
        </span>
      </figcaption>
    </figure>
  );
}
