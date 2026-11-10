import { shuffle } from '../core.js';
import { createRuntime, inputMethod, trackInputs } from '../engines/runtime.js';

const directions = ['上', '右上', '右', '右下', '下', '左下', '左', '左上'];
const symbols = ['●', '◆', '▲', '■'];
const fields = [
  { key: 'rounds', label: '轮数', type: 'select', options: [10,20,30].map((value) => ({ value, label: `${value} 轮` })) },
  { key: 'exposureMs', label: '起始呈现', type: 'select', options: [800,1200,1600].map((value) => ({ value, label: `${value} ms` })) },
  { key: 'fieldLevel', label: '起始视野', type: 'select', options: [1,2,3].map((value) => ({ value, label: `等级 ${value}` })) },
];
export const definition = { id: 'field-of-view', modes: [
  { id: 'adaptive', name: '双点判断', sources: ['C01'], ruleVersion: 3, presets: [{ id: 'standard', name: '自适应训练', settings: { rounds: 20, exposureMs: 1200, fieldLevel: 1 } }], fields, score: { unit: '分', lower: false, min: 0, max: 1000 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], warning: '中央与周边目标短暂同时呈现, 随后遮盖.', rule: '注视中心, 记住中央图形和周边圆圈. 先选中央图形, 再选周边方向. 连续三轮正确扩大视野, 依据准确率、呈现速度和视野计算分数.' },
  { id: 'endless', name: '星光闯关', sources: ['C31'], ruleVersion: 3, presets: [{ id: 'levels', name: '无尽闯关', settings: { exposureMs: 2000 } }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], warning: '图形会短暂呈现并遮盖.', rule: '同时观察中央图形和周边目标, 遮罩后分两步回答. 每关加速, 每八关扩大目标距离. 一次答错结束.' },
] };

export function nextExposure(current, correct, expand = false) {
  const adjusted = correct ? Math.max(120,current - (current > 500 ? 120 : 40)) : Math.min(2200,current + 220);
  return Math.min(2200,adjusted + (expand ? 180 : 0));
}

export function decisionPoints(correct, exposureMs, fieldLevel) {
  if (!correct) return 0;
  const speed = Math.min(2.5,Math.max(0.75,Math.sqrt(1200 / exposureMs)));
  return Math.round(100 * [1,1.25,1.5][fieldLevel - 1] * speed);
}

export function endlessRound(round) {
  const fieldLevel = Math.min(3,1 + Math.floor(round / 8));
  return { fieldLevel, exposureMs: Math.max(120,Math.round(2000 * 0.92 ** round * 1.3 ** (fieldLevel - 1))) };
}

