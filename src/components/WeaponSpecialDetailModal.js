// 神兵特性详情弹窗 - 原始数据 / 公式计算器 / 效果分发
import { el, clearChildren } from '../utils/dom.js';
import { Modal } from './Modal.js';
import {
  parseScriptToJS,
  extractVariables,
  BLOCKED_GLOBALS,
  showEffectDetail,
} from './EffectDetailModal.js';
import {
  getSpecialNumberName,
  CALC_PARAM_NAMES,
  CALC_SELECT_PARAMS,
} from '../data/mappings.js';

// 原始数据弹窗
export function showRawDataModal(special) {
  const modal = new Modal({
    title: `${special.weapontype || ''} - ${special.name || ''} 原始数据`,
    size: 'lg',
  });
  const body = modal.getBody();
  body.appendChild(
    el('div', { class: 'json-viewer' }, JSON.stringify(special, null, 2)),
  );
  modal.show();
}

// 特性效果弹窗分发：conditiontype=0 走公式计算器，其余复用主动效果弹窗
export function showWeaponSpecialEffect(special, activeSkillData) {
  if (special.conditiontype === 0) {
    showWeaponSpecialFormulaModal(special);
  } else {
    showEffectDetail(special.specialnumber, activeSkillData, {}, {
      probabilityFormula: special.formula,
      isWeaponSpecial: true,
    });
  }
}

// conditiontype=0 的公式计算弹窗（神兵特性专用入口）
function showWeaponSpecialFormulaModal(special) {
  showFormulaCalcModal({
    formula: special.formula,
    resultKey: special.specialnumber,
    title: `特性效果: ${special.name || ''} - ${getSpecialNumberName(special.specialnumber)}`,
    rawData: special,
  });
}

// 通用公式计算弹窗：conditiontype=0 的特性效果（神兵特性 / 拳脚特性共用）
//   formula    - 公式字符串或数值常量
//   resultKey  - 结果描述键（如 HIT/ATK/DEF/DODGE/PARRY），经 getSpecialNumberName 转中文
//   title      - 弹窗标题
//   rawData    - 底部 JSON 展示的原始数据
export function showFormulaCalcModal({ formula, resultKey, title, rawData }) {
  const resultLabel = getSpecialNumberName(resultKey);

  const modal = new Modal({
    title: title || `特性效果 - ${resultLabel}`,
    size: 'lg',
  });
  const body = modal.getBody();

  // formula 为数值常量（如 DDDF1 的 1）：直接展示，无需计算器
  if (typeof formula !== 'string' || formula.trim() === '') {
    body.appendChild(
      el('div', { class: 'effect-calc' }, [
        el('div', { class: 'calc-result' }, [
          el('strong', {}, resultLabel),
          ': ',
          String(formula),
        ]),
      ]),
    );
    body.appendChild(
      el('div', { class: 'json-viewer' }, JSON.stringify(rawData, null, 2)),
    );
    modal.show();
    return;
  }

  const jsScript = parseScriptToJS(formula);
  const allVars = extractVariables(jsScript).filter(
    (v) => v !== 'z2' && v !== 'z3',
  );

  // 公式无参数：直接计算并展示结果，不展示计算参数和计算按钮
  if (allVars.length === 0) {
    let constResult;
    try {
      const funcBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${jsScript}`;
      const func = new Function(...BLOCKED_GLOBALS, funcBody);
      constResult = func(...BLOCKED_GLOBALS.map(() => undefined));
      if (typeof constResult === 'number') {
        constResult = parseFloat(constResult.toFixed(4));
      }
    } catch {
      constResult = '计算错误';
    }
    body.appendChild(
      el('div', { class: 'effect-calc' }, [
        el('div', { class: 'calc-result' }, [
          el('strong', {}, resultLabel),
          ': ',
          String(constResult),
        ]),
      ]),
    );
    body.appendChild(
      el('div', { class: 'json-viewer' }, JSON.stringify(rawData, null, 2)),
    );
    modal.show();
    return;
  }

  // 缓存参数（与主动效果计算共用 localStorage 键）
  let cachedValues = {};
  try {
    const cached = localStorage.getItem('calc_params_all');
    if (cached) cachedValues = JSON.parse(cached);
  } catch {}

  const calcContainer = el('div', { class: 'effect-calc' });
  calcContainer.appendChild(el('h6', { class: 'mb-2' }, '计算参数'));

  const grid = el('div', { class: 'calc-grid' });
  allVars.forEach((v) => {
    const defVal = cachedValues[v] !== undefined ? cachedValues[v] : 0;
    const fieldLabel = CALC_PARAM_NAMES[v] || v;
    const selectConfig =
      !CALC_PARAM_NAMES[v] && CALC_SELECT_PARAMS.find((cfg) => cfg.pattern.test(v));

    if (selectConfig) {
      const sel = el('select', { 'data-var': v });
      selectConfig.options.forEach((opt) => {
        sel.appendChild(
          el(
            'option',
            { value: opt.value, selected: opt.value == defVal ? 'selected' : null },
            opt.label,
          ),
        );
      });
      grid.appendChild(
        el('div', { class: 'calc-field' }, [
          el('label', { title: v }, selectConfig.label),
          sel,
        ]),
      );
    } else {
      grid.appendChild(
        el('div', { class: 'calc-field' }, [
          el('label', { title: v }, fieldLabel),
          el('input', { type: 'number', 'data-var': v, value: defVal }),
        ]),
      );
    }
  });
  calcContainer.appendChild(grid);

  const resultsDiv = el('div', {});
  const calcBtn = el('button', { class: 'btn btn-primary btn-sm mt-2 mb-4' }, '计算');

  const updateResults = () => {
    const values = {};
    calcContainer.querySelectorAll('[data-var]').forEach((input) => {
      values[input.dataset.var] = parseFloat(input.value) || 0;
    });

    // 保存缓存（与主动效果计算器共用）
    try {
      const toSave = Object.entries(values)
        .filter(([k]) => !/^z\d+$/.test(k) && k !== 'cost')
        .reduce((o, [k, val]) => ({ ...o, [k]: val }), {});
      localStorage.setItem(
        'calc_params_all',
        JSON.stringify({ ...cachedValues, ...toSave }),
      );
    } catch {}

    let res;
    try {
      const argNames = Object.keys(values);
      const argVals = Object.values(values);
      const funcBody = `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${jsScript}`;
      const func = new Function(...BLOCKED_GLOBALS, ...argNames, funcBody);
      res = func(...BLOCKED_GLOBALS.map(() => undefined), ...argVals);
      if (typeof res === 'number') res = parseFloat(res.toFixed(4));
    } catch {
      res = null;
    }

    clearChildren(resultsDiv);
    if (res === null) {
      resultsDiv.appendChild(
        el('div', { class: 'calc-result' }, [
          el('strong', {}, resultLabel),
          ': 计算错误',
        ]),
      );
    } else {
      resultsDiv.appendChild(
        el('div', { class: 'calc-result' }, [
          el('strong', {}, resultLabel),
          ': ',
          String(res),
        ]),
      );
    }
  };

  calcBtn.addEventListener('click', updateResults);
  calcContainer.appendChild(calcBtn);
  calcContainer.appendChild(resultsDiv);

  body.appendChild(calcContainer);
  body.appendChild(
    el('div', { class: 'json-viewer' }, JSON.stringify(rawData, null, 2)),
  );

  modal.show();
}
