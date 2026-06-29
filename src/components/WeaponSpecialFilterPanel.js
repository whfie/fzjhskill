// 神兵特性过滤面板组件
import { el } from '../utils/dom.js';
import { getConditionTypeName } from '../data/mappings.js';

export const wsFilterState = {
  weapontype: new Set(),
  conditiontype: new Set(),
  specialget: new Set(),
};

function refreshActiveCount() {
  const count =
    wsFilterState.weapontype.size +
    wsFilterState.conditiontype.size +
    wsFilterState.specialget.size;

  const badge = document.getElementById('wsFilterCountBadge');
  const clearBtn = document.querySelector('.ws-filter-clear-all');

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

export function createWeaponSpecialFilterPanel(onChange) {
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
          { class: 'filter-count-badge hidden', id: 'wsFilterCountBadge' },
          '0',
        ),
      ]),
      el('div', { class: 'filter-panel-actions' }, [
        el(
          'button',
          {
            class: 'filter-clear-all ws-filter-clear-all hidden',
            onclick: (e) => {
              e.stopPropagation();
              clearAllWeaponSpecialFilters();
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
    createWSFilterGroup('wsWeapontypeFilters', '武器类型', 'weapontype', onChange),
    createWSFilterGroup('wsConditionFilters', '生效条件', 'conditiontype', onChange),
    createWSFilterGroup('wsSpecialgetFilters', '解锁条件', 'specialget', onChange),
  ]);

  panel.appendChild(header);
  panel.appendChild(content);
  return panel;
}

function createWSFilterGroup(id, title, filterType, onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, title),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            wsFilterState[filterType].clear();
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

export function populateWSFilterBadges(
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
          if (wsFilterState[filterType].has(value)) {
            wsFilterState[filterType].delete(value);
            badge.classList.remove('active');
          } else {
            wsFilterState[filterType].add(value);
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

export function getWSUniqueValues(specials, key) {
  const values = new Set();
  Object.values(specials).forEach((s) => {
    if (s[key] != null && s[key] !== '') values.add(s[key]);
  });
  return Array.from(values);
}

export function matchesWSFilters(special, searchText) {
  const searchMatch =
    !searchText ||
    Object.entries(special).some(([, v]) => {
      if (v == null) return false;
      return String(v).toLowerCase().includes(searchText.toLowerCase());
    });

  const wtMatch =
    wsFilterState.weapontype.size === 0 ||
    (special.weapontype && wsFilterState.weapontype.has(special.weapontype));
  const ctMatch =
    wsFilterState.conditiontype.size === 0 ||
    (special.conditiontype != null &&
      wsFilterState.conditiontype.has(special.conditiontype));
  const sgMatch =
    wsFilterState.specialget.size === 0 ||
    (special.specialget != null &&
      wsFilterState.specialget.has(special.specialget));

  return searchMatch && wtMatch && ctMatch && sgMatch;
}

export function clearAllWeaponSpecialFilters() {
  wsFilterState.weapontype.clear();
  wsFilterState.conditiontype.clear();
  wsFilterState.specialget.clear();
  document
    .querySelectorAll(
      '#wsWeapontypeFilters .filter-badge, #wsConditionFilters .filter-badge, #wsSpecialgetFilters .filter-badge',
    )
    .forEach((b) => b.classList.remove('active'));
  refreshActiveCount();
}
