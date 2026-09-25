# Soundtrack mechanics

## Structure

- `tools/build-cues.mjs` writes `src/cues.json` from `src/timing.js`: tempo, named sections, chord spans, and typed events (`hit`, `riser`, `whoosh`, `tick`, `pop`, `chime`, `beep`, `stamp`, `comet`, and so on). Derive repeating events from the same functions the picture uses; for example, a wheel tick fires wherever the scroll function crosses a whole row.
- `audio/synth.mjs` renders music and effects from the cue sheet, sums the stems, runs the reverb, masters, and writes 24-bit 48 kHz stereo. It throws on an unknown event type.
- `audio/music.mjs` is a worked arrangement: four-on-the-floor kick, dembow snare on 16th steps 3, 6, 11 and 14, off-beat hats, a sub bass on chord roots, a sidechained supersaw pad, a pluck hook, a snare roll into a silent gap, and a silent break before the logo. It expects the sections `intro`, `build`, `gap`, `break` and `outro`. Adapt it; don't treat it as a fixed style.
- `audio/dsp.mjs` holds biquads, a polyBLEP saw, FFT convolution, a lookahead limiter and BS.1770 integrated loudness. `audio/instruments.mjs` holds the voices; `audio/sfx.mjs` renders one effect type per function.

## Rules

- Seed all noise so two runs are byte-identical, and check it with a hash.
- Every voice fades in and out over at least 2 ms.
- Normalize the reverb impulse to unit energy. An unnormalized 1.7 s noise tail adds about 40 dB of gain and buries the mix in a wash.
- Drive sidechain ducking from the kick times, not from the audio.
- Master to -14 LUFS integrated with true peak at or below -1 dBTP, and fade the last 50 ms to digital zero.
- FM bells with a high modulation index spray partials toward 14 kHz and read as harsh; keep the index low.

## Verification without ears

- Print per-stem RMS and compare the balance; a hook 25 dB under the drums is inaudible.
- Render a waveform and a spectrogram and look at them: transients on the beat grid, silence where the gap and break sit, bounded energy above 12 kHz, a clean decay at the end.
- Measure with `ebur128=peak=true` on the final MP4, not only on the WAV.
- Report plainly that nobody has listened to the soundtrack.
