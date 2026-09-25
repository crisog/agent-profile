import { el, layer } from '../dom.js';
import { createHeadline } from '../headline.js';
import { lerp, spring, track } from '../motion.js';
import { COLOR, FONT } from '../palette.js';
import { COPY, CUE, WIDTH } from '../timing.js';

const TITLE = COPY.find((entry) => entry.id === 'title');
const TITLE_LEFT = 160;
const TITLE_TOP = 360;
const TITLE_SIZE = 150;
const DOT_SIZE = 80;
const DOT_Y = 760;
const DOT_X = track([
  { at: 0, value: 160 },
  { at: CUE.moveStart, value: 1680, duration: 0.9, bounce: 0.15 },
  { at: CUE.moveStart + 0.35, value: 1200, duration: 0.7, bounce: 0.2 }
]);

export function createExampleScene(stage) {
  const root = layer(stage, { zIndex: 10, background: COLOR.background });
  const title = createHeadline(root, {
    lines: TITLE.lines,
    top: TITLE_TOP,
    left: TITLE_LEFT,
    width: WIDTH - 2 * TITLE_LEFT,
    align: 'left',
    fontSize: TITLE_SIZE,
    fontFamily: FONT.display,
    color: COLOR.white,
    colorAt: (lineIndex, index) => (index === TITLE.lines[lineIndex].length - 1 ? COLOR.accent : COLOR.white),
    start: TITLE.in,
    end: TITLE.out
  });
  const dot = el('div', { style: { position: 'absolute', left: '0px', top: '0px', width: `${DOT_SIZE}px`, height: `${DOT_SIZE}px`, borderRadius: '50%', background: COLOR.accent } });
  root.appendChild(dot);
  const pop = spring({ duration: 0.45, bounce: 0.3 });

  return {
    render(time) {
      title.render(time);
      const grow = lerp(0.6, 1, pop(time - CUE.hit));
      dot.style.transform = `translate(${DOT_X(time)}px, ${DOT_Y}px) scale(${time < CUE.hit ? 0.6 : grow})`;
    }
  };
}
