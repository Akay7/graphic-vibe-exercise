// Reconstructed from the reference recording (diagram.gif): each point below
// matches a value read directly off its tooltip, in date order.
export const dates = ['10.06.2026', '11.06.2026', '12.06.2026', '13.06.2026', '14.06.2026'];

export const series = [
  {
    key: 'cost',
    label: 'Cost',
    type: 'area',
    color: '#f1c542',
    data: [2.04, 25.85, 44.36, 55.65, 64.2],
    format: (v) => `$${v.toFixed(2)}`,
  },
  {
    key: 'cpa',
    label: 'CPA',
    type: 'bar',
    color: '#4285f4',
    data: [0.68, 0.86, 1.23, 0.79, 0.91],
    format: (v) => `$${v.toFixed(2)}`,
  },
  {
    key: 'roi',
    label: 'ROI confirmed',
    type: 'spline',
    color: '#2e8b3d',
    data: [610.78, 180.5, 161.47, 56.33, 248.9],
    format: (v) => v.toFixed(2),
  },
  {
    key: 'conversions',
    label: 'Conversions',
    type: 'line',
    color: '#9c27b0',
    data: [3, 30, 36, 70, 92],
    format: (v) => String(v),
  },
];