export function mount({ root, mode, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  const trials = [];
  let round = 0;
  let correct = 0;
  let exposure = settings.exposureMs;
  let fieldLevel = settings.fieldLevel ?? 1;
  let streak = 0;
  let points = 0;
  let phase = 'countdown';
  let central;
  let peripheral;
  let options;
  let distractors;
  let trial;
  const endless = mode.id === 'endless';
  const board = (mask = false, feedback = false) => {
    const radii = endless ? [[27,27],[36,36],[43,43]][fieldLevel - 1] : [[31,28],[39,36],[43,41]][fieldLevel - 1];
    return `<div class="field-board ${mask ? 'field-mask' : ''}"><span class="field-center">${mask ? '▧' : symbols[central]}</span>${directions.map((_,i) => { const angle = i / 8 * Math.PI * 2 - Math.PI / 2; return `<span class="field-target" style="left:${50 + Math.cos(angle) * radii[0]}%;top:${50 + Math.sin(angle) * radii[1]}%">${mask ? '▧' : i === peripheral ? '◎' : !feedback && distractors.includes(i) ? '◇' : ''}</span>`; }).join('')}</div>`;
  };
  const finishTrial = (centralCorrect, peripheralCorrect) => {
    phase = 'feedback';
    const success = centralCorrect && peripheralCorrect === true;
    const earned = decisionPoints(success,exposure,fieldLevel);
    Object.assign(trial,{ centralCorrect, peripheralCorrect, correct: success, points: earned, input: inputs.value });
    trials.push(trial);
    points += earned;
    if (success) correct++;
    round++;
    const ended = endless ? !success : round === settings.rounds;
    root.innerHTML = board(false,true) + `<p class="stage-note">${success ? '两项正确' : !centralCorrect ? '中央图形判断错误' : '周边方向判断错误'}</p>`;
    runtime.later(() => {
      if (ended) {
        const accuracy = Math.round(correct / round * 100);
        const rating = Math.round(points / round / 375 * 1000);
        runtime.finish({ value: endless ? correct : rating, detail: `${correct} / ${round} 轮两项均正确`, input: inputs.value, endReason: endless ? 'incorrect' : 'completed', rankEligible: endless ? correct > 0 : round >= 20 && accuracy >= 70, trials, metrics: { 正确率: accuracy, 中央正确: trials.filter((t) => t.centralCorrect).length, 周边正确: trials.filter((t) => t.peripheralCorrect === true).length, 两项均正确: correct, 决策评分: rating, 平均呈现毫秒: trials.reduce((s,t) => s + t.actualMs,0) / round, 最高视野等级: Math.max(...trials.map((t) => t.fieldLevel)) } });
        return;
      }
      if (endless) ({ fieldLevel, exposureMs: exposure } = endlessRound(round));
      else {
        streak = success ? streak + 1 : 0;
        const expand = streak >= 3 && fieldLevel < 3;
        exposure = nextExposure(exposure,success,expand);
        if (expand) { fieldLevel++; streak = 0; }
      }
      present();
    }, ended && endless ? 1800 : 1100);
  };
  const present = () => {
    central = Math.floor(random() * symbols.length);
    const other = (central + (fieldLevel === 3 ? 1 : 2)) % symbols.length;
    options = shuffle([central,other],random);
    peripheral = Math.floor(random() * 8);
    distractors = shuffle(Array.from({length:8},(_,i) => i).filter((i) => i !== peripheral),random).slice(0,[0,3,7][fieldLevel - 1]);
    runtime.frame((at) => {
      phase = 'stimulus';
      root.innerHTML = `<div class="game-status"><span>第 ${round + 1}${endless ? '' : ` / ${settings.rounds}`} 轮</span><span>视野 ${fieldLevel} · ${(exposure / 1000).toFixed(2)} 秒</span></div>` + board();
      trial = { central, peripheral, fieldLevel, presentedAt: at, requestedMs: exposure };
      runtime.later(() => runtime.frame((maskedAt) => {
        trial.actualMs = maskedAt - at;
        phase = 'mask';
        root.innerHTML = board(true);
        runtime.later(() => {
          phase = 'central';
          root.innerHTML = `<p class="stage-note">中央是什么图形?</p><div class="answer-options">${options.map((i) => `<button type="button" class="answer-button" data-central="${i}">${symbols[i]}</button>`).join('')}</div>`;
        },endless ? 150 : 120);
      }),Math.max(0,at + exposure - runtime.now()));
    });
  };
  runtime.listen(root,'click',(event) => {
    const c = event.target.closest('[data-central]');
    if (c && phase === 'central') {
      inputs.add(event);
      if (Number(c.dataset.central) !== central) { finishTrial(false,null); return; }
      phase = 'peripheral';
      root.innerHTML = `<p class="stage-note">周边圆圈在哪个方向?</p><div class="direction-grid">${[7,0,1,6,-1,2,5,4,3].map((i) => i < 0 ? '<span>+</span>' : `<button type="button" class="answer-button" data-direction="${i}">${directions[i]}</button>`).join('')}</div>`;
    }
    const p = event.target.closest('[data-direction]');
    if (p && phase === 'peripheral') { inputs.add(inputMethod(event)); finishTrial(true,Number(p.dataset.direction) === peripheral); }
  });
  let countdown = 3;
  const prepare = () => {
    if (!countdown) { present(); return; }
    root.innerHTML = `<div class="stimulus">${countdown--}</div><p class="stage-note">视线保持在中央</p>`;
    runtime.later(prepare,700);
  };
  prepare();
  return runtime.cleanup;
}
