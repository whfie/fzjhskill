// 平均气血攻击预设配置弹窗
import { el, clearChildren } from "../utils/dom.js";
import { Modal } from "./Modal.js";
import { loadResource } from "../core/dataLoader.js";
import { WEAPON_TYPES } from "../data/mappings.js";
import { parseScriptToJS, BLOCKED_GLOBALS } from "./EffectDetailModal.js";

// ===== LocalStorage 缓存键 =====
const K_ATK_CHAR = "avgqiatk_atk_char"; // 进攻方人物配置（全局）
const K_DEF_CHAR = "avgqiatk_def_char"; // 防守方人物配置（全局）
const K_SKILL = (id) => `avgqiatk_skill_${id}`; // 进攻方武学配置（武学独立）
const K_RESULT = (id) => `avgqiatk_${id}`; // avgqiatk 结果（武学独立）

function lsGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// 创建带可选单位的 calc-field
function mkField(labelText, inputEl, unit) {
  const inner = unit
    ? el("div", { class: "input-with-unit" }, [
        inputEl,
        el("span", { class: "field-unit" }, unit),
      ])
    : inputEl;
  return el("div", { class: "calc-field" }, [
    el("label", {}, labelText),
    inner,
  ]);
}

// 区域标题
function secHead(title) {
  return el("div", { class: "preset-sec-head" }, title);
}

/**
 * 显示平均气血攻击预设配置弹窗
 * @param {object} opts
 * @param {string} opts.skillId  - 武学 ID（用于 per-skill 缓存）
 * @param {object} opts.skill    - 武学基础数据（含 atk/damRate/powerAtkRate/weapontype）
 * @param {string|number} opts.avgAtk - 招式平均攻击系数（来自 passiveStats.avgAtk）
 * @param {function} opts.onSave - 保存回调，传入计算结果 avgqiatk 数值
 */
