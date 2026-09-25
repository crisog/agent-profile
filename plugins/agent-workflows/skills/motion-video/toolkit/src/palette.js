export const COLOR = {
  background: '#202020',
  accent: '#26E693',
  white: '#FFFFFF',
  ink: '#111111'
};

export const FONT = {
  display: "'Helvetica Neue', Arial, sans-serif",
  ui: "'Helvetica Neue', Arial, sans-serif"
};

export function mixColor(from, to, amount) {
  const parse = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const weight = Math.min(1, Math.max(0, amount));
  const channel = (a, b) => Math.round(a + (b - a) * weight);
  return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`;
}
