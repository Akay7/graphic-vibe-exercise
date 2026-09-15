import { scaleLinear } from 'd3-scale';
import { axisIdOf, buildAxes } from './axis.js';
import { placeTooltip, tooltipHtml } from './tooltip.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Sizes measured off the reference recording (diagram.gif), in its pixels.
const LINE_WIDTH = { area: 2, areaspline: 2, spline: 5, line: 2 };
const AREA_FILL_OPACITY = 0.5;
const SQUARE_MARKER_SIZE = 12;
const BAR_WIDTH_RATIO = 0.28;
const BAR_RADIUS = 5;
const HALO_RADIUS = 19;
const HALO_OPACITY = 0.25;
const TOOLTIP_HIDE_DELAY = 500;

const DEFAULT_FORMAT = (value) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function linearPath(coords) {
  return coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
}

// Port of Highcharts' spline smoothing (smoothing 1.5, control points clamped
// between neighbouring values so the curve never overshoots a data point).
function splinePath(coords) {
  const smoothing = 1.5;
  const denom = smoothing + 1;
  const rightControls = [];
  let d = '';
  coords.forEach(([x, y], i) => {
    const prev = coords[i - 1];
    const next = coords[i + 1];
    let leftX = x;
    let leftY = y;
    if (prev && next) {
      const [lastX, lastY] = prev;
      const [nextX, nextY] = next;
      leftX = (smoothing * x + lastX) / denom;
      leftY = (smoothing * y + lastY) / denom;
      const rightX = (smoothing * x + nextX) / denom;
      let rightY = (smoothing * y + nextY) / denom;
      if (rightX !== leftX) {
        const correction = ((rightY - leftY) * (rightX - x)) / (rightX - leftX) + y - rightY;
        leftY += correction;
        rightY += correction;
      }
      if (leftY > lastY && leftY > y) {
        leftY = Math.max(lastY, y);
        rightY = 2 * y - leftY;
      } else if (leftY < lastY && leftY < y) {
        leftY = Math.min(lastY, y);
        rightY = 2 * y - leftY;
      }
      if (rightY > nextY && rightY > y) {
        rightY = Math.max(nextY, y);
        leftY = 2 * y - rightY;
      } else if (rightY < nextY && rightY < y) {
        rightY = Math.min(nextY, y);
        leftY = 2 * y - rightY;
      }
      rightControls[i] = [rightX, rightY];
    }
    if (i === 0) {
      d = `M${x},${y}`;
      return;
    }
    const [c1x, c1y] = rightControls[i - 1] || prev;
    d += `C${c1x},${c1y} ${leftX},${leftY} ${x},${y}`;
  });
  return d;
}

function roundedTopBarPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return (
    `M${x},${y + height}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}` +
    `H${x + width - r}A${r},${r} 0 0 1 ${x + width},${y + r}V${y + height}Z`
  );
}

// Hovered-point marker: circle for areas, diamond for splines, square for lines.
function hoverMarker(type, x, y, color) {
  const attrs = { class: 'tsc-hover-marker', fill: color };
  if (type === 'line') {
    return el('rect', { ...attrs, x: x - 3.5, y: y - 3.5, width: 7, height: 7 });
  }
  if (type === 'spline') {
    return el('path', { ...attrs, d: `M${x},${y - 5}L${x + 5},${y}L${x},${y + 5}L${x - 5},${y}Z` });
  }
  return el('circle', { ...attrs, cx: x, cy: y, r: 4.5 });
}

/**
 * Renders a multi-series time chart supporting five series types — area,
 * areaspline, spline, line, bar — sharing one category date axis. Each series
 * is scaled on its own y-axis unless several name the same `yAxis` id (e.g.
 * Cost and CPA sharing a currency axis, which is why the CPA bars in the
 * reference stay only a few pixels tall).
 *
 * @param {HTMLElement|string} container - element or CSS selector to mount into
 * @param {object} config
 * @param {string[]} config.dates - shared x-axis labels, one per data point
 * @param {object[]} config.series - [{ key, label, type, color, data, format?, yAxis?, fillOpacity? }]
 *   type: 'area' | 'areaspline' | 'spline' | 'line' | 'bar'
 *   data: number[] — same length as config.dates
 *   format: (value:number) => string — optional per-series value formatter
 *   yAxis: string — optional axis id; series with the same id share a scale
 * @param {number} [config.height=296] - plot height in px
 */
