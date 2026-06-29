// 效果详情弹窗 - 含公式计算器
import { el, clearChildren } from '../utils/dom.js';
import { Modal } from './Modal.js';
import { getElementName, CALC_PARAM_NAMES, CALC_SELECT_PARAMS } from '../data/mappings.js';
import { isPotentialEffectId } from '../utils/format.js';

// 禁止公式访问的全局对象
export const BLOCKED_GLOBALS = [
  'window', 'document', 'globalThis', 'self', 'location', 'history',
  'navigator', 'fetch', 'XMLHttpRequest', 'eval', 'Function',
  'setTimeout', 'setInterval', 'alert', 'confirm', 'prompt',
  'localStorage', 'sessionStorage',
];

// Lua → JS 脚本转换
export function parseScriptToJS(luaScript) {
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

export function extractVariables(script) {
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

export function showEffectDetail(effectId, activeSkillData, defaultParams = {}, opts = {}) {
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
  const isWeaponSpecial = !!opts.isWeaponSpecial;
  const formulas = [];
  for (const key in effectData) {
    if (key.startsWith('arg')) {
      const val = effectData[key];
      if (typeof val === 'number') {
        // 神兵特性场景：仅 arg2 数字常量作为结果展示（如 GJZJJ3/MSJSB1 的 arg2）
        if (isWeaponSpecial && key === 'arg2') formulas.push({ key, script: String(val) });
      } else if (typeof val === 'string' && !isPotentialEffectId(val) && val.trim() !== '' &&
        (/\bz\d+\b/.test(val) || val.includes('return') || /[+\-*/]/.test(val))) {
        formulas.push({ key, script: val });
      }
    }
  }

  // 计算器
  if (isWeaponSpecial && (effectData.arg1 === '晕迷' || effectData.arg1 === '截脉')) {
    // 神兵特性晕迷/截脉效果：参数来自生效概率公式（及 duration 公式），需展示计算参数和按钮
    const calcContainer = el('div', { class: 'effect-calc' });

    // 收集概率公式变量
    let probScript = null;
    let allVars = [];
    if (typeof opts.probabilityFormula === 'string' && opts.probabilityFormula.trim() !== '') {
      probScript = parseScriptToJS(opts.probabilityFormula);
      allVars = extractVariables(probScript).filter((v) => v !== 'z2' && v !== 'z3');
    }
    // duration 公式中的变量
    let durScript = null;
    if (typeof effectData.duration === 'string' && effectData.duration.trim() !== '') {
      durScript = parseScriptToJS(effectData.duration);
      extractVariables(durScript).forEach((v) => {
        if (v !== 'z2' && v !== 'z3' && !allVars.includes(v)) allVars.push(v);
      });
    }
    const hasParams = allVars.length > 0;

    let cachedValues = {};
    try {
      const cached = localStorage.getItem('calc_params_all');
      if (cached) cachedValues = JSON.parse(cached);
    } catch {}

    if (hasParams) {
      calcContainer.appendChild(el('h6', { class: 'mb-2' }, '计算参数'));
      const grid = el('div', { class: 'calc-grid' });
      allVars.forEach((v) => {
        const defVal = cachedValues[v] !== undefined ? cachedValues[v] : (defaultParams[v] !== undefined ? defaultParams[v] : 0);
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
    }

    const resultsDiv = el('div', { id: 'calcResults' });
    const calcBtn = hasParams ? el('button', { class: 'btn btn-primary btn-sm mt-2 mb-4' }, '计算') : null;

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

      // 计算 duration
      let durationT = 0;
      const durVal = effectData.duration;
      if (typeof durVal === 'number') {
        durationT = durVal;
      } else if (durScript) {
        try {
          const argNames = Object.keys(values);
          const argVals = Object.values(values);
          const durFuncBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${durScript}`;
          const durFunc = new Function(...BLOCKED_GLOBALS, ...argNames, durFuncBody);
          const durResult = durFunc(...BLOCKED_GLOBALS.map(() => undefined), ...argVals);
          if (typeof durResult === 'number' && durResult > 0) durationT = durResult;
        } catch {}
      }

      // 计算生效概率
      let probability = null;
      if (probScript) {
        try {
          const argNames = Object.keys(values);
          const argVals = Object.values(values);
          const pFuncBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${probScript}`;
          const pFunc = new Function(...BLOCKED_GLOBALS, ...argNames, pFuncBody);
          probability = pFunc(...BLOCKED_GLOBALS.map(() => undefined), ...argVals);
          if (typeof probability === 'number') probability = parseFloat(probability.toFixed(4));
        } catch {}
      } else if (typeof opts.probabilityFormula === 'number') {
        probability = opts.probabilityFormula;
      }

      // 渲染结果
      clearChildren(resultsDiv);
      const notes = [];
      if (durationT > 0) notes.push(`持续 ${durationT} 秒`);
      if (probability !== null) notes.push(`生效概率 ${Math.round(probability * 100)}%`);

      resultsDiv.appendChild(
        el('div', { class: 'calc-result' }, [
          el('strong', {}, effectData.name || effectData.arg1),
          ...(notes.length > 0 ? [` （${notes.join('，')}）`] : []),
        ]),
      );
    };

    if (calcBtn) calcBtn.addEventListener('click', updateResults);
    if (calcBtn) calcContainer.appendChild(calcBtn);
    calcContainer.appendChild(resultsDiv);
    if (!hasParams) updateResults();

    body.appendChild(calcContainer);
  } else if (formulas.length > 0) {
    const calcContainer = el('div', { class: 'effect-calc' });
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

    // 神兵特性生效概率公式（conditiontype!=0 时 formula 字段）：提取变量加入计算参数
    let probScript = null;
    if (
      isWeaponSpecial &&
      typeof opts.probabilityFormula === 'string' &&
      opts.probabilityFormula.trim() !== ''
    ) {
      probScript = parseScriptToJS(opts.probabilityFormula);
      extractVariables(probScript).forEach((v) => {
        if (v !== 'z2' && v !== 'z3' && !allVars.includes(v)) allVars.push(v);
      });
    }
    const hasParams = allVars.length > 0;

    // 特殊 arg1 检测
    const specialArg1Values = ['qiAutoAtkFactor', 'qiAutoDefFactor', 'qiActiveAtkFactor', 'qiActiveDefFactor'];
    const isSpecialArg1 = specialArg1Values.includes(effectData.arg1);

    // 缓存参数
    let cachedValues = {};
    try {
      const cached = localStorage.getItem('calc_params_all');
      if (cached) cachedValues = JSON.parse(cached);
    } catch {}

    if (hasParams) {
      calcContainer.appendChild(el('h6', { class: 'mb-2' }, '计算参数'));
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
    }

    const resultsDiv = el('div', { id: 'calcResults' });
    const calcBtn = hasParams ? el('button', { class: 'btn btn-primary btn-sm mt-2 mb-4' }, '计算') : null;

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
          // BLOCKED_GLOBALS 用作参数名，传入 undefined 以阴影公式可能引用的全局对象
          // 注意：'eval' 出现在参数名中，因此不能与严格模式同时启用（严格模式禁止 eval 作标识符）
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

      // 神兵特性生效概率（conditiontype!=0 时 formula 字段）
      let probability = null;
      if (isWeaponSpecial) {
        if (probScript) {
          try {
            const pArgNames = Object.keys(values);
            const pArgVals = Object.values(values);
            const pFuncBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${probScript}`;
            const pFunc = new Function(...BLOCKED_GLOBALS, ...pArgNames, pFuncBody);
            probability = pFunc(...BLOCKED_GLOBALS.map(() => undefined), ...pArgVals);
            if (typeof probability === 'number') probability = parseFloat(probability.toFixed(4));
          } catch {
            probability = null;
          }
        } else if (typeof opts.probabilityFormula === 'number') {
          probability = opts.probabilityFormula;
        }
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
        if (durationT > 0 && (effectData.type !== '属性变化' || isWeaponSpecial)) notes.push(`持续 ${durationT} 秒`);
        if (isLast && arg3MaxCount !== null) notes.push(`最多生效 ${arg3MaxCount} 次`);
        if (isLast && isWeaponSpecial && probability !== null) notes.push(`生效概率 ${Math.round(probability * 100)}%`);

        const resultEl = el('div', { class: 'calc-result' }, [
          el('strong', {}, labelName), ': ', String(displayRes),
          ...(notes.length > 0 ? [` （${notes.join('，')}）`] : []),
        ]);
        resultsDiv.appendChild(resultEl);

        if (effectData.type === '属性变化' && durationT > 0 && !isWeaponSpecial) {
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

    if (calcBtn) calcBtn.addEventListener('click', updateResults);
    if (calcBtn) calcContainer.appendChild(calcBtn);
    calcContainer.appendChild(resultsDiv);
    if (!hasParams) updateResults();

    body.appendChild(calcContainer);
  }

  body.appendChild(jsonViewer);

  // 效果链接点击
  body.addEventListener('click', (e) => {
    const link = e.target.closest('.json-effect-link');
    if (link) {
        e.stopPropagation();
        showEffectDetail(link.dataset.effectId, activeSkillData, defaultParams, opts);
      }
  });

  modal.show();
}