export async function showAvgQiAtkPresetModal({
  skillId,
  skill,
  avgAtk,
  onSave,
  fromCard = false,
}) {
  // 技能系数
  const skillAtkCoef = parseFloat(skill?.atk) || 0;
  const skillDamRate = parseFloat(skill?.damRate) || 0;
  const skillPowerAtkRate = parseFloat(skill?.powerAtkRate) || 0;
  const skillAvgAtkCoef = parseFloat(avgAtk) || 0;

  // 武器类型列表
  const weaponTypeIds = skill?.weapontype
    ? String(skill.weapontype)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // 加载神兵特性数据（用于判断是否有增加攻击力特性）
  let allSpecials = [];
  if (weaponTypeIds.length > 0) {
    const wsData = await loadResource("weaponSpecials").catch(() => null);
    if (wsData && typeof wsData === "object") {
      allSpecials = Object.values(wsData);
    }
  }

  // 加载缓存
  const atkC = lsGet(K_ATK_CHAR) || {};
  const defC = lsGet(K_DEF_CHAR) || {};
  const skillC = lsGet(K_SKILL(skillId)) || {};

  // 默认值
  const DA = {
    str: 230,
    dex: 130,
    con: 90,
    neiliAttr: 0,
    exp: 40,
    jiaLi: 825,
    neiliTalAtk: 10,
    neiliAttrAtk: 3274,
  };
  const DD = {
    parryDef: 90,
    parryLevel: 1100,
    isForgotten: false,
    exp: 40,
    dex: 130,
    neiliTalDef: 10,
    neiliAttrDef: 600,
  };

  let curWeaponType = skillC.weaponType ?? "";
  let savedParryDef = null;
  let savedParryLevel = null;

  // 弹窗
  const modal = new Modal({ title: "预设配置 — 平均气血攻击", size: "lg" });
  const body = modal.getBody();
  body.classList.add("preset-config-body");

  // 输入元素注册表
  const inp = {};

  function mkInput(key, defVal) {
    const node = el("input", {
      type: "number",
      "data-var": key,
      value: String(defVal),
    });
    inp[key] = node;
    return node;
  }

  function gv(key) {
    const v = parseFloat(inp[key]?.value);
    return isNaN(v) ? 0 : v;
  }

  // ===== Section 1: 进攻方人物配置 =====
  body.appendChild(secHead("进攻方人物配置"));
  const atkGrid = el("div", { class: "calc-grid preset-grid" });
  atkGrid.appendChild(mkField("有效臂力", mkInput("str", atkC.str ?? DA.str)));
  atkGrid.appendChild(mkField("有效身法", mkInput("dex", atkC.dex ?? DA.dex)));
  atkGrid.appendChild(mkField("有效根骨", mkInput("con", atkC.con ?? DA.con)));
  atkGrid.appendChild(
    mkField(
      "经脉属性内力加成",
      mkInput("neiliAttr", atkC.neiliAttr ?? DA.neiliAttr),
    ),
  );
  atkGrid.appendChild(
    mkField("人物经验", mkInput("exp", atkC.exp ?? DA.exp), "亿"),
  );
  atkGrid.appendChild(
    mkField("加力值", mkInput("jiaLi", atkC.jiaLi ?? DA.jiaLi)),
  );
  atkGrid.appendChild(
    mkField(
      "经脉天赋攻击加成",
      mkInput("neiliTalAtk", atkC.neiliTalAtk ?? DA.neiliTalAtk),
      "%",
    ),
  );
  atkGrid.appendChild(
    mkField(
      "经脉属性攻击加成",
      mkInput("neiliAttrAtk", atkC.neiliAttrAtk ?? DA.neiliAttrAtk),
    ),
  );
  body.appendChild(atkGrid);

  // 神兵增加攻击力特性时显示的额外参数
  const atkSpecWrap = el("div", { class: "preset-atk-spec-wrap" });
  const atkSpecGrid = el("div", { class: "calc-grid preset-grid" });
  atkSpecWrap.appendChild(
    el(
      "div",
      { class: "preset-spec-hint" },
      "神兵具有「增加攻击力」特性，请填写以下参数：",
    ),
  );
  atkSpecGrid.appendChild(
    mkField("总臂力", mkInput("totalStr", atkC.totalStr ?? 285)),
  );
  atkSpecGrid.appendChild(mkField("淬炼次数", mkInput("CN", atkC.CN ?? 300)));
  atkSpecWrap.appendChild(atkSpecGrid);
  atkSpecWrap.style.display = "none";
  body.appendChild(atkSpecWrap);

  // ===== Section 2: 进攻方武学配置 =====
  body.appendChild(secHead("进攻方武学配置"));
  const sklGrid = el("div", { class: "calc-grid preset-grid" });

  if (weaponTypeIds.length > 0) {
    const wSel = el("select", { "data-var": "weaponType" });
    wSel.appendChild(el("option", { value: "" }, "— 无 —"));
    for (const tid of weaponTypeIds) {
      const tname = WEAPON_TYPES[tid] || tid;
      wSel.appendChild(
        el(
          "option",
          { value: tid, selected: tid === curWeaponType ? "selected" : null },
          tname,
        ),
      );
    }
    inp.weaponType = wSel;
    sklGrid.appendChild(
      el("div", { class: "calc-field calc-field-wide" }, [
        el("label", {}, "装备神兵"),
        wSel,
      ]),
    );
  } else {
    sklGrid.appendChild(
      el("div", { class: "calc-field" }, [
        el("label", {}, "装备神兵"),
        el("span", { class: "text-muted text-xs" }, "当前武学无可装备武器"),
      ]),
    );
  }
  body.appendChild(sklGrid);

  // ===== Section 3: 防守方人物配置 =====
  body.appendChild(secHead("防守方人物配置"));
  const defGrid = el("div", { class: "calc-grid preset-grid" });
  defGrid.appendChild(
    mkField(
      "招架武学防御系数",
      mkInput("parryDef", defC.parryDef ?? DD.parryDef),
    ),
  );
  defGrid.appendChild(
    mkField(
      "招架等级",
      mkInput("parryLevel", defC.parryLevel ?? DD.parryLevel),
    ),
  );
  defGrid.appendChild(
    mkField("人物经验", mkInput("defExp", defC.exp ?? DD.exp), "亿"),
  );
  defGrid.appendChild(
    mkField("有效身法", mkInput("defDex", defC.dex ?? DD.dex)),
  );
  defGrid.appendChild(
    mkField(
      "经脉天赋防御加成",
      mkInput("neiliTalDef", defC.neiliTalDef ?? DD.neiliTalDef),
      "%",
    ),
  );
  defGrid.appendChild(
    mkField(
      "经脉属性防御加成",
      mkInput("neiliAttrDef", defC.neiliAttrDef ?? DD.neiliAttrDef),
    ),
  );
  body.appendChild(defGrid);

  // 防守方被遗忘切换
  const forgottenInput = el("input", {
    type: "checkbox",
    checked: defC.isForgotten ?? DD.isForgotten,
  });
  const forgottenToggle = el("div", { class: "preset-forgotten-toggle" }, [
    el("span", {}, "防守方被遗忘"),
    el("label", { class: "toggle-switch" }, [
      forgottenInput,
      el("span", { class: "toggle-slider" }),
    ]),
  ]);
  body.appendChild(forgottenToggle);

  // 切换逻辑
  function applyForgottenState(isForgotten) {
    if (isForgotten) {
      savedParryDef = gv("parryDef");
      savedParryLevel = gv("parryLevel");
      inp.parryDef.value = "50";
      inp.parryLevel.value = "0";
      inp.parryDef.disabled = true;
      inp.parryLevel.disabled = true;
      inp.parryDef.parentElement.classList.add("disabled");
      inp.parryLevel.parentElement.classList.add("disabled");
    } else {
      if (savedParryDef !== null) inp.parryDef.value = String(savedParryDef);
      if (savedParryLevel !== null)
        inp.parryLevel.value = String(savedParryLevel);
      inp.parryDef.disabled = false;
      inp.parryLevel.disabled = false;
      inp.parryDef.parentElement.classList.remove("disabled");
      inp.parryLevel.parentElement.classList.remove("disabled");
    }
    doUpdate();
  }

  forgottenInput.addEventListener("change", (e) => {
    applyForgottenState(e.target.checked);
  });

  // ===== Section 4: 属性参考 =====
  body.appendChild(secHead("属性参考"));
  const refArea = el("div", { class: "preset-ref-area" });
  const refAtkEl = el("span", { class: "preset-ref-val" }, "—");
  const refDefEl = el("span", { class: "preset-ref-val" }, "—");
  refArea.appendChild(
    el("div", { class: "preset-ref-row" }, [
      el("span", { class: "preset-ref-label" }, "参考攻击力"),
      refAtkEl,
    ]),
  );
  refArea.appendChild(
    el("div", { class: "preset-ref-row" }, [
      el("span", { class: "preset-ref-label" }, "参考防御力"),
      refDefEl,
    ]),
  );
  body.appendChild(refArea);

  // ===== Section 5: 计算结果 =====
  body.appendChild(secHead("计算结果"));
  const resGrid = el("div", { class: "calc-grid preset-grid" });

  const atkFInput = mkInput("atkForce", 0);
  atkFInput.addEventListener("input", doUpdate);
  resGrid.appendChild(mkField("进攻方攻击力", atkFInput));

  const defFInput = mkInput("defForce", 0);
  defFInput.addEventListener("input", doUpdate);
  resGrid.appendChild(mkField("防守方防御力", defFInput));

  body.appendChild(resGrid);

  const calcResEl = el("div", { class: "preset-calc-res" });
  body.appendChild(calcResEl);

  // ===== 底部按钮 =====
  const btnRow = el("div", { class: "preset-btn-row" });
  const savePresetBtn = el(
    "button",
    {
      class: "btn btn-outline btn-sm",
      title: "将当前人物配置保存为全局预设参数",
    },
    "保存预设",
  );
  const saveResultBtn = el(
    "button",
    {
      class: "btn btn-primary btn-sm",
      title: "保存当前武学的平均气血攻击计算结果",
      style: fromCard ? "display: none" : "",
    },
    "保存结果",
  );
  const saveAllBtn = el(
    "button",
    {
      class: "btn btn-success btn-sm",
      title: "同时保存预设参数和计算结果",
      style: fromCard ? "display: none" : "",
    },
    "全部保存",
  );
  btnRow.appendChild(savePresetBtn);
  btnRow.appendChild(saveResultBtn);
  btnRow.appendChild(saveAllBtn);
  body.appendChild(btnRow);

  // ===== 逻辑 =====

  // 获取某武器类型的增加攻击力特性
  function getAtkSpecials(typeId) {
    if (!typeId) return [];
    const tname = WEAPON_TYPES[typeId] || typeId;
    return allSpecials.filter(
      (sp) =>
        (sp.weapontype === tname || sp.weapontype === typeId) &&
        sp.conditiontype === 0 &&
        sp.specialnumber === "ATK" &&
        typeof sp.formula === "string" &&
        sp.formula.trim() !== "",
    );
  }

  // 计算参考攻击力和防御力
  function computeRef() {
    const str = gv("str");
    const dex = gv("dex");
    const con = gv("con");
    const neiliAttr = gv("neiliAttr");
    const expVal = gv("exp");
    const jiaLi = gv("jiaLi");
    const talAtk = gv("neiliTalAtk");
    const attrAtk = gv("neiliAttrAtk");

    const neiliMax =
      11000 * (2 + 0.01 * con + 0.003 * str + 0.003 * dex) + neiliAttr;
    const expPow = Math.pow(expVal * 1e8, 0.4);
    const baseAtk =
      (1650 * 0.03 * skillAtkCoef + neiliMax / 20 + 10 + expPow) *
        (1 + 0.02 * str) +
      jiaLi * skillPowerAtkRate * (1 + 1650 / 500) * (0.001 * str + 0.49);

    // 神兵特性攻击加成
    let specBonus = 0;
    const specs = getAtkSpecials(curWeaponType);
    if (specs.length > 0) {
      const totalStr = gv("totalStr");
      const CN = gv("CN");
      for (const sp of specs) {
        try {
          const js = parseScriptToJS(sp.formula);
          const vars = { currStr: totalStr, currstr: totalStr, CN };
          const fn = new Function(
            ...BLOCKED_GLOBALS,
            ...Object.keys(vars),
            `const math=Math,min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;${js}`,
          );
          const r = fn(
            ...BLOCKED_GLOBALS.map(() => undefined),
            ...Object.values(vars),
          );
          if (typeof r === "number" && isFinite(r)) specBonus += r;
        } catch {}
      }
    }

    const refAtk = Math.round(
      baseAtk * (1 + talAtk / 100) + attrAtk + specBonus,
    );

    const parryDef = gv("parryDef");
    const parryLevel = gv("parryLevel");
    const defExpVal = gv("defExp");
    const defDex = gv("defDex");
    const talDef = gv("neiliTalDef");
    const attrDef = gv("neiliAttrDef");
    const defExpPow = Math.pow(defExpVal * 1e8, 0.4);

    const isForgotten = forgottenInput.checked;
    const effectiveParryDef = isForgotten ? 50 : parryDef;
    const effectiveParryLevel = isForgotten ? 0 : parryLevel;

    const baseDef =
      ((5 * (550 + effectiveParryLevel) * effectiveParryDef) / 120 +
        defExpPow +
        10) *
      (1.35 + defDex / 200);

    let refDef;
    if (isForgotten && savedParryDef !== null) {
      const baseDefOriginal =
        ((5 * (550 + savedParryLevel) * savedParryDef) / 120 + defExpPow + 10) *
        (1.35 + defDex / 200);
      refDef = Math.round(baseDef + (baseDefOriginal * talDef) / 100 + attrDef);
    } else {
      refDef = Math.round(baseDef * (1 + talDef / 100) + attrDef);
    }

    return { refAtk, refDef };
  }

  // 整体刷新（每次输入变更后调用）
  function doUpdate() {
    const specs = getAtkSpecials(curWeaponType);
    atkSpecWrap.style.display = specs.length > 0 ? "" : "none";

    const { refAtk, refDef } = computeRef();
    refAtkEl.textContent = refAtk.toLocaleString();
    refDefEl.textContent = refDef.toLocaleString();

    // 进攻方攻击力、防守方防御力与参考值实时同步
    atkFInput.value = refAtk;
    defFInput.value = refDef;

    // 即时计算平均气血攻击
    const af = gv("atkForce");
    const df = gv("defForce");
    const result = Math.round(
      (8 *
        (skillDamRate + (af * (1 + skillAvgAtkCoef) * skillDamRate) / 1000)) /
        (1 + df / 1000),
    );
    clearChildren(calcResEl);
    calcResEl.appendChild(
      el("div", { class: "calc-result preset-avgqiatk-result" }, [
        el("strong", {}, "平均气血攻击"),
        ": ",
        String(result),
      ]),
    );
  }

  // 绑定进攻方/防守方输入事件
  [
    ...atkGrid.querySelectorAll("input[data-var]"),
    ...atkSpecGrid.querySelectorAll("input[data-var]"),
    ...defGrid.querySelectorAll("input[data-var]"),
  ].forEach((i) => i.addEventListener("input", doUpdate));

  // 装备神兵下拉切换
  if (inp.weaponType) {
    inp.weaponType.addEventListener("change", () => {
      curWeaponType = inp.weaponType.value;
      doUpdate();
    });
  }

  // 参数保存为预设按钮
  savePresetBtn.addEventListener("click", () => {
    lsSet(K_ATK_CHAR, {
      str: gv("str"),
      dex: gv("dex"),
      con: gv("con"),
      neiliAttr: gv("neiliAttr"),
      exp: gv("exp"),
      jiaLi: gv("jiaLi"),
      neiliTalAtk: gv("neiliTalAtk"),
      neiliAttrAtk: gv("neiliAttrAtk"),
      totalStr: gv("totalStr"),
      CN: gv("CN"),
    });
    lsSet(K_DEF_CHAR, {
      parryDef:
        forgottenInput.checked && savedParryDef !== null
          ? savedParryDef
          : gv("parryDef"),
      parryLevel:
        forgottenInput.checked && savedParryLevel !== null
          ? savedParryLevel
          : gv("parryLevel"),
      isForgotten: forgottenInput.checked,
      exp: gv("defExp"),
      dex: gv("defDex"),
      neiliTalDef: gv("neiliTalDef"),
      neiliAttrDef: gv("neiliAttrDef"),
    });
    location.reload();
  });

  // 保存计算结果按钮
  saveResultBtn.addEventListener("click", () => {
    const af = gv("atkForce");
    const df = gv("defForce");
    const result = Math.round(
      (8 *
        (skillDamRate + (af * (1 + skillAvgAtkCoef) * skillDamRate) / 1000)) /
        (1 + df / 1000),
    );

    lsSet(K_SKILL(skillId), { weaponType: curWeaponType });
    lsSet(K_RESULT(skillId), result);

    onSave?.(result);
    modal.close();
  });

  // 保存预设和计算结果按钮
  saveAllBtn.addEventListener("click", () => {
    lsSet(K_ATK_CHAR, {
      str: gv("str"),
      dex: gv("dex"),
      con: gv("con"),
      neiliAttr: gv("neiliAttr"),
      exp: gv("exp"),
      jiaLi: gv("jiaLi"),
      neiliTalAtk: gv("neiliTalAtk"),
      neiliAttrAtk: gv("neiliAttrAtk"),
      totalStr: gv("totalStr"),
      CN: gv("CN"),
    });
    lsSet(K_DEF_CHAR, {
      parryDef:
        forgottenInput.checked && savedParryDef !== null
          ? savedParryDef
          : gv("parryDef"),
      parryLevel:
        forgottenInput.checked && savedParryLevel !== null
          ? savedParryLevel
          : gv("parryLevel"),
      isForgotten: forgottenInput.checked,
      exp: gv("defExp"),
      dex: gv("defDex"),
      neiliTalDef: gv("neiliTalDef"),
      neiliAttrDef: gv("neiliAttrDef"),
    });

    const af = gv("atkForce");
    const df = gv("defForce");
    const result = Math.round(
      (8 *
        (skillDamRate + (af * (1 + skillAvgAtkCoef) * skillDamRate) / 1000)) /
        (1 + df / 1000),
    );

    lsSet(K_SKILL(skillId), { weaponType: curWeaponType });
    lsSet(K_RESULT(skillId), result);

    onSave?.(result);
    location.reload();
  });

  // 初始化时应用遗忘状态
  applyForgottenState(defC.isForgotten ?? DD.isForgotten);

  // 初始化刷新
  doUpdate();
  modal.show();
}