export class TimeSeriesChart {
  constructor(container, config) {
    this.container =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('TimeSeriesChart: container not found');
    this.config = config;

    this._buildSkeleton();
    this.svg.addEventListener('mousemove', (e) => this._onPointerMove(e));
    this.svg.addEventListener('mouseleave', () => this._onPointerLeave());
    this._resizeObserver = new ResizeObserver(() => this.render());
    this._resizeObserver.observe(this.container);
    this.render();
  }

  update(config) {
    this.config = { ...this.config, ...config };
    this.render();
  }

  destroy() {
    clearTimeout(this._hideTimer);
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }

  _buildSkeleton() {
    this.container.classList.add('tsc-root');
    this.container.innerHTML = `
      <div class="tsc-wrap">
        <svg class="tsc-svg"></svg>
        <div class="tsc-tooltip"></div>
      </div>
    `;
    this.wrapEl = this.container.querySelector('.tsc-wrap');
    this.svg = this.container.querySelector('.tsc-svg');
    this.tooltipEl = this.container.querySelector('.tsc-tooltip');
  }

  render() {
    const { dates, series } = this.config;
    const width = this.wrapEl.clientWidth || 592;
    const height = this.config.height ?? 296;
    const band = width / dates.length;
    // Points sit in the middle of each date's band, like a category axis.
    const xs = dates.map((_, i) => (i + 0.5) * band);

    const yScales = new Map(
      buildAxes(series).map(({ id, max }) => [id, scaleLinear().domain([0, max]).range([height, 0])])
    );

    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.replaceChildren(
      el('rect', { class: 'tsc-hit', width, height }),
      el('rect', { class: 'tsc-frame', x: 1, y: 1, width: width - 2, height: height - 2 })
    );

    this._markers = {};
    this._linePaths = {};
    for (const s of series) {
      const y = yScales.get(axisIdOf(s));
      this._drawSeries(s, s.data.map((v, i) => [xs[i], y(v)]), height, band);
    }

    this.hoverLayer = el('g', { class: 'tsc-hover-layer' });
    this.svg.appendChild(this.hoverLayer);
    this._geometry = { xs, band, width, height, yScales };
    this._hoverIndex = null;
  }

  _drawSeries(s, coords, height, band) {
    const add = (tag, attrs) => this.svg.appendChild(el(tag, attrs));

    switch (s.type) {
      case 'area':
      case 'areaspline': {
        const top = s.type === 'area' ? linearPath(coords) : splinePath(coords);
        const firstX = coords[0][0];
        const lastX = coords[coords.length - 1][0];
        add('path', {
          class: 'tsc-area',
          d: `${top}L${lastX},${height}L${firstX},${height}Z`,
          fill: s.color,
          'fill-opacity': s.fillOpacity ?? AREA_FILL_OPACITY,
        });
        this._linePaths[s.key] = add('path', {
          class: `tsc-line tsc-${s.type}`,
          d: top,
          stroke: s.color,
          'stroke-width': LINE_WIDTH[s.type],
        });
        break;
      }

      case 'spline':
      case 'line':
        this._linePaths[s.key] = add('path', {
          class: `tsc-line tsc-${s.type}`,
          d: s.type === 'spline' ? splinePath(coords) : linearPath(coords),
          stroke: s.color,
          'stroke-width': LINE_WIDTH[s.type],
        });
        if (s.type === 'line') {
          this._markers[s.key] = coords.map(([x, y]) =>
            add('rect', {
              class: 'tsc-marker',
              x: x - SQUARE_MARKER_SIZE / 2,
              y: y - SQUARE_MARKER_SIZE / 2,
              width: SQUARE_MARKER_SIZE,
              height: SQUARE_MARKER_SIZE,
              fill: s.color,
            })
          );
        }
        break;

      case 'bar': {
        const barWidth = band * BAR_WIDTH_RATIO;
        for (const [x, y] of coords) {
          add('path', {
            class: 'tsc-bar',
            d: roundedTopBarPath(x - barWidth / 2, y, barWidth, height - y, BAR_RADIUS),
            fill: s.color,
          });
        }
        break;
      }

      default:
        throw new Error(`TimeSeriesChart: unsupported series type "${s.type}"`);
    }
  }

