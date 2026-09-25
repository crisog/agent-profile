const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, { className, style, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (style) {
    Object.assign(node.style, style);
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  for (const [name, value] of Object.entries(attrs ?? {})) {
    node.setAttribute(name, value);
  }
  for (const child of children) {
    node.appendChild(child);
  }
  return node;
}

export function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, String(value));
  }
  for (const child of children) {
    node.appendChild(child);
  }
  return node;
}

export function layer(parent, { zIndex, background } = {}) {
  const node = el('div', {
    style: {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '1920px',
      height: '1080px',
      overflow: 'hidden',
      zIndex: String(zIndex ?? 0),
      background: background ?? 'transparent'
    }
  });
  parent.appendChild(node);
  return node;
}

export function setVisible(node, isVisible) {
  const display = isVisible ? '' : 'none';
  if (node.style.display !== display) {
    node.style.display = display;
  }
}

export function place(node, { x = 0, y = 0, z = 0, scale = 1, scaleX, scaleY, rotate = 0, rotateX = 0, rotateY = 0, skewX = 0, opacity }) {
  const sx = scaleX ?? scale;
  const sy = scaleY ?? scale;
  const parts = [`translate3d(${x}px, ${y}px, ${z}px)`];
  if (rotateY !== 0) {
    parts.push(`rotateY(${rotateY}deg)`);
  }
  if (rotateX !== 0) {
    parts.push(`rotateX(${rotateX}deg)`);
  }
  if (rotate !== 0) {
    parts.push(`rotate(${rotate}deg)`);
  }
  if (skewX !== 0) {
    parts.push(`skewX(${skewX}deg)`);
  }
  if (sx !== 1 || sy !== 1) {
    parts.push(`scale(${sx}, ${sy})`);
  }
  node.style.transform = parts.join(' ');
  if (opacity !== undefined) {
    node.style.opacity = String(opacity);
  }
}

export function impulse(time, start, { frequency, decay }) {
  if (time < start) {
    return 0;
  }
  const elapsed = time - start;
  return Math.exp(-elapsed / decay) * Math.sin(2 * Math.PI * frequency * elapsed);
}

export function measure(node, stage) {
  const stageRect = stage.getBoundingClientRect();
  const ratio = stageRect.width / 1920;
  const rect = node.getBoundingClientRect();
  return {
    x: (rect.left - stageRect.left) / ratio,
    y: (rect.top - stageRect.top) / ratio,
    width: rect.width / ratio,
    height: rect.height / ratio
  };
}

export function glyphInk({ char, fontFamily, fontSize, fontWeight = 600 }) {
  const context = document.createElement('canvas').getContext('2d');
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(char);
  const left = -metrics.actualBoundingBoxLeft;
  const right = metrics.actualBoundingBoxRight;
  const top = -metrics.actualBoundingBoxAscent;
  const bottom = metrics.actualBoundingBoxDescent;
  return { advance: metrics.width, left, right, top, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2, width: right - left, height: bottom - top };
}

const SHUTTER_SECONDS = 1 / 120;
const FEATHER_SAMPLE_SECONDS = 1 / 480;
const FEATHER_MIN_PX = 2;
const FEATHER_SHUTTER_FRACTION = 0.3;

export function edgeFeather(radiusAt, time) {
  const speed = Math.abs(radiusAt(time + FEATHER_SAMPLE_SECONDS) - radiusAt(time - FEATHER_SAMPLE_SECONDS)) / (2 * FEATHER_SAMPLE_SECONDS);
  return FEATHER_MIN_PX + speed * SHUTTER_SECONDS * FEATHER_SHUTTER_FRACTION;
}

export function circleMask(node, { x, y, radius, feather }) {
  const inner = Math.max(0, radius - feather / 2);
  const outer = Math.max(inner + 0.01, radius + feather / 2);
  const image = `radial-gradient(circle ${outer}px at ${x}px ${y}px, #000 ${inner}px, transparent ${outer}px)`;
  node.style.maskImage = image;
  node.style.webkitMaskImage = image;
  node.style.maskRepeat = 'no-repeat';
  node.style.webkitMaskRepeat = 'no-repeat';
}

export function clearMask(node) {
  node.style.maskImage = 'none';
  node.style.webkitMaskImage = 'none';
}

export function coverRadius(point) {
  return Math.max(Math.hypot(point.x, point.y), Math.hypot(1920 - point.x, point.y), Math.hypot(point.x, 1080 - point.y), Math.hypot(1920 - point.x, 1080 - point.y));
}
