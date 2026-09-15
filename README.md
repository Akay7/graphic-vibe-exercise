# Graphic Vibe Exercise

A dependency-light time-series combo chart that renders four series types —
**area**, **spline**, **line**, **bar** — on one shared date axis, with a
hover tooltip that lists every series' value at the nearest point. Built to
match the look and interaction of the reference recording (`diagram.gif`):
pale filled area, a thick dipping spline, a straight line with square
markers, and small bars pinned to the baseline, all surfaced through a
white rounded tooltip with a colored dot per metric.

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL (defaults to `http://localhost:5173`) and hover
the chart.

`npm run build` produces a static production build in `dist/`.

## Initializing the chart with your own data

The chart is a small class, `TimeSeriesChart`, that takes a container and a
config: a shared list of `dates` plus a `series` array. Each series picks
one of the four chart types and supplies one value per date.

```js
import { TimeSeriesChart } from './src/chart/TimeSeriesChart.js';

new TimeSeriesChart('#chart', {
  dates: ['10.06.2026', '11.06.2026', '12.06.2026', '13.06.2026', '14.06.2026'],
  height: 300, // optional, defaults to 280
  series: [
    {
      key: 'cost',           // unique id, used internally for styling/lookup
      label: 'Cost',         // shown in the tooltip
      type: 'area',          // 'area' | 'spline' | 'line' | 'bar'
      color: '#fff0bf',
      data: [2.04, 25.85, 44.36, 55.65, 63.75],
      format: (v) => `$${v.toFixed(2)}`, // optional; defaults to 2-decimal number
    },
    { key: 'cpa', label: 'CPA', type: 'bar', color: '#4285f4', data: [0.68, 0.86, 1.23, 0.79, 0.71] },
    { key: 'roi', label: 'ROI confirmed', type: 'spline', color: '#0c8400', data: [610.78, 180.5, 161.47, 56.33, 357.25] },
    { key: 'conversions', label: 'Conversions', type: 'line', color: '#b500fe', data: [3, 30, 36, 70, 90] },
  ],
});
```

Requirements on the data:

- `dates` and every series' `data` array must be the same length — one
  value per date.
- Exactly four series is what the reference design shows, but the chart
  itself doesn't enforce a count; it draws whatever series you pass, each
  using its own `type`.
- `area`, `spline`, and `line` share the main plot height, each scaled
  independently to its own min/max so series with very different
  magnitudes (e.g. `ROI confirmed` in the hundreds vs. `CPA` under 2) all
  stay legible. `bar` series render in a short band pinned to the x-axis,
  matching the tick-like bars in the reference.

`src/main.js` wires up a live example using `src/data/generate-sample-data.js`,
which returns the exact values read off the 5 marker tooltips in the
reference recording (`diagram.gif`), in date order. Call
`generateSampleData({ days })` with a different `days` count to resample
that same reference shape onto more or fewer evenly spaced points (linear
interpolation between the real anchor values) instead of typing out a
custom dataset.

## Project layout

```
src/
  chart/
    TimeSeriesChart.js  — the chart (rendering + hover/tooltip logic)
    chart.css           — chart-only styles (safe to reuse standalone)
  data/
    generate-sample-data.js — example 4-series dataset (real reconstructed values)
  main.js                 — demo bootstrap
  style.css                — demo page chrome (sidebar tiles, card background)
index.html                  — demo page
```
