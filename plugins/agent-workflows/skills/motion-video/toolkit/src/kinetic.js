import { el } from './dom.js';
import { easeIn, easeOut, progress } from './motion.js';

const MASK_PAD_TOP_EM = 0.1;
const MASK_PAD_BOTTOM_EM = 0.16;
const MASK_PAD_SIDE_EM = 0.06;

export function createMaskedLetters({ text, fontFamily, fontSize, fontWeight = 600, color, letterSpacing = '-0.02em', colors = {} }) {
  const root = el('div', {
    style: {
      display: 'inline-flex',
      whiteSpace: 'pre',
      overflow: 'hidden',
      lineHeight: '1',
      fontFamily,
      fontSize: `${fontSize}px`,
      fontWeight: String(fontWeight),
      letterSpacing,
      color,
      padding: `${MASK_PAD_TOP_EM}em ${MASK_PAD_SIDE_EM}em ${MASK_PAD_BOTTOM_EM}em`,
      margin: `-${MASK_PAD_TOP_EM}em -${MASK_PAD_SIDE_EM}em -${MASK_PAD_BOTTOM_EM}em`
    }
  });
  const letters = [...text].map((char, index) => {
    const node = el('span', { text: char, style: { display: 'inline-block', color: colors[index] ?? color, willChange: 'transform' } });
    root.appendChild(node);
    return node;
  });
  return { root, letters };
}

export function riseOffset(time, { start, index, stagger, duration }) {
  const begin = start + index * stagger;
  return 1 - easeOut(progress(time, begin, begin + duration));
}

export function leaveOffset(time, { start, index, stagger, duration }) {
  const begin = start + index * stagger;
  return easeIn(progress(time, begin, begin + duration));
}

export function applyRoll(letters, time, { enter, exit }) {
  letters.forEach((node, index) => {
    const incoming = enter ? riseOffset(time, { ...enter, index }) : 0;
    const outgoing = exit ? leaveOffset(time, { ...exit, index }) : 0;
    const offsetPercent = (incoming - outgoing) * 118;
    const skew = enter ? -10 * incoming : 0;
    node.style.transform = `translateY(${offsetPercent}%) skewX(${skew}deg)`;
  });
}
