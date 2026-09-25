const BEZIER_NEWTON_ITERATIONS = 8;
const BEZIER_BISECTION_ITERATIONS = 40;
const BEZIER_EPSILON = 1e-7;

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function progress(time, start, end) {
  if (end <= start) {
    throw new Error(`progress window is empty: ${start}..${end}`);
  }
  return clamp((time - start) / (end - start));
}

export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s) => (3 * ax * s + 2 * bx) * s + cx;

  function solveCurveX(x) {
    let s = x;
    for (let i = 0; i < BEZIER_NEWTON_ITERATIONS; i++) {
      const error = sampleX(s) - x;
      if (Math.abs(error) < BEZIER_EPSILON) {
        return s;
      }
      const slope = slopeX(s);
      if (Math.abs(slope) < 1e-6) {
        break;
      }
      s -= error / slope;
    }
    let low = 0;
    let high = 1;
    s = x;
    for (let i = 0; i < BEZIER_BISECTION_ITERATIONS; i++) {
      const value = sampleX(s);
      if (Math.abs(value - x) < BEZIER_EPSILON) {
        return s;
      }
      if (value < x) {
        low = s;
      } else {
        high = s;
      }
      s = (low + high) / 2;
    }
    return s;
  }

  return (t) => {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    return sampleY(solveCurveX(t));
  };
}

export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);
export const easeDrawer = cubicBezier(0.32, 0.72, 0, 1);
export const easeIn = cubicBezier(0.32, 0, 0.67, 0);
export const easeOutCubic = cubicBezier(0.33, 1, 0.68, 1);
export const easeInOutSine = cubicBezier(0.37, 0, 0.63, 1);
export const linear = (t) => clamp(t);

export function spring({ duration, bounce }) {
  if (!(duration > 0) || bounce < 0 || bounce >= 1) {
    throw new Error(`invalid spring: duration=${duration} bounce=${bounce}`);
  }
  const omega = (2 * Math.PI) / duration;
  const damping = 1 - bounce;
  if (bounce === 0) {
    return (t) => (t <= 0 ? 0 : 1 - Math.exp(-omega * t) * (1 + omega * t));
  }
  const omegaDamped = omega * Math.sqrt(1 - damping * damping);
  const phase = (damping * omega) / omegaDamped;
  return (t) => {
    if (t <= 0) {
      return 0;
    }
    const envelope = Math.exp(-damping * omega * t);
    return 1 - envelope * (Math.cos(omegaDamped * t) + phase * Math.sin(omegaDamped * t));
  };
}

export function track(keys) {
  if (keys.length === 0) {
    throw new Error('track needs at least one key');
  }
  const [first, ...rest] = keys;
  const steps = rest.map((key, index) => ({
    at: key.at,
    delta: key.value - (index === 0 ? first.value : rest[index - 1].value),
    curve: spring({ duration: key.duration, bounce: key.bounce })
  }));
  return (time) => steps.reduce((value, step) => value + step.delta * step.curve(time - step.at), first.value);
}

export function tween(time, { start, end, from = 0, to = 1, ease = easeOut }) {
  return lerp(from, to, ease(progress(time, start, end)));
}

export function springAt(time, { start, from = 0, to = 1, duration, bounce }) {
  return lerp(from, to, spring({ duration, bounce })(time - start));
}

export function keyframes(frames) {
  if (frames.length < 2) {
    throw new Error('keyframes needs at least two frames');
  }
  for (let i = 1; i < frames.length; i++) {
    if (frames[i][0] < frames[i - 1][0]) {
      throw new Error(`keyframes out of order at index ${i}`);
    }
  }
  return (time) => {
    const first = frames[0];
    if (time <= first[0]) {
      return first[1];
    }
    for (let i = 1; i < frames.length; i++) {
      const [endTime, endValue, ease = easeInOut] = frames[i];
      if (time <= endTime) {
        const [startTime, startValue] = frames[i - 1];
        const amount = endTime === startTime ? 1 : ease((time - startTime) / (endTime - startTime));
        return lerp(startValue, endValue, amount);
      }
    }
    return frames[frames.length - 1][1];
  };
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function smoothNoise(time, seed) {
  return (
    Math.sin(time * 1.31 + seed * 12.9898) * 0.5 +
    Math.sin(time * 2.17 + seed * 78.233) * 0.3 +
    Math.sin(time * 3.73 + seed * 37.719) * 0.2
  );
}
