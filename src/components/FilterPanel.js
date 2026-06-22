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

export function createFilterPanel(onChange) {
  const panel = el('div', { class: 'filter-panel' });

  // 门派分类
  panel.appendChild(createFilterGroup('familyFilters', '门派分类', 'family', onChange));
  // 武学属性
  panel.appendChild(createFilterGroup('elementFilters', '武学属性', 'element', onChange));
  // 武学类型
  panel.appendChild(createFilterGroup('methodsFilters', '武学类型', 'methods', onChange));

  // 绝学开关
  panel.appendChild(el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '绝学'),
      el('label', { class: 'switch' }, [
        el('input', {
          type: 'checkbox',
          onchange: (e) => {
            filterState.isJueXue = e.target.checked;
            onChange();
          },
        }),
        el('span', { class: 'switch-slider' }),
      ]),
    ]),
  ]));

  // 知识开关
  panel.appendChild(el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '知识'),
      el('label', { class: 'switch' }, [
        el('input', {
          type: 'checkbox',
          onchange: (e) => {
            filterState.isZhiShi = e.target.checked;
            onChange();
          },
        }),
        el('span', { class: 'switch-slider' }),
      ]),
    ]),
  ]));

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
          document.querySelectorAll(`#${id} .filter-badge`).forEach((b) => b.classList.remove('active'));
          onChange();
        },
      }, '清除'),
    ]),
    el('div', { class: 'filter-badges', id }, []),
  ]);
}

export function populateFilterBadges(containerId, values, filterType, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  values.sort().forEach((value) => {
    const labelFn = filterType === 'element' ? getElementName : filterType === 'methods' ? getMethodName : (v) => v;
    const badge = el('span', {
      class: 'filter-badge',
      onclick: () => {
        if (filterState[filterType].has(value)) {
          filterState[filterType].delete(value);
          badge.classList.remove('active');
        } else {
          filterState[filterType].add(value);
          badge.classList.add('active');
        }
        onChange();
      },
    }, labelFn(value));
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
  const searchMatch = !searchText ||
    Object.entries(skill).some(([, value]) => {
      if (value == null) return false;
      return String(value).toLowerCase().includes(searchText.toLowerCase());
    });

  let activeSkillMatch = !searchText;
  if (searchText && !searchMatch) {
    const indexed = searchIndex?.get(skill.id);
    if (indexed && indexed.includes(searchText.toLowerCase())) activeSkillMatch = true;
  }

  const familyMatch = filterState.family.size === 0 || (skill.familyList && filterState.family.has(skill.familyList));
  const juexueMatch = !filterState.isJueXue || (skill.mcmrestrict && skill.mcmrestrict.includes(',300'));
  const zhishiMatch = !filterState.isZhiShi || (skill.wxclassify && skill.wxclassify === 'zhishi');
  const elementMatch = filterState.element.size === 0 || (skill.autoZhaoAtkDamageClass && filterState.element.has(String(skill.autoZhaoAtkDamageClass)));
  const methodsMatch = filterState.methods.size === 0 || (skill.methods && String(skill.methods).split(',').some((item) => filterState.methods.has(item)));

  return (searchMatch || activeSkillMatch) && familyMatch && juexueMatch && zhishiMatch && elementMatch && methodsMatch;
}

export function clearAllFilters() {
  filterState.family.clear();
  filterState.element.clear();
  filterState.methods.clear();
  filterState.isJueXue = false;
  filterState.isZhiShi = false;
  document.querySelectorAll('.filter-badge').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach((cb) => (cb.checked = false));
}
