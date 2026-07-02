// 拳脚特性过滤面板组件（分支 + 生效条件）
import { el } from '../utils/dom.js';
import { BRANCH_NAMES } from '../data/mappings.js';

// 分支过滤用 peculiarityid 首位字符作为标识
export const charFilterState = {
  branch: new Set(), // "1".."5"
  conditiontype: new Set(), // 0 | 2 | 3
  slot: new Set(), // 1 | 2 | 3
  type: new Set(), // "qianan" | "an"
};

function refreshActiveCount() {
  const count =
    charFilterState.branch.size +
    charFilterState.conditiontype.size +
    charFilterState.slot.size +
    charFilterState.type.size;
  const badge = document.getElementById('charFilterCountBadge');
  const clearBtn = document.querySelector('.char-filter-clear-all');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  if (clearBtn) clearBtn.classList.toggle('hidden', count === 0);
}

export function createCharacterFilterPanel(onChange) {
  const panel = el('div', { class: 'filter-panel' });
  if (window.innerWidth <= 768) panel.classList.add('collapsed');

  const header = el(
    'div',
    {
      class: 'filter-panel-header',
      onclick: () => panel.classList.toggle('collapsed'),
    },
    [
      el('div', { class: 'filter-panel-title' }, [
        el('span', { class: 'filter-panel-title-text' }, '筛选条件'),
        el(
          'span',
          { class: 'filter-count-badge hidden', id: 'charFilterCountBadge' },
          '0',
        ),
      ]),
      el('div', { class: 'filter-panel-actions' }, [
        el(
          'button',
          {
            class: 'filter-clear-all char-filter-clear-all hidden',
            onclick: (e) => {
              e.stopPropagation();
              clearAllCharacterFilters();
              onChange();
            },
          },
          '清除全部',
        ),
        el('span', { class: 'filter-collapse-icon' }, '▾'),
      ]),
    ],
  );

  const content = el('div', { class: 'filter-panel-content' }, [
    createCharFilterGroup('charBranchFilters', '分支', 'branch', onChange),
    createCharFilterGroup(
      'charConditionFilters',
      '生效条件',
      'conditiontype',
      onChange,
    ),
    createCharFilterGroup('charSlotFilters', '可选槽位', 'slot', onChange),
    createCharFilterGroup('charTypeFilters', '特性类型', 'type', onChange),
  ]);

  panel.appendChild(header);
  panel.appendChild(content);
  return panel;
}

function createCharFilterGroup(id, title, filterType, onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, title),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            charFilterState[filterType].clear();
            document
              .querySelectorAll(`#${id} .filter-badge`)
              .forEach((b) => b.classList.remove('active'));
            refreshActiveCount();
            onChange();
          },
        },
        '清除',
      ),
    ]),
    el('div', { class: 'filter-badges', id }, []),
  ]);
}

// 填充过滤徽章
//   filterType='branch'        values 为 "1".."5"，labelFn 转中文
//   filterType='conditiontype' values 为 0/2/3
export function populateCharFilterBadges(
  containerId,
  values,
  filterType,
  onChange,
  labelFn,
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  values.forEach((value) => {
    const badge = el(
      'span',
      {
        class: 'filter-badge',
        onclick: () => {
          if (charFilterState[filterType].has(value)) {
            charFilterState[filterType].delete(value);
            badge.classList.remove('active');
          } else {
            charFilterState[filterType].add(value);
            badge.classList.add('active');
          }
          refreshActiveCount();
          onChange();
        },
      },
      labelFn ? labelFn(value) : String(value),
    );
    container.appendChild(badge);
  });
}

// 收集 peculiarityGroup 列表中某字段的去重值
export function getCharUniqueValues(groups, getter) {
  const values = new Set();
  groups.forEach((g) => {
    const v = getter(g);
    if (v != null && v !== '') values.add(v);
  });
  return Array.from(values);
}

// 分支名（首位 → 中文）
export function getBranchLabel(firstDigit) {
  return BRANCH_NAMES[firstDigit] ?? firstDigit;
}

// 判断是否为浅谙特性
export function isQianAn(name) {
  return String(name || '').includes('浅谙');
}

// 判断是否为谙特性（不包含浅谙）
export function isAn(name) {
  return String(name || '').includes('谙') && !isQianAn(name);
}

// 过滤匹配
export function matchesCharFilters(group, searchText, slots = []) {
  const searchMatch =
    !searchText ||
    [group.name, group.text, group.opentext, String(group.peculiarityid)]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(searchText.toLowerCase()));

  const branchFirst = String(group.peculiarityid).charAt(0);
  const branchMatch =
    charFilterState.branch.size === 0 ||
    charFilterState.branch.has(branchFirst);
  const ctMatch =
    charFilterState.conditiontype.size === 0 ||
    (group.conditiontype != null &&
      charFilterState.conditiontype.has(group.conditiontype));

  // 槽位过滤
  const slotMatch =
    charFilterState.slot.size === 0 ||
    slots.some((s) => charFilterState.slot.has(s));

  // 特性类型过滤（浅谙/谙）
  let typeMatch = true;
  if (charFilterState.type.size > 0) {
    const isQA = isQianAn(group.name);
    const isA = isAn(group.name);
    typeMatch =
      (charFilterState.type.has('qianan') && isQA) ||
      (charFilterState.type.has('an') && isA);
  }

  return searchMatch && branchMatch && ctMatch && slotMatch && typeMatch;
}

export function clearAllCharacterFilters() {
  charFilterState.branch.clear();
  charFilterState.conditiontype.clear();
  charFilterState.slot.clear();
  charFilterState.type.clear();
  document
    .querySelectorAll(
      '#charBranchFilters .filter-badge, #charConditionFilters .filter-badge, #charSlotFilters .filter-badge, #charTypeFilters .filter-badge',
    )
    .forEach((b) => b.classList.remove('active'));
  refreshActiveCount();
}
