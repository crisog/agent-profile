# Pipeline mechanics

## Studying a reference video

`node tools/study-reference.mjs input.mov --out out/reference` prints size, frame rate, hard cuts with shot lengths, integrated loudness, loudness range and tempo candidates, and writes a 1 fps contact sheet, 6 fps motion strips per 6 s window and a waveform. Read the sheet for structure and copy, and the strips for how objects hand off between ideas. Few hard cuts across a long stretch mean the piece moves by transformation, not editing. Converting the container changes nothing: the frames are the viewing medium.

## Stage

- The page is authored at 1920x1080 CSS px. Every scene is a layer with a `render(time)` that sets styles from `time` alone. `window.stageReady` flips after fonts load and images decode.
- Load every web font with `document.fonts.load(...)` before any layout or measurement. Measure glyph ink (a period, a digit width) with canvas `measureText`, and convert `getBoundingClientRect` values by the stage's on-screen ratio, because the render runs under `zoom`.
- An SVG shown through `<img>` cannot use page fonts; inline SVG can. Keep element ids unique across inline SVGs.
- A `clip-path` or mask on an element that also carries a transform is applied in the transformed space. Put the transform on an inner wrapper.
- Feathered circular reveals use a `radial-gradient` mask, not `clip-path`. Feather width follows the edge speed (`edgeFeather` in `src/dom.js`).
- A small element with a 3D transform that is scaled up late is rasterized at its small size and looks soft. Author it at its final size, or reveal a native-resolution layer over it near the end of the move.
- `box-shadow` blur above about 60 px leaves a clipped edge at 2x zoom, which shows as a vertical seam in flat backgrounds. Cap the blur, or use a separate element with `filter: blur()`.

## Capture

- Launch `playwright-core` with the cached `chrome-headless-shell` executable. Set the viewport to the stage size times the supersampling scale and put `zoom: scale` on `body`.
- Capture with the CDP `Page.captureScreenshot` call, PNG with `optimizeForSpeed`. It ignores `deviceScaleFactor`, which is why supersampling uses viewport and zoom. Playwright's own screenshot at device scale 2 works but runs about 3x slower.
- Measured on an M4 Max: about 30-40 ms per 1080p PNG capture and about 100 ms per 4K capture, per worker.

## Motion blur

- Each output frame averages N sub-frames spread across a centered 180-degree shutter.
- Each chunk pipes its sub-frames into its own ffmpeg: `scale` to output size, `format=gbrp`, `tmix=frames=N`, `select='eq(mod(n\,N)\,N-1)'`, `setpts=N/(FPS*TB)`, FFV1 into MKV. Chunks are split wherever the sample count changes, rendered by a worker pool that reuses one page per worker, then concatenated.
- `FAST_RANGES` in `src/timing.js` get the high sample count. Put every whip, zoom, flood, burst, flip and spinning counter in it.

## Delivery encode

- `setpts=N/(FPS*TB)` first. MKV stores millisecond timestamps, so many concatenated segments drift, and `-t` then drops the last frame.
- Tag BT.709 on the frames with `setparams` and in the x264 VUI params. FFmpeg 8 takes color tags from the frames, so output flags alone leave primaries and transfer undefined.
- H.264 High, `yuv420p`, `aq-mode=3` for dark gradients, faint temporal luma grain (`noise=c0s=2:c0f=t+u`) against banding, `-tag:v avc1`, `+faststart`, AAC 256k.

## Checks that caught real defects

- Contact sheets: select frames by index. The ffmpeg `fps` filter drops frame 0 and shifts every label by one step. Some ffmpeg builds lack `drawtext`, so labels are drawn by laying the images out in Chromium.
- Seams: average each pixel column over the frame height in the lossless master and look for steps above the noise floor of a plain region.
- Logo fidelity: rasterize the reference artwork at the end-card geometry and compute IoU against the rendered frame. Sample the reference pixels first; a navy mark can carry an opaque white interior that alpha alone misses.
- Counters: a continuous `value / 10^k mod 10` leaves digits between two values at the end. Give each column its own reel that spins whole turns and lands on its target digit.
