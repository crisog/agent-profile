import { el, layer } from '../dom.js';
import { applyRoll, createMaskedLetters } from '../kinetic.js';
import { easeInOut, lerp, progress, spring } from '../motion.js';
import { COLOR, FONT } from '../palette.js';
import { CUE } from '../timing.js';

const HEADLINE = 'Your headline.';

export function createExampleScene(stage) {
  const root = layer(stage, { zIndex: 10, background: COLOR.background });
  const { root: title, letters } = createMaskedLetters({ text: HEADLINE, fontFamily: FONT.display, fontSize: 150, color: COLOR.white, colors: { [HEADLINE.length - 1]: COLOR.accent } });
  const holder = el('div', { style: { position: 'absolute', left: '160px', top: '360px' } }, [title]);
  const dot = el('div', { style: { position: 'absolute', left: '0px', top: '0px', width: '80px', height: '80px', borderRadius: '50%', background: COLOR.accent } });
  root.append(holder, dot);
  const pop = spring({ duration: 0.45, bounce: 0.3 });

  return {
    render(time) {
      applyRoll(letters, time, { enter: { start: CUE.titleIn, stagger: 0.02, duration: 0.5 } });
      const travel = easeInOut(progress(time, CUE.moveStart, CUE.moveEnd));
      const grow = lerp(0.6, 1, pop(time - CUE.hit));
      dot.style.transform = `translate(${lerp(160, 1680, travel)}px, 760px) scale(${time < CUE.hit ? 0.6 : grow})`;
    }
  };
}
