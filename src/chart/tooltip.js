// Tooltip helpers shared by the custom and Highcharts versions, so both
// place and render the tooltip the same way the reference recording does.

const LEFT_GAP = 32;
const RIGHT_GAP = 16;
const EDGE = 16;

/**
 * Beside the hovered point (left side preferred), vertically centred on the
 * pointer and kept inside the plot. When the pointer is right at the top or
 * bottom edge, or neither side has room, the tooltip is centred over the
 * point and placed above the pointer instead.
 */
export function placeTooltip({ pointX, mouseY, tipWidth, tipHeight, width, height }) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const fitsLeft = pointX - LEFT_GAP - tipWidth >= 0;
  const fitsRight = pointX + RIGHT_GAP + tipWidth <= width;

  if ((fitsLeft || fitsRight) && mouseY >= EDGE && mouseY <= height - EDGE) {
    return {
      left: fitsLeft ? pointX - LEFT_GAP - tipWidth : pointX + RIGHT_GAP,
      top: clamp(mouseY - tipHeight / 2, 0, height - tipHeight),
    };
  }
  return {
    left: clamp(pointX - tipWidth / 2, 0, width - tipWidth),
    top: mouseY - EDGE - tipHeight >= 0 ? mouseY - EDGE - tipHeight : mouseY + EDGE,
  };
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Tooltip markup, styled by the .tsc-tooltip-* rules in chart.css. */
export function tooltipHtml(date, rows) {
  const rowsHtml = rows
    .map(
      ({ color, label, value }) =>
        `<div class="tsc-tooltip-row">` +
        `<span class="tsc-tooltip-dot" style="background:${escapeHtml(color)}"></span>` +
        `${escapeHtml(label)}: <b class="tsc-tooltip-value">${escapeHtml(value)}</b>` +
        `</div>`
    )
    .join('');
  return `<div class="tsc-tooltip-body"><div class="tsc-tooltip-date">${escapeHtml(date)}</div>${rowsHtml}</div>`;
}
