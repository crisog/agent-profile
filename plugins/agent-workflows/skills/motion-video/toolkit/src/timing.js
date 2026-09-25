export const BPM = 128;
export const BEAT_SECONDS = 60 / BPM;
export const BAR_OFFSET_BEATS = 0;
export const DURATION_SECONDS = 15;
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export function beat(count) {
  return count * BEAT_SECONDS;
}

export const ROLL = {
  enter: { stagger: 0.02, duration: 0.5 },
  exit: { stagger: 0.008, duration: 0.2 }
};

export const CUE = {
  titleIn: 0,
  hit: beat(2),
  moveStart: beat(4),
  moveEnd: beat(6),
  titleOut: beat(28)
};

export const COPY = [{ id: 'title', lines: ['Your headline.'], in: CUE.titleIn, out: CUE.titleOut }];

export const FAST_RANGES = [[CUE.moveStart - 0.05, CUE.moveEnd + 0.05]];
