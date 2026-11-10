import { shuffle } from '../core.js';
import { swapAdjacent } from '../engines/boards.js';
import { inputMethod, inputTime, trackInputs } from '../engines/runtime.js';

export const definition = {
  id: 'puzzle',
  modes: [{
    id: 'rows-columns', name: '行列拼图', ruleVersion: 2,
    presets: [
      { id: '3x3', name: '3 × 3', settings: { rows: 3, cols: 3, image: 'default' } },
      { id: '5x5', name: '5 × 5', settings: { rows: 5, cols: 5, image: 'default' } },
      { id: '8x8', name: '8 × 8', settings: { rows: 8, cols: 8, image: 'default' } },
    ],
    fields: [
      { key: 'rows', label: '行数', type: 'number', default: 3, min: 3, max: 8, step: 1 },
      { key: 'cols', label: '列数', type: 'number', default: 3, min: 3, max: 8, step: 1 },
    ],
    score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'mixed'], rule: '左右拖动整列, 上下拖动整行, 将图片还原.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const { rows, cols } = settings;
  const image = document.createElement('canvas');
  image.width = image.height = 600;
  const source = image.getContext('2d');
  source.fillStyle = '#e7edf0'; source.fillRect(0, 0, 600, 600);
  source.fillStyle = '#a0bed2'; source.beginPath(); source.arc(230, 250, 170, 0, Math.PI * 2); source.fill();
  source.fillStyle = '#6389a2'; source.fillRect(250, 190, 220, 250);
  source.fillStyle = '#d3b078'; source.beginPath(); source.moveTo(80, 480); source.lineTo(260, 300); source.lineTo(520, 480); source.closePath(); source.fill();
  let rowOrder;
  let colOrder;
  let started;
  let moves;
  let active = true;
  let gesture = null;
  let preview = false;
  let imageId = 'default';
  let loadVersion = 0;
  let inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const reset = () => {
    rowOrder = shuffle(Array.from({ length: rows }, (_, i) => i), random);
    colOrder = shuffle(Array.from({ length: cols }, (_, i) => i), random);
    if (rowOrder.every((value, index) => value === index) && colOrder.every((value, index) => value === index)) [colOrder[0], colOrder[1]] = [colOrder[1], colOrder[0]];
    started = null; moves = 0; preview = false; inputs = trackInputs(); draw();
  };
  root.innerHTML = '<div class="game-status"><span data-status></span><span data-error role="status"></span></div><canvas width="600" height="600" aria-label="拖动行列的图片拼图" style="display:block;max-width:100%;width:400px;margin:auto;touch-action:none"></canvas><div class="answer-options"><button type="button" class="answer-button" data-preview>按住预览原图</button><label class="answer-button" style="max-width:100%;min-width:0">选择图片<input data-file type="file" accept="image/*" style="max-width:100%;min-width:0"></label></div>';
  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d');
  const draw = () => {
    context.clearRect(0, 0, 600, 600);
    if (preview) context.drawImage(image, 0, 0);
    else for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const width = 600 / cols;
      const height = 600 / rows;
      context.drawImage(image, colOrder[col] * width, rowOrder[row] * height, width, height, col * width, row * height, width, height);
      context.strokeStyle = 'rgba(255,255,255,.7)'; context.strokeRect(col * width, row * height, width, height);
    }
    root.querySelector('[data-status]').textContent = `交换 ${moves} 次`;
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (!active || preview || gesture || event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    gesture = { x: event.clientX, y: event.clientY, row: Math.min(rows - 1, Math.floor((event.clientY - bounds.top) / bounds.height * rows)), col: Math.min(cols - 1, Math.floor((event.clientX - bounds.left) / bounds.width * cols)), axis: null, input: inputMethod(event), pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  }, { signal: controller.signal });
  canvas.addEventListener('pointermove', (event) => {
    if (!gesture || !active || event.pointerId !== gesture.pointerId) return;
    const bounds = canvas.getBoundingClientRect();
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'col' : 'row';
    const axis = gesture.axis;
    if (!axis) return;
    const threshold = (axis === 'col' ? bounds.width / cols : bounds.height / rows) * 0.6;
    let delta = axis === 'col' ? dx : dy;
    while (Math.abs(delta) >= threshold) {
      const direction = Math.sign(delta);
      const next = swapAdjacent(axis === 'col' ? colOrder : rowOrder, gesture[axis], direction);
      if (!next) break;
      const at = inputTime(event, () => clock.performance.now());
      if (started === null) started = at;
      inputs.add(gesture.input);
      if (axis === 'col') { colOrder = next; gesture.col += direction; gesture.x += direction * threshold; delta = event.clientX - gesture.x; }
      else { rowOrder = next; gesture.row += direction; gesture.y += direction * threshold; delta = event.clientY - gesture.y; }
      moves++;
      draw();
      if (rowOrder.every((value, index) => value === index) && colOrder.every((value, index) => value === index)) {
        const duration = Math.max(0, at - started) / 1000;
        cleanup();
        onFinish({ value: duration, detail: `还原 ${rows} × ${cols}, 交换 ${moves} 次`, duration, mode: mode.id, preset: preset.id, settings: { ...settings, image: imageId }, rules: mode.ruleVersion, input: inputs.value, endReason: 'complete', scored: true, metrics: { moves }, trials: [] });
        return;
      }
    }
  }, { signal: controller.signal });
  canvas.addEventListener('pointerup', (event) => { if (gesture?.pointerId === event.pointerId) gesture = null; }, { signal: controller.signal });
  canvas.addEventListener('pointercancel', (event) => { if (gesture?.pointerId === event.pointerId) gesture = null; }, { signal: controller.signal });
  const previewButton = root.querySelector('[data-preview]');
  previewButton.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; preview = true; previewButton.setPointerCapture(event.pointerId); draw(); }, { signal: controller.signal });
  previewButton.addEventListener('pointerup', () => { preview = false; draw(); }, { signal: controller.signal });
  previewButton.addEventListener('pointercancel', () => { preview = false; draw(); }, { signal: controller.signal });
  root.querySelector('[data-file]').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const version = ++loadVersion;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const bytes = await file.arrayBuffer();
      if (!active || version !== loadVersion) return;
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      if (!active || version !== loadVersion) return;
      imageId = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
      const side = Math.min(bitmap.width, bitmap.height);
      source.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 600, 600);
      root.querySelector('[data-error]').textContent = '';
      reset();
    } catch {
      if (active && version === loadVersion) root.querySelector('[data-error]').textContent = '无法读取这张图片, 请换一张.';
    } finally {
      bitmap?.close();
    }
  }, { signal: controller.signal });
  reset();
  return cleanup;
}
