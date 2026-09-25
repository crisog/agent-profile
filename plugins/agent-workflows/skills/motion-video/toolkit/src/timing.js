export const BPM = 128;
export const BEAT_SECONDS = 60 / BPM;
export const DURATION_SECONDS = 15;
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export function beat(count) {
  return count * BEAT_SECONDS;
}

export const CUE = {
  titleIn: 0,
  hit: beat(2),
  moveStart: beat(4),
  moveEnd: beat(6)
};

export const FAST_RANGES = [[CUE.moveStart - 0.05, CUE.moveEnd + 0.05]];
