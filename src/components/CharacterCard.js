// 拳脚特性卡片组件
// 同一 peculiarityid 的多 level 数据合并为一张卡片展示
import { el } from "../utils/dom.js";
import {
  getConditionTypeName,
  getBranchName,
  getBranchBadge,
  getSpecialNumberName,
} from "../data/mappings.js";
import { showCharacterEffect } from "./CharacterEffectModal.js";

// 尝试计算无参公式（纯数字或仅含 math 常量的表达式），返回数字或 null
function tryEvalConstant(formula) {
  if (formula == null) return null;
  if (typeof formula === "number") return formula;
  if (typeof formula !== "string" || formula.trim() === "") return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "math",
      `const min=Math.min,max=Math.max,abs=Math.abs,floor=Math.floor,ceil=Math.ceil;return ${formula};`,
    );
    const r = fn(Math);
    return typeof r === "number" ? r : null;
  } catch {
    return null;
  }
}

// 渲染某一等级的效果行（可点击下划线链接 → 效果详情弹窗）
function buildLevelRow(pec, entry, activeSkillData) {
  const se = Array.isArray(entry.specialEffect) ? entry.specialEffect : [];
  const ct = pec.conditiontype;
  let linkText;
  let trailing = "";

  if (ct === 0) {
    linkText = getSpecialNumberName(se[0]) || se[0] || "—";
    const constVal = tryEvalConstant(entry.formula);
    if (constVal !== null) trailing = `：${constVal}`;
  } else {
    linkText = se[0] || "—";
  }

  const link = el(
    "span",
    {
      class: "effect-link",
      onclick: (e) => {
        e.stopPropagation();
        showCharacterEffect(entry, activeSkillData);
      },
    },
    linkText + trailing,
  );

  return el("div", { class: "level-row" }, [
    el("span", { class: "level-label" }, `等级${entry.level}`),
    el("div", { class: "level-content" }, link),
  ]);
}

// peculiarityGroup 结构：
//   { peculiarityid, name, text, conditiontype, opentext, entries: [原始 entry, ...] }
// slots: 该 peculiarityid 在 characterPool 中出现的槽位集合，如 [1,2,3]
// activeSkillData: activeZhao 数据（cond=2/3 弹窗用）
export function createCharacterCard(pec, slots, activeSkillData) {
  const card = el("div", { class: "skill-card fade-in" });

  // === 标题栏：name + 分支标签 + 原始数据下拉（最右）===
  const rawBtn = el("button", { class: "expand-base-btn" }, "原始数据 ▾");
  const header = el("div", { class: "skill-card-header" }, [
    el("div", { class: "header-main-row" }, [
      el("div", { class: "ws-header-left" }, [
        el(
          "span",
          {
            class: "ws-card-title",
            title: `${pec.name} (${pec.peculiarityid})`,
          },
          pec.name || String(pec.peculiarityid),
        ),
        el(
          "span",
          { class: `badge ${getBranchBadge(pec.peculiarityid)}` },
          getBranchName(pec.peculiarityid),
        ),
      ]),
      el("div", { class: "header-right-group" }, [rawBtn]),
    ]),
  ]);

  // 原始数据 pre（默认隐藏）：展示合并后的整组特性 JSON
  const rawData = {
    peculiarityid: pec.peculiarityid,
    name: pec.name,
    text: pec.text,
    conditiontype: pec.conditiontype,
    opentext: pec.opentext,
    entries: pec.entries,
  };
  const rawPre = el(
    "pre",
    { class: "base-data-pre ws-raw-pre" },
    JSON.stringify(rawData, null, 2),
  );
  rawPre.style.display = "none";
  let rawExpanded = false;
  rawBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    rawExpanded = !rawExpanded;
    rawPre.style.display = rawExpanded ? "block" : "none";
    rawBtn.textContent = rawExpanded ? "原始数据 ▴" : "原始数据 ▾";
  });

  card.appendChild(header);
  card.appendChild(rawPre);

  // === 内容区 ===
  const body = el("div", { class: "skill-card-body" });

  // 描述（text）
  if (pec.text) {
    const desc = el("p", { class: "skill-desc" }, pec.text);
    desc.addEventListener("click", () => desc.classList.toggle("expanded"));
    body.appendChild(desc);
  }

  // 可选槽位：papool 末位去重排序，用标签展示
  const slotBadges =
    slots && slots.length > 0
      ? [...new Set(slots)]
          .sort((a, b) => a - b)
          .map((s) =>
            el(
              "span",
              { class: "badge badge-muted", style: { marginRight: "4px" } },
              `${s}槽`,
            ),
          )
      : [el("span", {}, "—")];
  body.appendChild(
    el("div", { class: "skill-meta-row" }, [
      el("span", { class: "skill-meta-label" }, "可选槽位："),
      el("span", {}, slotBadges),
    ]),
  );

  // 解锁条件（opentext，去掉第一行，保留换行）
  const openText = (pec.opentext || "—").split("\n").slice(1).join("\n") || "—";
  body.appendChild(
    el("div", { class: "skill-meta-row" }, [
      el("span", { class: "skill-meta-label" }, "解锁条件："),
      el("span", { style: { whiteSpace: "pre-line" } }, openText),
    ]),
  );

  // 生效条件（conditiontype）
  body.appendChild(
    el("div", { class: "skill-meta-row" }, [
      el("span", { class: "skill-meta-label" }, "生效条件："),
      el(
        "span",
        { class: "badge badge-muted" },
        getConditionTypeName(pec.conditiontype),
      ),
    ]),
  );

  // === 各等级效果（可折叠）===
  const levelSection = el("div", { class: "level-diff-section" });
  let levelExpanded = false;

  const toggle = el(
    "span",
    {
      class: "level-diff-toggle",
      onclick: (e) => {
        e.stopPropagation();
        levelExpanded = !levelExpanded;
        levelSection.querySelectorAll(".level-row").forEach((row) => {
          const level = parseInt(row.dataset.level);
          if (levelExpanded) {
            row.style.display = "flex";
          } else {
            row.style.display = level >= 6 ? "flex" : "none";
          }
        });
        e.target.textContent = levelExpanded ? "收起 ▴" : "展开 ▾";
      },
    },
    "展开 ▾",
  );
  levelSection.appendChild(
    el("div", { class: "level-diff-header" }, [
      el(
        "span",
        {
          class: "text-sm",
          style: { fontWeight: "600", color: "var(--text-secondary)" },
        },
        "各等级效果",
      ),
      toggle,
    ]),
  );

  // 默认显示等级6-10，展开后展示全部等级
  pec.entries
    .slice()
    .sort((a, b) => a.level - b.level)
    .forEach((entry) => {
      const row = buildLevelRow(pec, entry, activeSkillData);
      row.dataset.level = entry.level;
      row.style.display = entry.level >= 6 ? "flex" : "none";
      levelSection.appendChild(row);
    });

  body.appendChild(levelSection);
  card.appendChild(body);
  return card;
}
