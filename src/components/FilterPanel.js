// 过滤面板组件
import { el } from "../utils/dom.js";
import {
  getElementName,
  getMethodName,
  getFamilyName,
} from "../data/mappings.js";

export const filterState = {
  family: new Set(),
  element: new Set(),
  parry: new Set(),
  methods: new Set(),
  isJueXue: false,
  isZhiShi: false,
  sortField: null,
  sortOrder: "desc",
};

const FILTER_STATE_KEY = "wuxue_filter_state";

export function saveFilterState() {
  try {
    const state = {
      family: Array.from(filterState.family),
      element: Array.from(filterState.element),
      parry: Array.from(filterState.parry),
      methods: Array.from(filterState.methods),
      isJueXue: filterState.isJueXue,
      isZhiShi: filterState.isZhiShi,
      sortField: filterState.sortField,
      sortOrder: filterState.sortOrder,
    };
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadFilterState() {
  try {
    const saved = localStorage.getItem(FILTER_STATE_KEY);
    if (!saved) return;
    const state = JSON.parse(saved);
    if (state.family && Array.isArray(state.family))
      filterState.family = new Set(state.family.map((v) => String(v)));
    if (state.element && Array.isArray(state.element))
      filterState.element = new Set(state.element.map((v) => String(v)));
    if (state.parry && Array.isArray(state.parry))
      filterState.parry = new Set(state.parry.map((v) => String(v)));
    if (state.methods && Array.isArray(state.methods))
      filterState.methods = new Set(state.methods.map((v) => String(v)));
    if (state.isJueXue !== undefined) filterState.isJueXue = state.isJueXue;
    if (state.isZhiShi !== undefined) filterState.isZhiShi = state.isZhiShi;
    if (state.sortField !== undefined) filterState.sortField = state.sortField;
    if (state.sortOrder !== undefined) filterState.sortOrder = state.sortOrder;
  } catch {}
}

// 刷新已激活筛选数量显示
export function refreshActiveCount() {
  const count =
    filterState.family.size +
    filterState.element.size +
    filterState.parry.size +
    filterState.methods.size +
    (filterState.isJueXue ? 1 : 0) +
    (filterState.isZhiShi ? 1 : 0) +
    (filterState.sortField ? 1 : 0);

  const badge = document.getElementById("filterCountBadge");
  const clearBtn = document.querySelector(".filter-clear-all");

  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
  if (clearBtn) {
    clearBtn.classList.toggle("hidden", count === 0);
  }
}

function createSortGroup(onChange) {
  const sortFields = [
    { key: "atk", label: "攻击力系数" },
    { key: "damRate", label: "伤害率系数" },
    { key: "def", label: "防御系数" },
    { key: "parry", label: "招架系数" },
    { key: "hitRate", label: "命中率系数" },
    { key: "dodge", label: "闪避系数" },
    { key: "atkSpd", label: "攻速系数" },
    { key: "potEfficiency", label: "潜能效率" },
    { key: "neili", label: "内力系数" },
    { key: "HpRate", label: "生命系数" },
    { key: "avgAtk", label: "招式平均攻击" },
    { key: "avgDam", label: "招式平均伤害" },
    { key: "avgHitRate", label: "招式平均命中" },
    { key: "avgDuration", label: "招式平均前后摇" },
    { key: "avgQiAtk", label: "气血攻击参考" },
  ];

  const sortButtons = sortFields.map((field) => {
    const orderIcon = el("span", { class: "sort-order-icon" }, "↓");
    const btn = el(
      "button",
      {
        class:
          filterState.sortField === field.key
            ? "filter-badge active"
            : "filter-badge",
        onclick: () => {
          if (filterState.sortField === field.key) {
            filterState.sortOrder =
              filterState.sortOrder === "desc" ? "asc" : "desc";
          } else {
            filterState.sortField = field.key;
            filterState.sortOrder = "desc";
          }
          document.querySelectorAll("#sortGroup .filter-badge").forEach((b) => {
            b.classList.remove("active");
            const icon = b.querySelector(".sort-order-icon");
            if (icon) icon.textContent = "↓";
          });
          btn.classList.add("active");
          orderIcon.textContent = filterState.sortOrder === "desc" ? "↓" : "↑";
          onChange();
        },
      },
      [field.label, orderIcon],
    );
    if (filterState.sortField === field.key) {
      orderIcon.textContent = filterState.sortOrder === "desc" ? "↓" : "↑";
    }
    return btn;
  });

  return el("div", { class: "filter-group" }, [
    el("div", { class: "filter-header" }, [
      el("span", { class: "filter-title" }, "排序方式"),
      el(
        "span",
        {
          class: "filter-clear",
          onclick: () => {
            filterState.sortField = null;
            filterState.sortOrder = "desc";
            document
              .querySelectorAll("#sortGroup .filter-badge")
              .forEach((b) => {
                b.classList.remove("active");
                const icon = b.querySelector(".sort-order-icon");
                if (icon) icon.textContent = "↓";
              });
            onChange();
          },
        },
        "清除",
      ),
    ]),
    el("div", { class: "filter-badges", id: "sortGroup" }, sortButtons),
  ]);
}

export function createFilterPanel(onChange) {
  const panel = el("div", { class: "filter-panel" });

  // 移动端默认折叠
  if (window.innerWidth <= 768) {
    panel.classList.add("collapsed");
  }

  // 头部：标题 + 计数 + 操作区
  const header = el(
    "div",
    {
      class: "filter-panel-header",
      onclick: () => panel.classList.toggle("collapsed"),
    },
    [
      el("div", { class: "filter-panel-title" }, [
        el("span", { class: "filter-panel-title-text" }, "筛选条件"),
        el(
          "span",
          { class: "filter-count-badge hidden", id: "filterCountBadge" },
          "0",
        ),
      ]),
      el("div", { class: "filter-panel-actions" }, [
        el(
          "button",
          {
            class: "filter-clear-all hidden",
            onclick: (e) => {
              e.stopPropagation();
              clearAllFilters();
              onChange();
            },
          },
          "清除全部",
        ),
        el("span", { class: "filter-collapse-icon" }, "▾"),
      ]),
    ],
  );

  // 内容区
  const content = el("div", { class: "filter-panel-content" }, [
    createFilterGroup("familyFilters", "门派分类", "family", onChange),
    createFilterGroup("elementFilters", "伤害属性", "element", onChange),
    createFilterGroup("parryFilters", "招架属性", "parry", onChange),
    createFilterGroup("methodsFilters", "武学类型", "methods", onChange),
    createToggleGroup("特殊筛选", onChange),
    createSortGroup(onChange),
  ]);

  panel.appendChild(header);
  panel.appendChild(content);
  return panel;
}

function createFilterGroup(id, title, filterType, onChange) {
  return el("div", { class: "filter-group" }, [
    el("div", { class: "filter-header" }, [
      el("span", { class: "filter-title" }, title),
      el(
        "span",
        {
          class: "filter-clear",
          onclick: () => {
            filterState[filterType].clear();
            document
              .querySelectorAll(`#${id} .filter-badge`)
              .forEach((b) => b.classList.remove("active"));
            refreshActiveCount();
            onChange();
          },
        },
        "清除",
      ),
    ]),
    el("div", { class: "filter-badges", id }, []),
  ]);
}

function createToggleGroup(title, onChange) {
  const toggles = [
    { label: "绝学", icon: "★", key: "isJueXue" },
    { label: "知识", icon: "◆", key: "isZhiShi" },
  ];

  return el("div", { class: "filter-group" }, [
    el("div", { class: "filter-header" }, [
      el("span", { class: "filter-title" }, title),
    ]),
    el(
      "div",
      { class: "filter-toggles" },
      toggles.map((t) => {
        const isActive = filterState[t.key];
        const chip = el(
          "button",
          {
            class: isActive
              ? "filter-toggle-chip active"
              : "filter-toggle-chip",
            onclick: () => {
              filterState[t.key] = !filterState[t.key];
              chip.classList.toggle("active");
              refreshActiveCount();
              onChange();
            },
          },
          [
            el("span", { class: "toggle-icon" }, t.icon),
            el("span", { class: "toggle-label" }, t.label),
          ],
        );
        return chip;
      }),
    ),
  ]);
}

export function populateFilterBadges(
  containerId,
  values,
  filterType,
  onChange,
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  values.sort().forEach((value) => {
    const labelFn =
      filterType === "element" || filterType === "parry"
        ? getElementName
        : filterType === "methods"
          ? getMethodName
          : filterType === "family"
            ? (v) => getFamilyName(v) || v
            : (v) => v;
    const isActive = filterState[filterType].has(value);
    const badge = el(
      "span",
      {
        class: isActive ? "filter-badge active" : "filter-badge",
        onclick: () => {
          if (filterState[filterType].has(value)) {
            filterState[filterType].delete(value);
            badge.classList.remove("active");
          } else {
            filterState[filterType].add(value);
            badge.classList.add("active");
          }
          refreshActiveCount();
          onChange();
        },
      },
      labelFn(value),
    );
    container.appendChild(badge);
  });
}

export function getUniqueValues(skills, key) {
  const values = new Set();
  Object.values(skills).forEach((skill) => {
    if (skill[key]) {
      const str = String(skill[key]);
      if (str.includes(",")) {
        str.split(",").forEach((v) => values.add(v.trim()));
      } else {
        values.add(str);
      }
    }
  });
  return Array.from(values).filter(Boolean);
}

export function getFamilyValues(skills) {
  const values = new Set();
  Object.values(skills).forEach((skill) => {
    if (skill.familyList === "门派心法") {
      values.add("门派心法");
      return;
    }
    const val = skill.familyId || skill.familyList;
    if (val) {
      const str = String(val);
      const sep = skill.familyId ? "#" : ",";
      str.split(sep).forEach((v) => {
        const t = v.trim();
        if (t) values.add(t);
      });
    }
  });
  return Array.from(values).filter(Boolean);
}

export function matchesFilters(skill, searchText, searchIndex) {
  // 搜索匹配
  const searchMatch =
    !searchText ||
    Object.entries(skill).some(([, value]) => {
      if (value == null) return false;
      return String(value).toLowerCase().includes(searchText.toLowerCase());
    });

  let activeSkillMatch = !searchText;
  if (searchText && !searchMatch) {
    const indexed = searchIndex?.get(skill.id);
    if (indexed && indexed.includes(searchText.toLowerCase()))
      activeSkillMatch = true;
  }

  const familyList =
    skill.familyList === "门派心法"
      ? ["门派心法"]
      : (() => {
          const familyRaw = skill.familyId || skill.familyList;
          const familySep = skill.familyId ? "#" : ",";
          return familyRaw
            ? String(familyRaw)
                .split(familySep)
                .map((f) => f.trim())
                .filter(Boolean)
            : [];
        })();
  const familyMatch =
    filterState.family.size === 0 ||
    familyList.some((f) => filterState.family.has(f));
  const juexueMatch =
    !filterState.isJueXue ||
    (skill.mcmrestrict && skill.mcmrestrict.includes(",300"));
  const zhishiMatch =
    !filterState.isZhiShi ||
    (skill.wxclassify && skill.wxclassify === "zhishi");
  const elementMatch =
    filterState.element.size === 0 ||
    (skill.autoZhaoAtkDamageClass &&
      filterState.element.has(String(skill.autoZhaoAtkDamageClass)));
  const parryMatch =
    filterState.parry.size === 0 ||
    (skill.zhaoJiaDefDamageClass &&
      filterState.parry.has(String(skill.zhaoJiaDefDamageClass)));
  const methodsMatch =
    filterState.methods.size === 0 ||
    (skill.methods &&
      String(skill.methods)
        .split(",")
        .some((item) => filterState.methods.has(item)));

  return (
    (searchMatch || activeSkillMatch) &&
    familyMatch &&
    juexueMatch &&
    zhishiMatch &&
    elementMatch &&
    parryMatch &&
    methodsMatch
  );
}

export function clearAllFilters() {
  filterState.family.clear();
  filterState.element.clear();
  filterState.parry.clear();
  filterState.methods.clear();
  filterState.isJueXue = false;
  filterState.isZhiShi = false;
  filterState.sortField = null;
  filterState.sortOrder = "desc";
  document
    .querySelectorAll(".filter-badge")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".filter-toggle-chip")
    .forEach((chip) => chip.classList.remove("active"));
  document.querySelectorAll("#sortGroup .filter-badge").forEach((b) => {
    b.classList.remove("active");
    const icon = b.querySelector(".sort-order-icon");
    if (icon) icon.textContent = "↓";
  });
  refreshActiveCount();
  saveFilterState();
}
