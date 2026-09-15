// Deterministic PRNG (mulberry32) so a given seed always produces the same
// dataset — useful for demos/screenshots without hardcoding the data itself.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Generates a plausible 4-series dataset shaped like the reference design:
 * cost climbing, ROI dipping mid-range then recovering, conversions
 * climbing, and CPA fluctuating near a small baseline. Same `seed` always
 * produces the same numbers.
 */
export function generateSampleData({ days = 9, startDate = new Date(2026, 5, 10), seed = 42 } = {}) {
  const rand = mulberry32(seed);
  const mid = (days - 1) / 2;

  const dates = [];
  const cost = [];
  const cpa = [];
  const roi = [];
  const conversions = [];

  let costAcc = rand() * 3;
  let convAcc = 1 + rand() * 3;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date));

    costAcc += 4 + rand() * 10 + i * 0.6;
    cost.push(round2(costAcc));

    cpa.push(round2(0.6 + rand() * 0.7));

    const t = (i - mid) / mid; // -1 at the start, +1 at the end
    const roiBase = 60 + 550 * t * t; // U-shape: high at both edges, low in the middle
    roi.push(Math.max(10, round2(roiBase + (rand() - 0.5) * 30)));

    convAcc += 3 + rand() * 10 + i * 1.2;
    conversions.push(Math.round(convAcc));
  }

  const series = [
    {
      key: 'cost',
      label: 'Cost',
      type: 'area',
      color: '#f1c542',
      data: cost,
      format: (v) => `$${v.toFixed(2)}`,
    },
    {
      key: 'cpa',
      label: 'CPA',
      type: 'bar',
      color: '#4285f4',
      data: cpa,
      format: (v) => `$${v.toFixed(2)}`,
    },
    {
      key: 'roi',
      label: 'ROI confirmed',
      type: 'spline',
      color: '#2e8b3d',
      data: roi,
      format: (v) => v.toFixed(2),
    },
    {
      key: 'conversions',
      label: 'Conversions',
      type: 'line',
      color: '#9c27b0',
      data: conversions,
      format: (v) => String(v),
    },
  ];

  return { dates, series };
}
