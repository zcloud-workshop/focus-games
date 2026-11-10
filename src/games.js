import { shuffle, nbackSequence } from './core.js';

export function mountGame({ id, level, root, onFinish }) {
  const controller = new AbortController();
  const timers = new Set();
  let active = true;
  const started = performance.now();
  const elapsed = () => (performance.now() - started) / 1000;
  const cleanup = () => {
    active = false;
    controller.abort();
    timers.forEach((timer) => { clearTimeout(timer); clearInterval(timer); });
    timers.clear();
  };
  const later = (fn, ms) => {
    const timer = setTimeout(() => { timers.delete(timer); if (active) fn(); }, ms);
    timers.add(timer);
    return timer;
  };
  const wait = (ms) => new Promise((resolve) => later(resolve, ms));
  const listen = (target, event, fn) => target.addEventListener(event, fn, { signal: controller.signal });
  const action = (fn) => listen(root, 'click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (button && !button.disabled) fn(button.dataset.value, button);
  });
  const keys = (fn) => listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input, textarea, select')) return;
    if (['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(event.code)) {
      event.preventDefault();
      fn(event.code);
    }
  });
  const finish = (value, detail) => {
    if (!active) return;
    const duration = elapsed();
    cleanup();
    onFinish({ value: Math.round(value * 100) / 100, detail, duration });
  };
  const percent = (correct, total) => Math.round(correct / total * 100);
  const status = (left, right) => `<div class="game-status"><span>${left}</span><span>${right}</span></div>`;
  const grid = (items, columns, className = '', render = (value) => value) => `<div class="play-grid ${className}" style="--columns:${columns}">${items.map((value, i) => `<button class="play-cell" data-value="${i}" aria-label="${className === 'color-grid' ? `方块 ${i + 1}` : String(value)}">${render(value, i)}</button>`).join('')}</div>`;
  const choices = (items) => `<div class="answer-options">${items.map((item, index) => `<button class="answer-button" data-value="${index}"><span class="keycap">${index + 1}</span>${item}</button>`).join('')}</div>`;
  const feedback = (correct, button) => {
    button.classList.add(correct ? 'correct' : 'incorrect');
    later(() => button.classList.remove('correct', 'incorrect'), 230);
  };

  if (id === 'schulte') {
    const size = level + 3;
    const items = shuffle(Array.from({ length: size ** 2 }, (_, i) => i + 1));
    let target = 1;
    let mistakes = 0;
    root.innerHTML = status('下一个数字 <b id="next-number">1</b>', '<span id="live-time">0.0 秒</span>') + grid(items, size, 'number-grid');
    const interval = setInterval(() => { root.querySelector('#live-time').textContent = `${elapsed().toFixed(1)} 秒`; }, 100);
    timers.add(interval);
    action((index, button) => {
      if (items[Number(index)] !== target) { mistakes++; feedback(false, button); return; }
      button.classList.add('found');
      if (target === items.length) { finish(elapsed(), `完成 ${size} × ${size} 方格, 误触 ${mistakes} 次`); return; }
      target++;
      root.querySelector('#next-number').textContent = target;
    });
  }

  if (id === 'difference' || id === 'color') {
    let round = 0;
    let correct = 0;
    let attempted = false;
    let target;
    const size = id === 'difference' ? [3, 5, 7][level] : [3, 4, 5][level];
    const pairs = [['己', '已'], ['未', '末'], ['土', '士'], ['日', '目'], ['人', '入'], ['千', '干'], ['大', '太'], ['木', '本'], ['问', '间'], ['晴', '睛']];
    const show = () => {
      target = Math.floor(Math.random() * size ** 2);
      attempted = false;
      const pair = pairs[round];
      const hue = Math.floor(Math.random() * 360);
      const lightness = 45 + Math.floor(Math.random() * 12);
      const difference = Math.max(4, 19 - level * 4 - round);
      root.innerHTML = status(`第 <b>${round + 1}</b> / 10 题`, id === 'color' ? '找出颜色不同的一块' : '找出不同的字') + grid(Array.from({ length: size ** 2 }, (_, i) => id === 'difference' ? pair[i === target ? 1 : 0] : ''), size, id === 'color' ? 'color-grid' : 'character-grid');
      if (id === 'color') root.querySelectorAll('.play-cell').forEach((cell, index) => { cell.style.backgroundColor = `hsl(${hue} 48% ${lightness + (index === target ? difference : 0)}%)`; });
    };
    action((index, button) => {
      if (Number(index) !== target) { attempted = true; feedback(false, button); return; }
      if (!attempted) correct++;
      round++;
      if (round === 10) finish(id === 'color' ? percent(correct, 10) : elapsed(), `10 题中 ${correct} 题首次答对`);
      else show();
    });
    show();
  }

  if (id === 'sequence') {
    const sequence = [];
    let position = 0;
    let accepting = false;
    const show = async () => {
      accepting = false;
      sequence.push(Math.floor(Math.random() * 9));
      root.innerHTML = status(`序列长度 <b>${sequence.length}</b>`, '<span id="sequence-hint">观察亮起的顺序</span>') + grid(Array(9).fill(''), 3, 'sequence-grid');
      const cells = root.querySelectorAll('.play-cell');
      cells.forEach((cell, index) => { cell.disabled = true; cell.setAttribute('aria-label', `位置 ${index + 1}`); });
      await wait(600);
      for (const index of sequence) {
        cells[index].classList.add('lit');
        await wait([650, 450, 250][level]);
        cells[index].classList.remove('lit');
        await wait(240);
      }
      if (!active) return;
      position = 0;
      accepting = true;
      cells.forEach((cell) => { cell.disabled = false; });
      root.querySelector('#sequence-hint').textContent = '轮到你了, 按顺序点击';
    };
    action((index, button) => {
      if (!accepting) return;
      if (Number(index) !== sequence[position]) { finish(sequence.length - 1, '已记录完整记住的最长序列'); return; }
      feedback(true, button);
      position++;
      if (position === sequence.length) {
        accepting = false;
        root.querySelector('#sequence-hint').textContent = '正确, 准备下一轮';
        if (sequence.length === 20) finish(20, '完成全部 20 轮序列挑战');
        else later(show, 650);
      }
    });
    show();
  }

  if (id === 'numbers') {
    let length = 3;
    let number;
    const show = async () => {
      number = Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
      root.innerHTML = status(`第 <b>${length - 2}</b> 轮`, `记住 ${length} 位数字`) + `<div class="stimulus number-stimulus" style="--digits:${length}">${number}</div><p class="stage-note">数字将在 ${[4, 3, 2][level]} 秒后消失</p>`;
      await wait([4000, 3000, 2000][level]);
      if (!active) return;
      root.innerHTML = status(`第 <b>${length - 2}</b> 轮`, '现在, 回忆刚才的数字') + '<form class="number-form"><label for="number-answer">请输入刚才的完整数字</label><input id="number-answer" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="20" placeholder="输入数字" required pattern="[0-9]+"><button class="button primary" type="submit">确认答案</button></form>';
      root.querySelector('input').focus();
    };
    listen(root, 'submit', (event) => {
      event.preventDefault();
      if (root.querySelector('input').value.trim() !== number) { finish(length === 3 ? 0 : length - 1, `本轮数字为 ${number}`); return; }
      if (length === 20) { finish(20, '已完成 20 位数字挑战'); return; }
      length++;
      show();
    });
    show();
  }

  if (id === 'nback') {
    const n = level + 1;
    const sequence = nbackSequence(n);
    let index = 0;
    let correct = 0;
    const show = () => {
      const observing = index < n;
      root.innerHTML = status(observing ? `观察第 ${index + 1} 个字母` : `第 <b>${index - n + 1}</b> / 20 题`, `${n}-Back`) + `<div class="stimulus">${sequence[index]}</div><p class="stage-note">${observing ? '先记住这个字母' : `与 ${n} 步前的字母相同吗?`}</p>` + (observing ? '<button class="button primary centered" data-value="observe">记住了, 下一个</button>' : choices(['不同', '相同']));
    };
    const answer = (value) => {
      if (index >= n && ((sequence[index] === sequence[index - n]) === (value === '1'))) correct++;
      index++;
      if (index === sequence.length) finish(percent(correct, 20), `20 题中答对 ${correct} 题`);
      else show();
    };
    action(answer);
    keys((code) => { if (index >= n && ['Digit1', 'Digit2'].includes(code)) answer(code === 'Digit1' ? '0' : '1'); });
    show();
  }

  if (id === 'stroop' || id === 'math') {
    const colors = [{ name: '红', hex: '#c44343' }, { name: '蓝', hex: '#3275bf' }, { name: '绿', hex: '#27805e' }, { name: '紫', hex: '#8d53b1' }, { name: '橙', hex: '#b86b14' }].slice(0, 3 + level);
    let round = 0;
    let correct = 0;
    let answerIndex;
    let options;
    const show = () => {
      let stimulus;
      if (id === 'stroop') {
        answerIndex = Math.floor(Math.random() * colors.length);
        const word = colors[Math.floor(Math.random() * colors.length)];
        stimulus = `<div class="stimulus color-word" style="color:${colors[answerIndex].hex}">${word.name}</div><p class="stage-note">选择文字的颜色, 忽略字义</p>`;
        options = colors.map((color) => `${color.name}色`);
      } else {
        const limit = [10, 30, 99][level];
        const a = 1 + Math.floor(Math.random() * limit);
        const b = 1 + Math.floor(Math.random() * limit);
        const operator = shuffle(level === 2 ? ['+', '−', '×'] : ['+', '−'])[0];
        const answer = operator === '+' ? a + b : operator === '−' ? a - b : a * b;
        const pool = new Set([answer]);
        while (pool.size < 4) pool.add(answer + Math.floor(Math.random() * 21) - 10);
        options = shuffle([...pool]);
        answerIndex = options.indexOf(answer);
        stimulus = `<div class="stimulus math-stimulus">${a} ${operator} ${b}</div><p class="stage-note">选择正确的计算结果</p>`;
      }
      root.innerHTML = status(`第 <b>${round + 1}</b> / ${id === 'math' ? 10 : 20} 题`, `答对 ${correct} 题`) + stimulus + choices(options);
    };
    const answer = (value) => {
      if (Number(value) === answerIndex) correct++;
      round++;
      const total = id === 'math' ? 10 : 20;
      if (round === total) finish(percent(correct, total), `${total} 题中答对 ${correct} 题`);
      else show();
    };
    action(answer);
    keys((code) => { const index = Number(code.replace('Digit', '')) - 1; if (index >= 0 && index < options.length) answer(index); });
    show();
  }

  if (id === 'reaction') {
    const times = [];
    let readyAt;
    let phase;
    let waitingTimer;
    let early = 0;
    const show = () => {
      phase = 'waiting';
      root.innerHTML = status(`第 <b>${times.length + 1}</b> / 5 轮`, `抢按 ${early} 次`) + '<button class="reaction-area waiting" data-value="react"><span class="reaction-dot"></span><strong>等待绿色出现</strong><span>放松, 现在还不用点击</span></button><p class="stage-note">点击区域或按空格键</p>';
      waitingTimer = later(() => {
        phase = 'ready';
        const button = root.querySelector('.reaction-area');
        button.classList.replace('waiting', 'ready');
        button.innerHTML = '<span class="reaction-dot"></span><strong>现在点击!</strong><span>就是此刻</span>';
        readyAt = performance.now();
      }, [1200, 1800, 2200][level] + Math.random() * 2200);
    };
    const react = () => {
      if (phase === 'waiting') {
        clearTimeout(waitingTimer);
        timers.delete(waitingTimer);
        early++;
        phase = 'feedback';
        root.querySelector('.reaction-area').innerHTML = '<strong>稍微早了一点</strong><span>等到绿色再点击, 我们再来一次</span>';
        later(show, 1000);
      } else if (phase === 'ready') {
        const ms = performance.now() - readyAt;
        times.push(ms);
        phase = 'feedback';
        if (times.length === 5) { finish(times.reduce((a, b) => a + b, 0) / 5, `5 次有效反应的平均值, 抢按 ${early} 次`); return; }
        root.querySelector('.reaction-area').innerHTML = `<strong>${Math.round(ms)} <small>ms</small></strong><span>不错, 准备下一轮</span>`;
        later(show, 900);
      }
    };
    action(react);
    keys((code) => { if (code === 'Space') react(); });
    show();
  }

  if (id === 'gonogo') {
    const trials = shuffle([...Array(14).fill(true), ...Array(6).fill(false)]);
    let round = 0;
    let pressed = false;
    let accepting = false;
    let correct = 0;
    const show = () => {
      pressed = false;
      accepting = true;
      root.innerHTML = status(`第 <b>${round + 1}</b> / 20 轮`, '绿色点击 / 红色等待') + `<button class="reaction-area go-area ${trials[round] ? 'go' : 'nogo'}" data-value="go"><span class="go-symbol">${trials[round] ? '●' : '×'}</span><strong>${trials[round] ? '点击' : '不要点击'}</strong></button><p class="stage-note">也可使用空格键</p>`;
      later(() => {
        accepting = false;
        if (pressed === trials[round]) correct++;
        round++;
        if (round === trials.length) { finish(percent(correct, 20), `20 轮中正确 ${correct} 轮`); return; }
        root.innerHTML = '<div class="stimulus fixation">+</div>';
        later(show, 300);
      }, [1500, 1000, 650][level]);
    };
    const press = () => {
      if (!accepting || pressed) return;
      pressed = true;
      const button = root.querySelector('.reaction-area');
      button.classList.add(trials[round] ? 'correct' : 'incorrect');
      button.querySelector('strong').textContent = trials[round] ? '已响应' : '这一次需要等待';
    };
    action(press);
    keys((code) => { if (code === 'Space') press(); });
    show();
  }

  if (id === 'time') {
    const target = [3, 5, 10][level];
    const errors = [];
    let startAt;
    let phase = 'idle';
    const show = () => {
      phase = 'idle';
      root.innerHTML = status(`第 <b>${errors.length + 1}</b> / 3 轮`, `目标 ${target} 秒`) + `<div class="time-orbit"><span>${target}<small>秒</small></span></div><p class="stage-note">准备好后, 用自己的节奏感受时间</p><button class="button primary centered" data-value="start">开始计时</button>`;
    };
    action((value) => {
      if (value === 'start' && phase === 'idle') {
        phase = 'timing';
        root.querySelector('.time-orbit').innerHTML = '<span class="time-pulse">· · ·</span>';
        root.querySelector('.stage-note').textContent = '在心里数秒, 感觉时间到了就点击停止';
        const button = root.querySelector('[data-value="start"]');
        button.dataset.value = 'stop';
        button.textContent = '停止计时';
        startAt = performance.now();
      } else if (value === 'stop' && phase === 'timing') {
        phase = 'feedback';
        const seconds = (performance.now() - startAt) / 1000;
        errors.push(Math.abs(seconds - target));
        if (errors.length === 3) { finish(errors.reduce((a, b) => a + b, 0) / 3, `目标 ${target} 秒, 记录 3 轮的平均绝对误差`); return; }
        root.innerHTML = `<div class="stimulus">${seconds.toFixed(2)}<small> 秒</small></div><p class="stage-note">与目标相差 ${Math.abs(seconds - target).toFixed(2)} 秒</p><button class="button primary centered" data-value="next">下一轮</button>`;
      } else if (value === 'next' && phase === 'feedback') show();
    });
    show();
  }

  if (id === 'breath') {
    const inhale = [4, 4, 5][level];
    const exhale = [4, 6, 7][level];
    const breathe = async () => {
      root.innerHTML = status('舒适呼吸', '<span id="breath-round">第 1 / 4 轮</span>') + '<div class="breath-orbit"><div class="breath-circle"><strong id="breath-label">准备</strong><span id="breath-count"></span></div></div><p class="stage-note">不必刻意深呼吸, 保持自然舒适即可</p>';
      const circle = root.querySelector('.breath-circle');
      const label = root.querySelector('#breath-label');
      const count = root.querySelector('#breath-count');
      await wait(500);
      for (let round = 0; round < 4; round++) {
        root.querySelector('#breath-round').textContent = `第 ${round + 1} / 4 轮`;
        for (const [text, seconds, scale] of [['吸气', inhale, '1.35'], ['呼气', exhale, '1']]) {
          label.textContent = text;
          circle.style.transition = `transform ${seconds}s linear`;
          circle.style.transform = `scale(${scale})`;
          for (let remaining = seconds; remaining > 0; remaining--) {
            count.textContent = remaining;
            await wait(1000);
          }
        }
      }
      finish(4, '完成 4 个舒适呼吸周期');
    };
    breathe();
  }

  return cleanup;
}
