// 过滤面板组件
import { el } from '../utils/dom.js';
import { getElementName, getMethodName } from '../data/mappings.js';

export const filterState = {
  family: new Set(),
  element: new Set(),
  methods: new Set(),
  isJueXue: false,
  isZhiShi: false,
};

// 刷新已激活筛选数量显示
function refreshActiveCount() {
  const count =
    filterState.family.size +
    filterState.element.size +
    filterState.methods.size +
    (filterState.isJueXue ? 1 : 0) +
    (filterState.isZhiShi ? 1 : 0);

  const badge = document.getElementById('filterCountBadge');
  const clearBtn = document.querySelector('.filter-clear-all');

  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', count === 0);
  }
}

export function createFilterPanel(onChange) {
  const panel = el('div', { class: 'filter-panel' });

  // 移动端默认折叠
  if (window.innerWidth <= 768) {
    panel.classList.add('collapsed');
  }

  // 头部：标题 + 计数 + 操作区
  const header = el(
    'div',
    {
      class: 'filter-panel-header',
      onclick: () => panel.classList.toggle('collapsed'),
    },
    [
      el('div', { class: 'filter-panel-title' }, [
        el('span', { class: 'filter-panel-title-text' }, '筛选条件'),
        el('span', { class: 'filter-count-badge hidden', id: 'filterCountBadge' }, '0'),
      ]),
      el('div', { class: 'filter-panel-actions' }, [
        el('button', {
          class: 'filter-clear-all hidden',
          onclick: (e) => {
            e.stopPropagation();
            clearAllFilters();
            onChange();
          },
        }, '清除全部'),
        el('span', { class: 'filter-collapse-icon' }, '▾'),
      ]),
    ],
  );

  // 内容区
  const content = el('div', { class: 'filter-panel-content' }, [
    createFilterGroup('familyFilters', '门派分类', 'family', onChange),
    createFilterGroup('elementFilters', '武学属性', 'element', onChange),
    createFilterGroup('methodsFilters', '武学类型', 'methods', onChange),
    createToggleGroup('特殊筛选', onChange),
  ]);

  panel.appendChild(header);
  panel.appendChild(content);
  return panel;
}

function createFilterGroup(id, title, filterType, onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, title),
      el('span', {
        class: 'filter-clear',
        onclick: () => {
          filterState[filterType].clear();
          document
            .querySelectorAll(`#${id} .filter-badge`)
            .forEach((b) => b.classList.remove('active'));
          refreshActiveCount();
          onChange();
        },
      }, '清除'),
    ]),
    el('div', { class: 'filter-badges', id }, []),
  ]);
}

function createToggleGroup(title, onChange) {
  const toggles = [
    { label: '绝学', icon: '★', key: 'isJueXue' },
    { label: '知识', icon: '◆', key: 'isZhiShi' },
  ];

  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, title),
    ]),
    el(
      'div',
      { class: 'filter-toggles' },
      toggles.map((t) => {
        const chip = el(
          'button',
          {
            class: 'filter-toggle-chip',
            onclick: () => {
              filterState[t.key] = !filterState[t.key];
              chip.classList.toggle('active');
              refreshActiveCount();
              onChange();
            },
          },
          [
            el('span', { class: 'toggle-icon' }, t.icon),
            el('span', { class: 'toggle-label' }, t.label),
          ],
        );
        return chip;
      }),
    ),
  ]);
}

export function populateFilterBadges(containerId, values, filterType, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  values.sort().forEach((value) => {
    const labelFn =
      filterType === 'element'
        ? getElementName
        : filterType === 'methods'
          ? getMethodName
          : (v) => v;
    const badge = el(
      'span',
      {
        class: 'filter-badge',
        onclick: () => {
          if (filterState[filterType].has(value)) {
            filterState[filterType].delete(value);
            badge.classList.remove('active');
          } else {
            filterState[filterType].add(value);
            badge.classList.add('active');
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
      if (str.includes(',')) {
        str.split(',').forEach((v) => values.add(v.trim()));
      } else {
        values.add(str);
      }
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
    if (indexed && indexed.includes(searchText.toLowerCase())) activeSkillMatch = true;
  }

  const familyMatch =
    filterState.family.size === 0 ||
    (skill.familyList && filterState.family.has(skill.familyList));
  const juexueMatch =
    !filterState.isJueXue || (skill.mcmrestrict && skill.mcmrestrict.includes(',300'));
  const zhishiMatch =
    !filterState.isZhiShi || (skill.wxclassify && skill.wxclassify === 'zhishi');
  const elementMatch =
    filterState.element.size === 0 ||
    (skill.autoZhaoAtkDamageClass &&
      filterState.element.has(String(skill.autoZhaoAtkDamageClass)));
  const methodsMatch =
    filterState.methods.size === 0 ||
    (skill.methods &&
      String(skill.methods).split(',').some((item) => filterState.methods.has(item)));

  return (
    (searchMatch || activeSkillMatch) &&
    familyMatch &&
    juexueMatch &&
    zhishiMatch &&
    elementMatch &&
    methodsMatch
  );
}

export function clearAllFilters() {
  filterState.family.clear();
  filterState.element.clear();
  filterState.methods.clear();
  filterState.isJueXue = false;
  filterState.isZhiShi = false;
  document.querySelectorAll('.filter-badge').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.filter-toggle-chip').forEach((chip) => chip.classList.remove('active'));
  refreshActiveCount();
}
