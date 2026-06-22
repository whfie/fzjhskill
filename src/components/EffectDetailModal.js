// 效果详情弹窗 - 含公式计算器
import { el, clearChildren } from '../utils/dom.js';
import { Modal } from './Modal.js';
import { getElementName, CALC_PARAM_NAMES, CALC_SELECT_PARAMS } from '../data/mappings.js';
import { isPotentialEffectId } from '../utils/format.js';

// 禁止公式访问的全局对象
const BLOCKED_GLOBALS = [
  'window', 'document', 'globalThis', 'self', 'location', 'history',
  'navigator', 'fetch', 'XMLHttpRequest', 'eval', 'Function',
  'setTimeout', 'setInterval', 'alert', 'confirm', 'prompt',
  'localStorage', 'sessionStorage',
];

// Lua → JS 脚本转换
function parseScriptToJS(luaScript) {
  let js = String(luaScript)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\belseif\b\s+(.*?)\s+\bthen\b/g, '} else if ($1) {')
    .replace(/\bif\b\s+(.*?)\s+\bthen\b/g, 'if ($1) {')
    .replace(/\belse\b(?!\s*if)/g, '} else {')
    .replace(/\bend\b/g, '}')
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\^/g, '**')
    .replace(/\brandom\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '($1 + $2) / 2');

  js = js.split('\n').map((line) => {
    if (line.includes('return') && !line.trim().endsWith(';')) return line + ';';
    return line;
  }).join('\n');

  if (!js.includes('return')) js = `return ${js};`;
  return js;
}

function extractVariables(script) {
  const varRegex = /[a-zA-Z_]\w*/g;
  const keywords = ['if', 'then', 'else', 'elseif', 'end', 'return', 'and', 'or', 'math', 'floor', 'ceil', 'abs', 'min', 'max'];
  const vars = new Set();
  let match;
  while ((match = varRegex.exec(script)) !== null) {
    if (!keywords.includes(match[0])) vars.add(match[0]);
  }
  return Array.from(vars);
}

// 递归处理 JSON 中的效果 ID，转为可点击链接
function processEffectIds(obj, currentId, processed = new Set()) {
  if (!obj) return obj;
  if (processed.has(currentId)) return obj;
  processed.add(currentId);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('arg') && isPotentialEffectId(value) && value !== currentId) {
      result[key] = `<span class="effect-link json-effect-link" data-effect-id="${value}">${value}</span>`;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = processEffectIds(value, currentId, new Set(processed));
    } else {
      result[key] = value;
    }
  }
  return result;
}

