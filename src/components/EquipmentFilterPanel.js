import { el } from '../utils/dom.js';

export const equipFilterState = {
  canCollect: null,
  equipClass: new Set(),
  weaponType: new Set(),
  armorSubType: new Set(),
  weaponSubType: new Set(),
  sortBy: null,
  sortOrder: 'desc',
};

const SORT_OPTIONS = [
  { label: '保护力', key: 'protect' },
  { label: '收藏值', key: 'wuzang' },
  { label: '伤害力', key: 'damage' },
  { label: '硬度', key: 'yindu' },
  { label: '韧性', key: 'rendu' },
  { label: '重量', key: 'weight' },
];

function refreshActiveCount() {
  const count =
    equipFilterState.equipClass.size +
    equipFilterState.weaponType.size +
    equipFilterState.armorSubType.size +
    equipFilterState.weaponSubType.size +
    (equipFilterState.canCollect !== null ? 1 : 0) +
    (equipFilterState.sortBy ? 1 : 0);

  const badge = document.getElementById('equipFilterCountBadge');
  const clearBtn = document.querySelector('.equip-filter-clear-all');

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

export function createEquipmentFilterPanel(onChange) {
  const panel = el('div', { class: 'filter-panel equip-filter-panel' });

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
          { class: 'filter-count-badge hidden', id: 'equipFilterCountBadge' },
          '0',
        ),
      ]),
      el('div', { class: 'filter-panel-actions' }, [
        el(
          'button',
          {
            class: 'filter-clear-all equip-filter-clear-all hidden',
            onclick: (e) => {
              e.stopPropagation();
              clearAllEquipmentFilters();
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
    createEquipClassGroup(onChange),
    createWeaponTypeGroup(onChange),
    createWeaponSubTypeGroup(onChange),
    createArmorSubTypeGroup(onChange),
    createCanCollectToggle(onChange),
    createSortGroup(onChange),
  ]);

  panel.appendChild(header);
  panel.appendChild(content);
  return panel;
}

function createEquipClassGroup(onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '装备大类'),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            equipFilterState.equipClass.clear();
            document
              .querySelectorAll('#equipClassFilters .filter-badge')
              .forEach((b) => b.classList.remove('active'));
            refreshActiveCount();
            onChange();
          },
        },
        '清除',
      ),
    ]),
    el('div', { class: 'filter-badges', id: 'equipClassFilters' }, [
      createClassBadge('weapon', '武器', onChange),
      createClassBadge('armor', '防具', onChange),
    ]),
  ]);
}

function createClassBadge(value, label, onChange) {
  const badge = el(
    'span',
    {
      class: 'filter-badge',
      onclick: () => {
        if (equipFilterState.equipClass.has(value)) {
          equipFilterState.equipClass.delete(value);
          badge.classList.remove('active');
        } else {
          equipFilterState.equipClass.add(value);
          badge.classList.add('active');
        }
        refreshActiveCount();
        onChange();
      },
    },
    label,
  );
  return badge;
}

function createCanCollectToggle(onChange) {
  const toggle = el(
    'button',
    {
      class: 'filter-toggle-chip',
      onclick: () => {
        if (equipFilterState.canCollect === null) {
          equipFilterState.canCollect = true;
          toggle.classList.add('active');
        } else if (equipFilterState.canCollect === true) {
          equipFilterState.canCollect = false;
          toggle.classList.remove('active');
        } else {
          equipFilterState.canCollect = null;
          toggle.classList.remove('active');
        }
        refreshActiveCount();
        onChange();
      },
    },
    [
      el('span', { class: 'toggle-icon' }, '★'),
      el('span', { class: 'toggle-label' }, '可收藏'),
    ],
  );

  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '特殊筛选'),
    ]),
    el('div', { class: 'filter-toggles' }, [toggle]),
  ]);
}

function createWeaponTypeGroup(onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '武器类型'),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            equipFilterState.weaponType.clear();
            document
              .querySelectorAll('#weaponTypeFilters .filter-badge')
              .forEach((b) => b.classList.remove('active'));
            refreshActiveCount();
            onChange();
          },
        },
        '清除',
      ),
    ]),
    el('div', { class: 'filter-badges', id: 'weaponTypeFilters' }, []),
  ]);
}

function createArmorSubTypeGroup(onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '防具子类型'),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            equipFilterState.armorSubType.clear();
            document
              .querySelectorAll('#armorSubTypeFilters .filter-badge')
              .forEach((b) => b.classList.remove('active'));
            refreshActiveCount();
            onChange();
          },
        },
        '清除',
      ),
    ]),
    el('div', { class: 'filter-badges', id: 'armorSubTypeFilters' }, []),
  ]);
}

function createWeaponSubTypeGroup(onChange) {
  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '武器子类型'),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            equipFilterState.weaponSubType.clear();
            document
              .querySelectorAll('#weaponSubTypeFilters .filter-badge')
              .forEach((b) => b.classList.remove('active'));
            refreshActiveCount();
            onChange();
          },
        },
        '清除',
      ),
    ]),
    el('div', { class: 'filter-badges', id: 'weaponSubTypeFilters' }, []),
  ]);
}

