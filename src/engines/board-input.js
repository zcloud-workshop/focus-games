import { inputMethod, inputTime } from './runtime.js';
export { trackInputs } from './runtime.js';

export function bindBoardButtons(root, selector, callback, signal, now) {
  root.addEventListener('pointerdown', (event) => {
    const button = event.target.closest(selector);
    if (!button || event.button !== 0) return;
    event.preventDefault();
    callback(button, inputMethod(event), inputTime(event, now));
  }, { signal });
  root.addEventListener('click', (event) => {
    const button = event.target.closest(selector);
    if (!button || event.detail !== 0) return;
    event.preventDefault();
    callback(button, inputMethod(event), inputTime(event, now));
  }, { signal });
}
