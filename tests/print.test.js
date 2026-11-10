import test from 'node:test';
import assert from 'node:assert/strict';
import { printSheets } from '../src/engines/print.js';

function element(tag) {
  return { tag, children: [], append(child) { this.children.push(child); }, remove() { this.removed = true; } };
}

test('打印使用给定页面并在关闭打印后恢复页面', () => {
  const document = { title: '原页面', body: element('body'), createElement: element };
  const window = { addEventListener(type, callback) { this.afterprint = callback; }, removeEventListener() {}, print() { this.printed = true; } };
  printSheets({ title: '练习表', pages: ['<p>原题</p>', '<p>原题答案</p>'], document, window });
  const container = document.body.children[0];
  assert.equal(container.id, 'print-sheets');
  assert.equal(container.children.length, 2);
  assert.equal(container.children[0].children[1].innerHTML, '<p>原题</p>');
  assert.equal(container.children[1].children[1].innerHTML, '<p>原题答案</p>');
  assert.equal(document.title, '练习表');
  window.afterprint();
  assert.equal(container.removed, true);
  assert.equal(document.title, '原页面');
});
