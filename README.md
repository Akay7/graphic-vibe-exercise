# Graphic Vibe Exercise

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** and hover a chart.

What you'll see:

- **Two identical charts, one above the other.** The top one is the custom
  version, the bottom one is the Highcharts version.
- Each chart sits in a pink table row with a pale yellow **Cost** area, a green
  **ROI confirmed** curve, a purple **Conversions** line with square markers,
  and short blue **CPA** bars along the bottom.
- **Hovering** a date shows faint colored halos on its points and a white
  tooltip with the date and all four values. The green curve turns thin while
  its point is the one closest to the pointer.
- Moving the pointer away hides the tooltip after half a second.

> Already had a dev server running before `npm install`? Restart it
> (`npx vite --force`) so Vite picks up Highcharts.

`npm run build` produces a static build in `dist/`.

---

## Description

A time-series combo chart (area spline, bars, spline and line on one shared
date axis, with a shared hover tooltip) rebuilt to match the reference
recording `diagram.gif`. It comes in two interchangeable versions that take
the same config:

1. **Custom**: `TimeSeriesChart`, hand-built SVG with `d3-scale`.
2. **Highcharts**: `createHighchartsComboChart`, the same chart configured in
   [Highcharts](https://www.highcharts.com/).

### Config (shared by both versions)

```js
const config = {
  dates: ['10.06.2026', '11.06.2026', '12.06.2026', '13.06.2026', '14.06.2026'],
  height: 296, // optional plot height in px
  series: [
    { key: 'cost', label: 'Cost', type: 'areaspline', color: '#fff593', yAxis: 'money',
      data: [2.04, 25.85, 44.36, 55.65, 63.75], format: (v) => v.toFixed(2) },
    { key: 'cpa', label: 'CPA', type: 'bar', color: '#3470fe', yAxis: 'money',
      data: [0.68, 0.86, 1.23, 0.79, 0.71], format: (v) => v.toFixed(2) },
    { key: 'roi', label: 'ROI confirmed', type: 'spline', color: '#0c8400',
      data: [610.78, 180.5, 161.47, 56.33, 357.25], format: (v) => v.toFixed(2) },
    { key: 'conversions', label: 'Conversions', type: 'line', color: '#b500fe',
      data: [3, 30, 36, 70, 90] },
  ],
};
```

Series fields:

| Field | Required | Meaning |
|---|---|---|
| `key` | yes | Unique id |
| `label` | yes | Name shown in the tooltip |
| `type` | yes | `'area'` \| `'areaspline'` \| `'spline'` \| `'line'` \| `'bar'` |
| `color` | yes | Line/fill/bar color and tooltip dot |
| `data` | yes | One number per date (same length as `dates`) |
| `format` | no | `(value) => string` for the tooltip; defaults to 2 decimals (integers as-is) |
| `yAxis` | no | Axis id. Series with the same id share one scale; otherwise each series gets its own |
| `fillOpacity` | no | Area fill opacity (default `0.5`) |

Every axis starts at 0 and ends at a rounded max (about 3 steps of
1/2/2.5/4/5×10ⁿ), so the demo's axes top out at 75 (Cost + CPA), 750 (ROI) and
120 (Conversions). CPA shares the currency axis with Cost, which is why its
bars stay only a few pixels tall, as in the recording.

### Version 1: custom

```js
import { TimeSeriesChart } from './src/chart/TimeSeriesChart.js';

const chart = new TimeSeriesChart('#chart', config);
chart.update({ series: newSeries }); // re-render with changed config
chart.destroy();
```

The chart fills its container's width and redraws on resize.

### Version 2: Highcharts

```js
import { createHighchartsComboChart } from './src/highcharts/createHighchartsComboChart.js';

const chart = createHighchartsComboChart('#chart', config); // Highcharts.Chart instance
```

Highcharts is free for personal and non-commercial use; commercial use needs a
[Highcharts license](https://www.highcharts.com/license).

### Behaviour matched from the recording

- Points sit in the middle of each date's band, and a thin grey frame surrounds the plot.
- Hovering a date shows a translucent halo on every line and area point, with a
  small white-rimmed marker (circle for the area, diamond for the spline,
  square for the line), and a white tooltip listing all four values.
- The tooltip sits beside the point (left side preferred), vertically centred on
  the pointer, slides between dates and fades out 0.5 s after the pointer leaves.
- The ROI spline switches to a thin line while its point is the one nearest the
  pointer.

### Sample data

`src/data/generate-sample-data.js` returns the five data points shown in the
recording. `generateSampleData({ days })` resamples the same shape onto a
different number of days.

### Project layout

```
src/
  chart/
    TimeSeriesChart.js  — version 1: rendering + hover
    axis.js             — shared axis grouping and max rounding
    tooltip.js          — shared tooltip placement and markup
    chart.css           — chart and tooltip styles (tooltip styles are used by both versions)
  highcharts/
    createHighchartsComboChart.js — version 2
  data/
    generate-sample-data.js — demo dataset (the values shown in diagram.gif)
  main.js                 — mounts both versions
  style.css                — demo page chrome (table row around the charts)
index.html                  — demo page
```
