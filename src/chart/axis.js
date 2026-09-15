// Highcharts-style "nice" axis max: split the range into ~3 intervals using
// 1 / 2 / 2.5 / 4 / 5 × 10^n steps, then round up to a whole step. This is
// what makes the reference recording's axes top out at 75 / 120 / 750.
export function niceAxisMax(value, intervals = 3) {
  if (!(value > 0)) return 1;
  const raw = value / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 4, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  return Math.ceil(value / step) * step;
}

// Series that name the same `yAxis` share one scale; otherwise each series
// gets its own.
export function axisIdOf(series) {
  return series.yAxis ?? series.key;
}

export function buildAxes(series) {
  const maxById = new Map();
  for (const s of series) {
    const id = axisIdOf(s);
    maxById.set(id, Math.max(maxById.get(id) ?? 0, ...s.data));
  }
  return [...maxById].map(([id, max]) => ({ id, max: niceAxisMax(max) }));
}
