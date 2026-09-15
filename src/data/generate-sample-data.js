// Values read directly off the tooltips in the reference recording
// (diagram.gif), one per marker, in date order. These are the ground truth
// for the demo dataset — everything below reproduces or resamples them
// rather than inventing unrelated numbers.
const REFERENCE_START_DATE = new Date(2026, 5, 10); // 10.06.2026
const REFERENCE_POINTS = [
  { cost: 2.04, cpa: 0.68, roi: 610.78, conversions: 3 },
  { cost: 25.85, cpa: 0.86, roi: 180.5, conversions: 30 },
  { cost: 44.36, cpa: 1.23, roi: 161.47, conversions: 36 },
  { cost: 55.65, cpa: 0.79, roi: 56.33, conversions: 70 },
  { cost: 63.75, cpa: 0.71, roi: 357.25, conversions: 90 },
];

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Resamples the reference points onto `count` evenly spaced positions,
// linearly interpolating between the two nearest reference points.
function resample(count) {
  const lastIndex = REFERENCE_POINTS.length - 1;
  const out = [];
  for (let i = 0; i < count; i++) {
    const pos = count === 1 ? 0 : (i / (count - 1)) * lastIndex;
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, lastIndex);
    const t = pos - lo;
    const a = REFERENCE_POINTS[lo];
    const b = REFERENCE_POINTS[hi];
    out.push({
      cost: lerp(a.cost, b.cost, t),
      cpa: lerp(a.cpa, b.cpa, t),
      roi: lerp(a.roi, b.roi, t),
      conversions: lerp(a.conversions, b.conversions, t),
    });
  }
  return out;
}

/**
 * Generates the 4-series demo dataset. With no arguments it returns the
 * exact values shown at the 5 marker points in the reference recording.
 * Pass `days` to resample that same reference shape onto a different
 * number of evenly spaced points (e.g. for a longer daily series).
 */
export function generateSampleData({ days = REFERENCE_POINTS.length, startDate = REFERENCE_START_DATE } = {}) {
  const points = days === REFERENCE_POINTS.length ? REFERENCE_POINTS : resample(days);

  const dates = points.map((_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return formatDate(date);
  });

  const series = [
    {
      key: 'cost',
      label: 'Cost',
      type: 'area',
      color: '#fff0bf',
      data: points.map((p) => Math.round(p.cost * 100) / 100),
      format: (v) => `$${v.toFixed(2)}`,
    },
    {
      key: 'cpa',
      label: 'CPA',
      type: 'bar',
      color: '#4285f4',
      data: points.map((p) => Math.round(p.cpa * 100) / 100),
      format: (v) => `$${v.toFixed(2)}`,
    },
    {
      key: 'roi',
      label: 'ROI confirmed',
      type: 'spline',
      color: '#0c8400',
      data: points.map((p) => Math.round(p.roi * 100) / 100),
      format: (v) => v.toFixed(2),
    },
    {
      key: 'conversions',
      label: 'Conversions',
      type: 'line',
      color: '#b500fe',
      data: points.map((p) => Math.round(p.conversions)),
      format: (v) => String(v),
    },
  ];

  return { dates, series };
}
