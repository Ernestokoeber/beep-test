import { createCourt, drawCourt } from './rendering.js';

export function createCourtStage(container, className) {
  const svg = createCourt(className);
  container.append(svg);
  return svg;
}

export function renderCourtStage(svg, snapshot, options = {}) {
  drawCourt(svg, snapshot, options);
  return svg;
}