function createSortGroup(onChange) {
  const sortButtons = SORT_OPTIONS.map((opt) => {
    const orderIcon = el('span', { class: 'sort-order-icon' }, '↓');
    const btn = el(
      'button',
      {
        class: 'filter-badge',
        onclick: () => {
          if (equipFilterState.sortBy === opt.key) {
            equipFilterState.sortOrder =
              equipFilterState.sortOrder === 'desc' ? 'asc' : 'desc';
          } else {
            equipFilterState.sortBy = opt.key;
            equipFilterState.sortOrder = 'desc';
          }
          document
            .querySelectorAll('#sortFilters .filter-badge')
            .forEach((b) => {
              b.classList.remove('active');
              const icon = b.querySelector('.sort-order-icon');
              if (icon) icon.textContent = '↓';
            });
          btn.classList.add('active');
          btn.dataset.order = equipFilterState.sortOrder;
          orderIcon.textContent = equipFilterState.sortOrder === 'desc' ? '↓' : '↑';
          refreshActiveCount();
          onChange();
        },
      },
      [opt.label, orderIcon],
    );
    return btn;
  });

  return el('div', { class: 'filter-group' }, [
    el('div', { class: 'filter-header' }, [
      el('span', { class: 'filter-title' }, '排序方式'),
      el(
        'span',
        {
          class: 'filter-clear',
          onclick: () => {
            equipFilterState.sortBy = null;
            equipFilterState.sortOrder = 'desc';
            document
              .querySelectorAll('#sortFilters .filter-badge')
              .forEach((b) => {
                b.classList.remove('active');
                const icon = b.querySelector('.sort-order-icon');
                if (icon) icon.textContent = '↓';
              });
            refreshActiveCount();
            onChange();
          },
        },
        '清除',
      ),
    ]),
    el('div', { class: 'filter-badges', id: 'sortFilters' }, sortButtons),
  ]);
}

import { isArmorItem } from '../data/equipmentConstants.js';

export function populateEquipmentFilterBadges(equipmentData, onChange) {
  const weaponTypes = new Set();
  const armorSubTypes = new Set();
  const weaponSubTypes = new Set();

  Object.values(equipmentData).forEach((item) => {
    if (isArmorItem(item)) {
      if (item.bType) armorSubTypes.add(item.bType);
    } else {
      if (item.type) weaponTypes.add(item.type);
      if (item.bType) weaponSubTypes.add(item.bType);
    }
  });

  populateFilterBadges(
    'weaponTypeFilters',
    Array.from(weaponTypes).sort(),
    'weaponType',
    onChange,
  );
  populateFilterBadges(
    'armorSubTypeFilters',
    Array.from(armorSubTypes).sort(),
    'armorSubType',
    onChange,
  );
  populateFilterBadges(
    'weaponSubTypeFilters',
    Array.from(weaponSubTypes).sort(),
    'weaponSubType',
    onChange,
  );
}

function populateFilterBadges(containerId, values, filterType, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  values.forEach((value) => {
    const badge = el(
      'span',
      {
        class: 'filter-badge',
        onclick: () => {
          if (equipFilterState[filterType].has(value)) {
            equipFilterState[filterType].delete(value);
            badge.classList.remove('active');
          } else {
            equipFilterState[filterType].add(value);
            badge.classList.add('active');
          }
          refreshActiveCount();
          onChange();
        },
      },
      value,
    );
    container.appendChild(badge);
  });
}

export function matchesEquipmentFilters(item, searchText) {
  const searchMatch =
    !searchText ||
    Object.entries(item).some(([, v]) => {
      if (v == null) return false;
      return String(v).toLowerCase().includes(searchText.toLowerCase());
    });

  const isArmor = isArmorItem(item);

  const classMatch =
    equipFilterState.equipClass.size === 0 ||
    (equipFilterState.equipClass.has('armor') && isArmor) ||
    (equipFilterState.equipClass.has('weapon') && !isArmor);

  const canCollectMatch =
    equipFilterState.canCollect === null ||
    (equipFilterState.canCollect
      ? item.shoucang === 1 || item.shoucang === '1'
      : item.shoucang !== 1 && item.shoucang !== '1');

  const weaponTypeMatch =
    isArmor ||
    equipFilterState.weaponType.size === 0 ||
    (item.type && equipFilterState.weaponType.has(item.type));

  const armorSubTypeMatch =
    !isArmor ||
    equipFilterState.armorSubType.size === 0 ||
    (item.bType && equipFilterState.armorSubType.has(item.bType));

  const weaponSubTypeMatch =
    isArmor ||
    equipFilterState.weaponSubType.size === 0 ||
    (item.bType && equipFilterState.weaponSubType.has(item.bType));

  return (
    searchMatch &&
    classMatch &&
    canCollectMatch &&
    weaponTypeMatch &&
    armorSubTypeMatch &&
    weaponSubTypeMatch
  );
}

export function sortEquipment(items) {
  if (!equipFilterState.sortBy) return items;

  const sortKey = equipFilterState.sortBy;
  const order = equipFilterState.sortOrder === 'desc' ? -1 : 1;

  return [...items].sort((a, b) => {
    const valA = Number(a[sortKey]) || 0;
    const valB = Number(b[sortKey]) || 0;
    return (valA - valB) * order;
  });
}

export function clearAllEquipmentFilters() {
  equipFilterState.canCollect = null;
  equipFilterState.equipClass.clear();
  equipFilterState.weaponType.clear();
  equipFilterState.armorSubType.clear();
  equipFilterState.weaponSubType.clear();
  equipFilterState.sortBy = null;
  equipFilterState.sortOrder = 'desc';

  document
    .querySelectorAll('.equip-filter-panel .filter-badge')
    .forEach((b) => b.classList.remove('active'));
  document
    .querySelectorAll('.equip-filter-panel .filter-toggle-chip')
    .forEach((chip) => chip.classList.remove('active'));
  refreshActiveCount();
}