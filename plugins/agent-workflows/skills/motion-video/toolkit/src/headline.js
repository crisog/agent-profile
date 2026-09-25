import { el, setVisible } from './dom.js';
import { applyRoll, createMaskedLetters } from './kinetic.js';
import { ROLL } from './timing.js';

const PROBE_SIZE = 100;

export function fitFontSize({ lines, fontFamily, fontWeight = 600, maxWidth, maxSize }) {
  const context = document.createElement('canvas').getContext('2d');
  context.font = `${fontWeight} ${PROBE_SIZE}px ${fontFamily}`;
  const widest = Math.max(...lines.map((line) => context.measureText(line).width));
  return Math.min(maxSize, Math.floor((maxWidth / widest) * PROBE_SIZE));
}

export function textWidth({ text, fontFamily, fontWeight = 600, fontSize }) {
  const context = document.createElement('canvas').getContext('2d');
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
}

export function createHeadline(parent, { lines, top, left = 0, width, fontSize, fontFamily, color, colorAt = () => color, lineHeight = 1.04, align = 'center', start, end }) {
  const holder = el('div', { style: { position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px` } });
  const letters = [];
  lines.forEach((line, lineIndex) => {
    const colors = Object.fromEntries([...line].map((_, index) => [index, colorAt(lineIndex, index)]));
    const { root, letters: lineLetters } = createMaskedLetters({ text: line, fontFamily, fontSize, color, colors });
    const row = el('div', {
      style: { display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start', alignItems: 'flex-start', height: `${fontSize * lineHeight}px` }
    }, [root]);
    holder.appendChild(row);
    letters.push(...lineLetters);
  });
  parent.appendChild(holder);
  const exitSeconds = ROLL.exit.duration + ROLL.exit.stagger * letters.length;

  return {
    holder,
    height: lines.length * fontSize * lineHeight,
    render(time) {
      const isActive = time >= start - 0.001 && (end === undefined || time <= end + exitSeconds);
      setVisible(holder, isActive);
      if (isActive) {
        applyRoll(letters, time, { enter: { start, ...ROLL.enter }, exit: end === undefined ? undefined : { start: end, ...ROLL.exit } });
      }
    }
  };
}
