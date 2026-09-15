import { scaleLinear, scalePoint } from 'd3-scale';
import { line, area, curveMonotoneX, curveLinear } from 'd3-shape';
import { max, min } from 'd3-array';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFAULT_FORMAT = (value) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

/**
 * Renders a multi-series time chart supporting four series types — area,
 * spline, line, bar — sharing one date axis, each on its own y-scale so
 * series with very different magnitudes (e.g. cost vs. CPA) stay legible
 * side by side. Bar-type series render in a short band pinned to the
 * baseline, matching the tick-like bars in the reference design.
 *
 * @param {HTMLElement|string} container - element or CSS selector to mount into
 * @param {object} config
 * @param {string[]} config.dates - shared x-axis labels, one per data point
 * @param {object[]} config.series - [{ key, label, type, color, data, format? }]
 *   type: 'area' | 'spline' | 'line' | 'bar'
 *   data: number[] — same length as config.dates
 *   format: (value:number) => string — optional per-series value formatter
 * @param {number} [config.height=280]
 */
export class TimeSeriesChart {
  constructor(container, config) {
    this.container =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('TimeSeriesChart: container not found');
    this.config = config;

    this._buildSkeleton();
    this._resizeObserver = new ResizeObserver(() => this.render());
    this._resizeObserver.observe(this.container);
    this.render();
  }

  update(config) {
    this.config = { ...this.config, ...config };
    this.render();
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }

  _buildSkeleton() {
    this.container.classList.add('tsc-root');
    this.container.innerHTML = `
      <div class="tsc-wrap">
        <svg class="tsc-svg"></svg>
        <div class="tsc-tooltip" hidden>
          <div class="tsc-tooltip-date"></div>
          <div class="tsc-tooltip-rows"></div>
        </div>
      </div>
    `;
    this.wrapEl = this.container.querySelector('.tsc-wrap');
    this.svg = this.container.querySelector('.tsc-svg');
    this.tooltipEl = this.container.querySelector('.tsc-tooltip');
    this.tooltipDateEl = this.tooltipEl.querySelector('.tsc-tooltip-date');
    this.tooltipRowsEl = this.tooltipEl.querySelector('.tsc-tooltip-rows');
  }

  render() {
    const { series, dates } = this.config;
    const width = this.wrapEl.getBoundingClientRect().width || 600;
    const height = this.config.height || 280;
    const margin = { top: 16, right: 12, bottom: 24, left: 12 };
    const innerW = Math.max(width - margin.left - margin.right, 1);
    const innerH = Math.max(height - margin.top - margin.bottom, 1);
    const barBandH = innerH * 0.06;
    const mainH = innerH - barBandH;

    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.innerHTML = '';

    const g = el('g', { transform: `translate(${margin.left},${margin.top})` });
    this.svg.appendChild(g);

    const x = scalePoint().domain(dates).range([0, innerW]).padding(0.02);
    const points = dates.map((d) => x(d));

    const yScales = {};
    for (const s of series) {
      const lo = Math.min(0, min(s.data));
      const hi = (max(s.data) || 1) * 1.08;
      const band = s.type === 'bar' ? barBandH : mainH;
      yScales[s.key] = scaleLinear().domain([lo, hi]).range([band, 0]);
    }

    g.appendChild(
      el('line', {
        class: 'tsc-baseline',
        x1: 0,
        x2: innerW,
        y1: mainH,
        y2: mainH,
      })
    );

    for (const s of series) {
      this._drawSeries(g, s, points, yScales[s.key], mainH);
    }

    const overlay = el('rect', {
      x: 0,
      y: 0,
      width: innerW,
      height: innerH,
      fill: 'transparent',
      class: 'tsc-overlay',
    });
    g.appendChild(overlay);

    const crosshair = el('line', {
      class: 'tsc-crosshair',
      y1: 0,
      y2: innerH,
      visibility: 'hidden',
    });
    g.appendChild(crosshair);

    const hoverDots = {};
    for (const s of series) {
      if (s.type === 'bar') continue;
      hoverDots[s.key] = el('circle', {
        class: `tsc-hover-dot tsc-color-${s.key}`,
        r: 5,
        fill: s.color,
        visibility: 'hidden',
      });
      g.appendChild(hoverDots[s.key]);
    }

    this._hover = { x, points, dates, series, yScales, mainH, margin, crosshair, hoverDots, width };
    overlay.addEventListener('mousemove', (e) => this._onMouseMove(e));
    overlay.addEventListener('mouseleave', () => this._hideTooltip());
  }

