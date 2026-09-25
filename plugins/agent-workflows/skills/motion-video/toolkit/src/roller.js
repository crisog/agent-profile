import { el, layer, setVisible } from './dom.js';
import { createMaskedLetters, applyRoll } from './kinetic.js';
import { FONT } from './palette.js';

const ROLLER_LEFT = 104;
const ROLLER_BASELINE_TOP = 842;
const ROLLER_FONT_SIZE = 132;
const ENTER = { stagger: 0.022, duration: 0.5 };
const EXIT = { stagger: 0.008, duration: 0.2 };

export function createVerbRoller(stage, verbs) {
  const root = layer(stage, { zIndex: 200 });
  root.style.pointerEvents = 'none';
  const items = verbs.map((verb) => {
    const text = `${verb.word}.`;
    const { root: word, letters } = createMaskedLetters({
      text,
      fontFamily: FONT.display,
      fontSize: ROLLER_FONT_SIZE,
      color: verb.color,
      colors: { [text.length - 1]: verb.accent }
    });
    const holder = el('div', { style: { position: 'absolute', left: `${ROLLER_LEFT}px`, top: `${ROLLER_BASELINE_TOP}px` } }, [word]);
    root.appendChild(holder);
    return { verb, holder, letters };
  });

  return {
    render(time) {
      for (const { verb, holder, letters } of items) {
        const isActive = time >= verb.in - 0.001 && time <= verb.out + EXIT.duration + EXIT.stagger * letters.length;
        setVisible(holder, isActive);
        if (isActive) {
          applyRoll(letters, time, { enter: { start: verb.in, ...ENTER }, exit: { start: verb.out, ...EXIT } });
        }
      }
    }
  };
}