function jsonToHtmlWithLinks(obj, currentId) {
  const processed = processEffectIds(obj, currentId);
  return JSON.stringify(processed, null, 2)
    .replace(/\\"/g, '"')
    .replace(/"<span/g, '<span')
    .replace(/<\/span>"/g, '</span>');
}

export function showEffectDetail(effectId, activeSkillData, defaultParams = {}) {
  if (!activeSkillData?.Effect?.[effectId]) return;

  const effectData = activeSkillData.Effect[effectId];
  const modal = new Modal({
    title: `效果详情: ${effectId}`,
    size: 'lg',
  });

  const body = modal.getBody();

  // 显示数据
  const displayData = { ...effectData };
  if (displayData.activeZhaoAtkDamageClass) {
    displayData.activeZhaoAtkDamageClass = getElementName(displayData.activeZhaoAtkDamageClass);
  }

  const jsonViewer = el('div', { class: 'json-viewer', html: jsonToHtmlWithLinks(displayData, effectId) });

  // 收集公式
  const formulas = [];
  for (const key in effectData) {
    if (key.startsWith('arg')) {
      const val = effectData[key];
      if (typeof val === 'string' && !isPotentialEffectId(val) && val.trim() !== '' &&
        (/\bz\d+\b/.test(val) || val.includes('return') || /[+\-*/]/.test(val))) {
        formulas.push({ key, script: val });
      }
    }
  }

  // 计算器
  if (formulas.length > 0) {
    const calcContainer = el('div', { class: 'effect-calc' });
    calcContainer.appendChild(el('h6', { class: 'mb-2' }, '计算参数'));

    const compiledFormulas = formulas.map((f) => ({
      key: f.key,
      jsScript: parseScriptToJS(f.script),
      vars: extractVariables(parseScriptToJS(f.script)),
    }));

    let allVars = new Set();
    compiledFormulas.forEach((f) => f.vars.forEach((v) => allVars.add(v)));

    // duration 中的变量
    if (typeof effectData.duration === 'string') {
      extractVariables(parseScriptToJS(effectData.duration)).forEach((v) => allVars.add(v));
    }

    allVars = Array.from(allVars).filter((v) => v !== 'z2' && v !== 'z3');

    // 特殊 arg1 检测
    const specialArg1Values = ['qiAutoAtkFactor', 'qiAutoDefFactor', 'qiActiveAtkFactor', 'qiActiveDefFactor'];
    const isSpecialArg1 = specialArg1Values.includes(effectData.arg1);

    // 缓存参数
    let cachedValues = {};
    try {
      const cached = localStorage.getItem('calc_params_all');
      if (cached) cachedValues = JSON.parse(cached);
    } catch {}

    const grid = el('div', { class: 'calc-grid' });
    allVars.forEach((v) => {
      let defVal = cachedValues[v] !== undefined ? cachedValues[v] : (defaultParams[v] !== undefined ? defaultParams[v] : 0);
      const labelName = CALC_PARAM_NAMES[v] || v;
      const selectConfig = !CALC_PARAM_NAMES[v] && CALC_SELECT_PARAMS.find((cfg) => cfg.pattern.test(v));

      if (selectConfig) {
        const sel = el('select', { 'data-var': v });
        selectConfig.options.forEach((opt) => {
          sel.appendChild(el('option', { value: opt.value, selected: opt.value == defVal ? 'selected' : null }, opt.label));
        });
        grid.appendChild(el('div', { class: 'calc-field' }, [el('label', { title: v }, selectConfig.label), sel]));
      } else {
        grid.appendChild(el('div', { class: 'calc-field' }, [
          el('label', { title: v }, labelName),
          el('input', { type: 'number', 'data-var': v, value: defVal }),
        ]));
      }
    });
    calcContainer.appendChild(grid);

    const resultsDiv = el('div', { id: 'calcResults' });
    const calcBtn = el('button', { class: 'btn btn-primary btn-sm mt-2' }, '计算');

    const updateResults = () => {
      const values = {};
      calcContainer.querySelectorAll('[data-var]').forEach((input) => {
        values[input.dataset.var] = parseFloat(input.value) || 0;
      });
      if (defaultParams.z2 !== undefined) values.z2 = defaultParams.z2;
      if (defaultParams.z3 !== undefined) values.z3 = defaultParams.z3;

      // 保存缓存
      try {
        const toSave = Object.entries(values).filter(([k]) => !/^z\d+$/.test(k) && k !== 'cost').reduce((o, [k, v]) => ({ ...o, [k]: v }), {});
        localStorage.setItem('calc_params_all', JSON.stringify({ ...cachedValues, ...toSave }));
      } catch {}

      // 计算
      const allResults = {};
      compiledFormulas.forEach((f) => {
        try {
          const argNames = Object.keys(values);
          const argVals = Object.values(values);
          const funcBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${f.jsScript}`;
          const func = new Function(...BLOCKED_GLOBALS, ...argNames, funcBody);
          let res = func(...BLOCKED_GLOBALS.map(() => undefined), ...argVals);
          if (typeof res === 'number') res = parseFloat(res.toFixed(4));
          allResults[f.key] = res;
        } catch {
          allResults[f.key] = null;
        }
      });

      // 计算 duration
      let durationT = 0;
      if (effectData.duration !== undefined) {
        try {
          const durValues = { ...values };
          Object.keys(defaultParams).forEach((k) => { if (/^z\d+$/.test(k)) durValues[k] = defaultParams[k]; });
          const argNames = Object.keys(durValues);
          const argVals = Object.values(durValues);
          const funcBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${parseScriptToJS(String(effectData.duration))}`;
          const func = new Function(...BLOCKED_GLOBALS, ...argNames, funcBody);
          const durResult = func(...BLOCKED_GLOBALS.map(() => undefined), ...argVals);
          if (typeof durResult === 'number' && durResult > 0) durationT = durResult;
        } catch {}
      }
      const tickCount = durationT > 0 ? Math.ceil(durationT / 2) : 0;

      // arg3 最大次数
      let arg3MaxCount = null;
      if (isSpecialArg1) {
        if (allResults.arg3 != null) arg3MaxCount = Math.round(allResults.arg3);
        else if (typeof effectData.arg3 === 'number') arg3MaxCount = Math.round(effectData.arg3);
      }

      // 渲染结果
      clearChildren(resultsDiv);
      const paramLabelMap = {
        default: { arg1: '计算结果', arg2: '计算结果' },
        汲取: { arg2: '消去内力', arg3: '回复内力' },
      };
      const effectType = effectData.type || 'default';
      const labelMap = paramLabelMap[effectType] || paramLabelMap.default;
      const hasTypeMapping = effectType in paramLabelMap;

      let isFirst = true;
      const formulasToRender = compiledFormulas.filter((f) => !(isSpecialArg1 && f.key === 'arg3'));
      formulasToRender.forEach((f, idx) => {
        const isLast = idx === formulasToRender.length - 1;
        const res = allResults[f.key];
        if (res === null) {
          resultsDiv.appendChild(el('div', { class: 'calc-result' }, [
            el('strong', {}, f.key), ': 计算错误',
          ]));
          return;
        }
        let labelName;
        if (!hasTypeMapping && isFirst && effectData.name) labelName = effectData.name;
        else labelName = labelMap[f.key] || f.key;

        let displayRes = res;
        if (effectType === '汲取' && f.key === 'arg3' && allResults.arg2 !== null) {
          displayRes = parseFloat((-res * allResults.arg2).toFixed(4));
        }
        if (effectData.type === '属性变化' && typeof displayRes === 'number') {
          displayRes = Math.round(displayRes);
        }

        const notes = [];
        if (durationT > 0 && effectData.type !== '属性变化') notes.push(`持续 ${durationT} 秒`);
        if (isLast && arg3MaxCount !== null) notes.push(`最多生效 ${arg3MaxCount} 次`);

        const resultEl = el('div', { class: 'calc-result' }, [
          el('strong', {}, labelName), ': ', String(displayRes),
          ...(notes.length > 0 ? [` （${notes.join('，')}）`] : []),
        ]);
        resultsDiv.appendChild(resultEl);

        if (effectData.type === '属性变化' && durationT > 0) {
          const total = Math.round(displayRes * tickCount);
          const totalNotes = [`持续 ${durationT} 秒`, `生效 ${tickCount} 次`];
          if (isLast && arg3MaxCount !== null) totalNotes.push(`最多生效 ${arg3MaxCount} 次`);
          resultsDiv.appendChild(el('div', { class: 'calc-result' }, [
            el('strong', {}, `总${labelName}`), ': ', String(total), ` （${totalNotes.join('，')}）`,
          ]));
        }
        isFirst = false;
      });
    };

    calcBtn.addEventListener('click', updateResults);
    calcContainer.appendChild(calcBtn);
    calcContainer.appendChild(resultsDiv);

    body.appendChild(calcContainer);
  }

  body.appendChild(jsonViewer);

  // 效果链接点击
  body.addEventListener('click', (e) => {
    const link = e.target.closest('.json-effect-link');
    if (link) {
      e.stopPropagation();
      showEffectDetail(link.dataset.effectId, activeSkillData, defaultParams);
    }
  });

  modal.show();
}
