import Highcharts from 'highcharts';
import { axisIdOf, buildAxes } from '../chart/axis.js';
import { placeTooltip, tooltipHtml } from '../chart/tooltip.js';

const HIGHCHARTS_TYPE = {
  area: 'area',
  areaspline: 'areaspline',
  spline: 'spline',
  line: 'line',
  bar: 'column',
};

const DEFAULT_FORMAT = (value) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

// Marker that is hidden until its point is hovered, then drawn with a white rim.
const hoverOnlyMarker = (symbol, radius) => ({
  enabled: false,
  symbol,
  radius,
  lineWidth: 2,
  lineColor: '#ffffff',
  states: { hover: { radius, lineWidth: 2 } },
});

function toHighchartsSeries(s, axisIds) {
  const base = {
    type: HIGHCHARTS_TYPE[s.type],
    name: s.label,
    color: s.color,
    data: s.data,
    yAxis: axisIds.indexOf(axisIdOf(s)),
    custom: { format: s.format ?? DEFAULT_FORMAT },
  };

  switch (s.type) {
    case 'area':
    case 'areaspline':
      return { ...base, lineWidth: 2, fillOpacity: s.fillOpacity ?? 0.5, marker: hoverOnlyMarker('circle', 4.5) };
    case 'spline':
      // Thin line while hovered (see thinHoveredSplines).
      return { ...base, lineWidth: 5, marker: hoverOnlyMarker('diamond', 5), states: { hover: { lineWidth: 1.5 } } };
    case 'line':
      return {
        ...base,
        lineWidth: 2,
        marker: {
          enabled: true,
          symbol: 'square',
          radius: 6,
          lineWidth: 0,
          lineColor: '#ffffff',
          states: { hover: { radius: 3.5, lineWidth: 2 } },
        },
      };
    case 'bar':
      // Bars never take hover (they would steal it from the lines near the
      // bottom); their value is still listed by the tooltip formatter.
      return {
        ...base,
        pointPadding: 0,
        groupPadding: 0.36,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ffffff',
        enableMouseTracking: false,
      };
    default:
      throw new Error(`createHighchartsComboChart: unsupported series type "${s.type}"`);
  }
}

/**
 * Highcharts version of the combo chart. Takes the same config as
 * `TimeSeriesChart` ({ dates, series, height }) and returns the Highcharts
 * chart instance.
 *
 * @param {HTMLElement|string} container - element or CSS selector to mount into
 */
export function createHighchartsComboChart(container, { dates, series, height = 296 }) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) throw new Error('createHighchartsComboChart: container not found');

  const axes = buildAxes(series);
  const axisIds = axes.map((a) => a.id);

  const chart = Highcharts.chart(el, {
    chart: {
      height,
      margin: 0,
      backgroundColor: 'transparent',
      plotBorderWidth: 2,
      plotBorderColor: '#cdcccc',
      style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif" },
    },
    accessibility: { enabled: false },
    credits: { enabled: false },
    legend: { enabled: false },
    title: { text: undefined },
    xAxis: { categories: dates, visible: false },
    yAxis: axes.map(({ id, max }) => ({
      id,
      visible: false,
      min: 0,
      max,
      startOnTick: false,
      endOnTick: false,
    })),
    tooltip: {
      shared: true,
      outside: true,
      useHTML: true,
      hideDelay: 500,
      padding: 0,
      borderWidth: 0,
      borderRadius: 6,
      backgroundColor: '#ffffff',
      formatter() {
        const { index, series: hoveredSeries } = this.points[0].point ?? this.points[0];
        return tooltipHtml(
          dates[index],
          hoveredSeries.chart.series.map((hs) => ({
            color: hs.color,
            label: hs.name,
            value: hs.userOptions.custom.format(hs.userOptions.data[index]),
          }))
        );
      },
      positioner(tipWidth, tipHeight, point) {
        const { left, top } = placeTooltip({
          pointX: point.plotX,
          mouseY: point.plotY,
          tipWidth,
          tipHeight,
          width: this.chart.plotWidth,
          height: this.chart.plotHeight,
        });
        // Outside tooltips draw the label `distance` px inside their container.
        return { x: left - this.distance, y: top - this.distance };
      },
    },
    plotOptions: {
      series: {
        animation: false,
        states: {
          hover: { lineWidthPlus: 0, halo: { size: 19, opacity: 0.25 } },
          inactive: { enabled: false },
        },
      },
    },
    series: series.map((s) => toHighchartsSeries(s, axisIds)),
  });

  thinHoveredSplines(chart);
  return chart;
}

// Highcharts gives hover to a single series per date, but the reference thins
// the spline whenever its point is the one nearest the pointer, so drive that
// state from the pointer position.
function thinHoveredSplines(chart) {
  const splines = chart.series.filter((hs) => hs.type === 'spline');

  Highcharts.addEvent(chart.container, 'mousemove', (e) => {
    const mouseY = chart.pointer.normalize(e).chartY - chart.plotTop;
    let nearest = null;
    for (const point of chart.hoverPoints ?? []) {
      if (!nearest || Math.abs(point.plotY - mouseY) < Math.abs(nearest.plotY - mouseY)) {
        nearest = point;
      }
    }
    for (const hs of splines) hs.setState(nearest?.series === hs ? 'hover' : '');
  });
  Highcharts.addEvent(chart.container, 'mouseleave', () => {
    for (const hs of splines) hs.setState('');
  });
}
