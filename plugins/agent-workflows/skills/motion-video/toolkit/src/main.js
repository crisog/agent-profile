import { createExampleScene } from './scenes/example.js';

const FONT_FACES = [];

const params = new URLSearchParams(location.search);
const scale = Number(params.get('scale') ?? '1');
if (!(scale > 0)) {
  throw new Error(`invalid scale ${params.get('scale')}`);
}
document.body.style.zoom = String(scale);
const stage = document.getElementById('stage');

await Promise.all(FONT_FACES.map((face) => document.fonts.load(face)));
await document.fonts.ready;

const scenes = [createExampleScene(stage)];
await Promise.all([...document.images].map((image) => image.decode()));

window.renderFrame = (time) => {
  for (const scene of scenes) {
    scene.render(time);
  }
};
window.renderFrame(0);
window.stageReady = true;