  _drawSeries(g, s, points, y, mainH) {
    const yOffset = s.type === 'bar' ? mainH : 0;
    const coords = s.data.map((v, i) => [points[i], yOffset + y(v)]);

    if (s.type === 'area') {
      const areaGen = area()
        .curve(curveMonotoneX)
        .x((_, i) => points[i])
        .y0(yOffset + y(Math.min(0, min(s.data))))
        .y1((_, i) => yOffset + y(s.data[i]));
      g.appendChild(
        el('path', {
          d: areaGen(s.data),
          class: `tsc-area tsc-color-${s.key}`,
          fill: s.color,
        })
      );
      return;
    }

    if (s.type === 'spline' || s.type === 'line') {
      const lineGen = line()
        .curve(s.type === 'spline' ? curveMonotoneX : curveLinear)
        .x((d) => d[0])
        .y((d) => d[1]);
      g.appendChild(
        el('path', {
          d: lineGen(coords),
          class: `tsc-line tsc-color-${s.key} tsc-${s.type}`,
          stroke: s.color,
          fill: 'none',
        })
      );
      if (s.type === 'line') {
        const markerSize = 8;
        for (const [cx, cy] of coords) {
          g.appendChild(
            el('rect', {
              x: cx - markerSize / 2,
              y: cy - markerSize / 2,
              width: markerSize,
              height: markerSize,
              class: `tsc-marker tsc-color-${s.key}`,
              fill: s.color,
            })
          );
        }
      }
      return;
    }

    if (s.type === 'bar') {
      const barWidth = Math.max(6, (points[1] - points[0] || 20) * 0.4);
      for (const [cx, cy] of coords) {
        g.appendChild(
          el('rect', {
            x: cx - barWidth / 2,
            y: cy,
            width: barWidth,
            height: Math.max(yOffset - cy, 1),
            class: `tsc-bar tsc-color-${s.key}`,
            fill: s.color,
          })
        );
      }
    }
  }

  _onMouseMove(evt) {
    const { x, points, dates, series, yScales, mainH, margin, crosshair, hoverDots, width } =
      this._hover;
    const bounds = this.svg.getBoundingClientRect();
    const mouseX = evt.clientX - bounds.left - margin.left;

    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((px, i) => {
      const dist = Math.abs(px - mouseX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });

    const px = points[nearest];
    crosshair.setAttribute('x1', px);
    crosshair.setAttribute('x2', px);
    crosshair.setAttribute('visibility', 'visible');

    const rows = [];
    for (const s of series) {
      const yOffset = s.type === 'bar' ? mainH : 0;
      const value = s.data[nearest];
      const cy = yOffset + yScales[s.key](value);
      if (hoverDots[s.key]) {
        hoverDots[s.key].setAttribute('cx', px);
        hoverDots[s.key].setAttribute('cy', cy);
        hoverDots[s.key].setAttribute('visibility', 'visible');
      }
      const format = s.format || DEFAULT_FORMAT;
      rows.push(
        `<div class="tsc-tooltip-row">
          <span class="tsc-tooltip-dot" style="background:${s.color}"></span>
          <span class="tsc-tooltip-label">${s.label}:</span>
          <span class="tsc-tooltip-value">${format(value)}</span>
        </div>`
      );
    }

    this.tooltipDateEl.textContent = dates[nearest];
    this.tooltipRowsEl.innerHTML = rows.join('');
    this.tooltipEl.hidden = false;

    const wrapWidth = this.wrapEl.getBoundingClientRect().width;
    const tooltipWidth = this.tooltipEl.offsetWidth;
    const flip = px + margin.left + tooltipWidth + 16 > wrapWidth;
    const left = flip ? px + margin.left - tooltipWidth - 16 : px + margin.left + 16;
    this.tooltipEl.style.left = `${Math.max(8, left)}px`;
    this.tooltipEl.style.top = `${margin.top}px`;
  }

  _hideTooltip() {
    this.tooltipEl.hidden = true;
    this._hover.crosshair.setAttribute('visibility', 'hidden');
    for (const dot of Object.values(this._hover.hoverDots)) {
      dot.setAttribute('visibility', 'hidden');
    }
  }
}