  _onPointerMove(evt) {
    const { xs, band } = this._geometry;
    const bounds = this.svg.getBoundingClientRect();
    const mouseX = evt.clientX - bounds.left;
    const mouseY = evt.clientY - bounds.top;
    const index = Math.min(xs.length - 1, Math.max(0, Math.floor(mouseX / band)));

    clearTimeout(this._hideTimer);
    if (index !== this._hoverIndex) {
      this._hoverIndex = index;
      this._drawHover(index);
      this._fillTooltip(index);
    }
    this._setHoveredSeries(index, mouseY);
    this._positionTooltip(xs[index], mouseY);
  }

  _onPointerLeave() {
    this._hoverIndex = null;
    this._resetHoverLayer();
    this._setHoveredSeries(null);
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(
      () => this.tooltipEl.classList.remove('tsc-tooltip-visible'),
      TOOLTIP_HIDE_DELAY
    );
  }

  _resetHoverLayer() {
    this.hoverLayer.replaceChildren();
    for (const markers of Object.values(this._markers)) {
      for (const marker of markers) marker.removeAttribute('visibility');
    }
  }

  _drawHover(index) {
    this._resetHoverLayer();
    const { xs, yScales } = this._geometry;
    const x = xs[index];
    const points = this.config.series
      .filter((s) => s.type !== 'bar')
      .map((s) => ({ s, y: yScales.get(axisIdOf(s))(s.data[index]) }));

    // All halos first so every marker sits above every halo.
    for (const { s, y } of points) {
      this.hoverLayer.appendChild(
        el('circle', {
          class: 'tsc-halo',
          cx: x,
          cy: y,
          r: HALO_RADIUS,
          fill: s.color,
          'fill-opacity': HALO_OPACITY,
        })
      );
    }
    for (const { s, y } of points) {
      this.hoverLayer.appendChild(hoverMarker(s.type, x, y, s.color));
      this._markers[s.key]?.[index]?.setAttribute('visibility', 'hidden');
    }
  }

  // The series whose point at this date is nearest the pointer is "hovered";
  // in the reference that makes the ROI spline switch to a thin line.
  _setHoveredSeries(index, mouseY) {
    let hoveredKey = null;
    if (index != null) {
      const { yScales } = this._geometry;
      let best = Infinity;
      for (const s of this.config.series) {
        if (s.type === 'bar') continue;
        const dist = Math.abs(yScales.get(axisIdOf(s))(s.data[index]) - mouseY);
        if (dist < best) {
          best = dist;
          hoveredKey = s.key;
        }
      }
    }
    for (const [key, path] of Object.entries(this._linePaths)) {
      path.classList.toggle('tsc-series-hover', key === hoveredKey);
    }
  }

  _fillTooltip(index) {
    const { dates, series } = this.config;
    this.tooltipEl.innerHTML = tooltipHtml(
      dates[index],
      series.map((s) => ({
        color: s.color,
        label: s.label,
        value: (s.format || DEFAULT_FORMAT)(s.data[index]),
      }))
    );
  }

  _positionTooltip(pointX, mouseY) {
    const { width, height } = this._geometry;
    const tip = this.tooltipEl;
    const { left, top } = placeTooltip({
      pointX,
      mouseY,
      tipWidth: tip.offsetWidth,
      tipHeight: tip.offsetHeight,
      width,
      height,
    });

    // Slide between points once visible; appear in place the first time.
    tip.classList.toggle('tsc-tooltip-animate', tip.classList.contains('tsc-tooltip-visible'));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.classList.add('tsc-tooltip-visible');
  }
}
