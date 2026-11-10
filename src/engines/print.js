export function printSheets({ title, pages, document = globalThis.document, window = globalThis.window }) {
  const previousTitle = document.title;
  const container = document.createElement('div');
  container.id = 'print-sheets';
  for (const html of pages) {
    const page = document.createElement('section');
    page.className = 'print-sheet';
    const heading = document.createElement('h1');
    heading.textContent = title;
    page.append(heading);
    const content = document.createElement('div');
    content.innerHTML = html;
    page.append(content);
    container.append(page);
  }
  document.body.append(container);
  document.title = title;
  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    window.removeEventListener('afterprint', cleanup);
    container.remove();
    document.title = previousTitle;
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
  return cleanup;
}
