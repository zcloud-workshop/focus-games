import { inputMethod, trackInputs } from './runtime.js';

export function createInputTracker(runtime, root) {
  const inputs = trackInputs();
  let typed = false, uncertain = false;
  runtime.listen(root, 'pointerdown', (event) => {
    const target = event.target.closest('button, input, textarea, select');
    if (target && !target.disabled) inputs.add(inputMethod(event));
  });
  runtime.listen(root, 'keydown', (event) => {
    if (event.isComposing || event.keyCode === 229) { uncertain = true; typed = false; return; }
    inputs.add(inputMethod(event));
    typed = Boolean(event.target.matches('input, textarea') && (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete' || event.metaKey || event.ctrlKey));
  });
  runtime.listen(root, 'input', (event) => {
    if (event.isComposing || !typed) uncertain = true;
    typed = false;
  });
  runtime.listen(root, 'compositionstart', () => { uncertain = true; });
  return () => uncertain ? 'unknown' : inputs.value;
}
