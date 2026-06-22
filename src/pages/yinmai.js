// 隐脉查询页面 - 主逻辑（含玄络图选择、窍关网格、玄络装备、玄络展示）
import '../styles/main.css';
import { initHeader } from '../components/Header.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { loadResource, getDataVersion } from '../core/dataLoader.js';
import { getElementName, getResourceName } from '../data/mappings.js';
import { el, clearChildren } from '../utils/dom.js';
import { formatTime, formatPercent } from '../utils/format.js';

let meridianMap = {};
let acupointConfig = {};
let meridianLinkConfig = {};
let totalAttributes = {};
let currentGridContainer = null;

// 类型样式
const TYPE_INFO = {
  1: { label: '参伐', badge: 'badge-danger' },
  2: { label: '守御', badge: 'badge-info' },
  3: { label: '共贯', badge: 'badge-success' },
};
const CLASS_INFO = {
  1: { label: '正基', badge: 'badge-warning' },
  2: { label: '中丹', badge: 'badge-info' },
  3: { label: '通元', badge: 'badge-muted' },
};

async function initYinmaiPage() {
  await initHeader('yinmai');

  const container = document.getElementById('app');
  container.appendChild(el('h1', { class: 'page-title' }, '隐脉查询系统'));
  const version = await getDataVersion().catch(() => '');
  container.appendChild(el('p', { class: 'page-subtitle' }, `数据日期：${version || '加载中...'}`));

  // 加载中
  const loadingEl = el('div', { class: 'loading-spinner', id: 'loading' }, [
    el('div', { class: 'spinner' }),
    el('p', {}, '加载数据中...'),
  ]);
  container.appendChild(loadingEl);

  try {
    const [mapData, acupData, linkData] = await Promise.all([
      loadResource('meridianMapConfig'),
      loadResource('acupointConfig'),
      loadResource('meridianLinkConfig'),
    ]);
    meridianMap = mapData['玄脉图'] || {};
    acupointConfig = acupData['玄脉图'] || {};
    meridianLinkConfig = linkData['玄络'] || {};

    loadingEl.remove();

    // 选择栏
    const selectorBar = el('div', { class: 'meridian-selector-bar' });
    const dropdown = createMeridianDropdown();
    selectorBar.appendChild(dropdown);

    const showLinksBtn = el('button', {
      class: 'btn btn-outline',
      onclick: () => {
        totalAttributes = {};
        refreshTotalDisplay();
        showMeridianLinks(container);
      },
    }, '展示玄络');
    selectorBar.appendChild(showLinksBtn);

    container.appendChild(selectorBar);

    // 总属性
    container.appendChild(el('div', { class: 'total-attrs', id: 'totalAttrs' }, [
      el('div', { class: 'total-attrs-title' }, '总属性'),
      el('div', { class: 'total-attrs-list', id: 'totalAttrsList' }, el('span', { class: 'text-muted text-sm' }, '暂无装备玄络')),
    ]));

    // 窍关网格容器
    currentGridContainer = el('div', { class: 'meridian-grid', id: 'meridianGrid' });
    container.appendChild(currentGridContainer);

    // 默认显示第一个
    const sortedKeys = Object.keys(meridianMap).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
      return numA - numB;
    });

    if (sortedKeys.length > 0) {
      renderMindItem(sortedKeys[0]);
    }
  } catch (err) {
    console.error('加载数据失败:', err);
    loadingEl.innerHTML = '';
    loadingEl.appendChild(el('p', { class: 'text-center', style: { color: 'var(--danger)' } }, '加载数据失败，请检查网络后重试'));
  }
}

// 创建玄络图下拉选择
function createMeridianDropdown() {
  const sortedKeys = Object.keys(meridianMap).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
    const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
    return numA - numB;
  });

  const trigger = el('button', { class: 'dropdown-trigger' }, [
    el('span', {}, sortedKeys.length > 0 ? `玄络图${sortedKeys[0].match(/\d+/)?.[0]}` : '选择玄络图'),
    el('span', { class: 'text-muted' }, '▾'),
  ]);
  const menu = el('div', { class: 'dropdown-menu' });
  sortedKeys.forEach((key) => {
    const num = key.match(/\d+/)?.[0] || '';
    menu.appendChild(el('div', {
      class: 'dropdown-item',
      onclick: () => {
        trigger.querySelector('span').textContent = `玄络图${num}`;
        menu.classList.remove('open');
        totalAttributes = {};
        refreshTotalDisplay();
        renderMindItem(key);
      },
    }, `玄络图${num}`));
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));

  return el('div', { class: 'dropdown' }, [trigger, menu]);
}

// 渲染玄络图
function renderMindItem(mindItemKey) {
  const mindItem = meridianMap[mindItemKey];
  if (!mindItem || !currentGridContainer) return;
  clearChildren(currentGridContainer);

  const idNum = mindItemKey.match(/\d+/)?.[0] || '';

  // 标题与基础信息
  const infoEl = el('div', { class: 'mb-4', style: { gridColumn: '1 / -1' } }, [
    el('h3', { style: { marginBottom: '8px' } }, `玄络图${idNum} - ${mindItem.name}`),
  ]);

  // 资源
  if (mindItem.resource?.length) {
    const resText = mindItem.resource.map((r) => `${getResourceName(r[0])}: ${r[1]}`).join('  ');
    infoEl.appendChild(el('p', { class: 'text-sm', style: { color: 'var(--text-secondary)' } }, `需要：${resText}`));
  }
  if (mindItem.time) {
    infoEl.appendChild(el('p', { class: 'text-sm', style: { color: 'var(--text-secondary)' } }, `破境时间：${formatTime(mindItem.time)}`));
  }
  currentGridContainer.appendChild(infoEl);

  // 14 个窍关
  for (let i = 1; i <= 14; i++) {
    const grooveKey = `groove${i}`;
    const preconditionKey = `precondition${i}`;
    const groove = mindItem[grooveKey];
    if (!groove) continue;
    const precondition = mindItem[preconditionKey] || [];
    const grooveInfo = acupointConfig[groove];
    if (grooveInfo) {
      currentGridContainer.appendChild(createGrooveCard(i, grooveInfo, precondition));
    }
  }
}

// 创建窍关卡片
function createGrooveCard(index, grooveInfo, precondition) {
  const typeInfo = TYPE_INFO[grooveInfo.type] || { label: '未知', badge: 'badge-muted' };
  const classInfo = CLASS_INFO[grooveInfo.class] || { label: '未知', badge: 'badge-muted' };

  const card = el('div', { class: 'groove-card fade-in', 'data-groove': index });

  card.appendChild(el('span', { class: 'groove-order' }, String(index)));
  card.appendChild(el('div', { class: 'groove-name' }, `窍关${index}：${grooveInfo.name}`));

  // 类型标签
  card.appendChild(el('div', { class: 'groove-badges' }, [
    el('span', { class: `badge ${typeInfo.badge}` }, typeInfo.label),
    el('span', { class: `badge ${classInfo.badge}` }, classInfo.label),
  ]));

  // 资源
  if (grooveInfo.resource?.length) {
    card.appendChild(el('div', { class: 'groove-info-row' }, [
      el('span', { class: 'text-muted' }, '资源：'),
      grooveInfo.resource.map((r) => `${getResourceName(r[0])}×${r[1]}`).join('，'),
    ]));
  }

  // 时间
  if (grooveInfo.time) {
    card.appendChild(el('div', { class: 'groove-info-row' }, [
      el('span', { class: 'text-muted' }, '时间：'),
      formatTime(grooveInfo.time),
    ]));
  }

  // 前置条件
  if (precondition.length > 0) {
    card.appendChild(el('div', { class: 'groove-preconditions' }, [
      el('div', { class: 'groove-precondition-title' }, '前置要求：'),
      el('div', { class: 'groove-precondition-list' },
        precondition.map((p) => el('span', { class: 'badge badge-muted' }, p)),
      ),
    ]));
  }

  // 操作按钮
  card.appendChild(el('div', { class: 'groove-actions' }, [
    el('button', {
      class: 'btn btn-primary btn-sm',
      onclick: (e) => {
        e.stopPropagation();
        showLinkSelectModal(grooveInfo, card);
      },
    }, '装备玄络'),
    el('button', {
      class: 'btn btn-outline btn-sm',
      onclick: (e) => {
        e.stopPropagation();
        if (unequipLink(card)) toast('已卸下', 'success', 1000);
      },
    }, '卸下'),
  ]));

  return card;
}

// 显示玄络选择弹窗
function showLinkSelectModal(grooveInfo, grooveElement) {
  const typeInfo = TYPE_INFO[grooveInfo.type] || { label: '未知' };
  const classInfo = CLASS_INFO[grooveInfo.class] || { label: '未知' };

  const modal = new Modal({
    title: `选择玄络（${typeInfo.label}·${classInfo.label}）`,
    size: 'md',
  });

  const body = modal.getBody();
  const availableLinks = Object.values(meridianLinkConfig).filter(
    (link) => link.type === grooveInfo.type && link.class <= grooveInfo.class,
  );

  if (availableLinks.length === 0) {
    body.appendChild(el('div', { class: 'empty-state' }, [el('p', {}, '没有可用的玄络')]));
    modal.show();
    return;
  }

  availableLinks.forEach((link) => {
    const isEquipped = grooveElement.dataset.linkId === link.id;
    const isUsedElsewhere = isLinkUsedElsewhere(link.id, grooveElement);

    const item = el('div', { class: 'link-list-item' });
    item.appendChild(el('div', { class: 'link-item-header' }, [
      el('div', { class: 'flex gap-2 items-center' }, [
        el('span', { class: `badge ${TYPE_INFO[link.type]?.badge || 'badge-muted'}` }, TYPE_INFO[link.type]?.label || ''),
        el('span', { class: `badge ${CLASS_INFO[link.class]?.badge || 'badge-muted'}` }, CLASS_INFO[link.class]?.label || ''),
      ]),
      el('strong', { class: 'link-item-name' }, link.name),
    ]));

    item.appendChild(el('div', { class: 'link-item-info' }, `解锁条件：${link.Unlocktext || '无'}`));
    if (link.resource?.length) {
      item.appendChild(el('div', { class: 'link-item-info' }, `资源：${link.resource.map((r) => `${getResourceName(r[0])}: ${r[1]}`).join('，')}`));
    }
    item.appendChild(el('div', { class: 'link-item-info' }, `属性加成：${formatProperties(link.property)}`));
    if (link.specialproperty?.length > 0) {
      item.appendChild(el('div', { class: 'link-item-info' }, `特殊加成：${formatProperties(link.specialproperty)}`));
    }

    const btn = el('button', {
      class: 'btn btn-primary btn-sm mt-2',
      disabled: isEquipped || isUsedElsewhere ? 'disabled' : null,
      onclick: () => {
        if (equipLink(grooveElement, link.id)) {
          toast(`已装备「${link.name}」`, 'success', 1500);
          modal.close();
        }
      },
    }, isEquipped ? '已装备' : isUsedElsewhere ? '已使用' : '装备');

    item.appendChild(el('div', { class: 'text-right mt-2' }, btn));
    body.appendChild(item);
  });

  modal.show();
}

function isLinkUsedElsewhere(linkId, currentGroove) {
  if (!currentGridContainer) return false;
  return Array.from(currentGridContainer.querySelectorAll('.groove-card'))
    .filter((item) => item !== currentGroove)
    .some((item) => item.dataset.linkId === linkId);
}

function formatProperties(properties) {
  if (!properties?.length) return '无';
  return properties.map((prop) => {
    const element = getElementName(prop[2]);
    const type = prop[1] === 'defDamageClass' ? '防御' : '伤害';
    return `${element}${type}: ${formatPercent(prop[3])}`;
  }).join('，');
}

// 装备玄络
function equipLink(grooveElement, linkId) {
  const link = meridianLinkConfig[linkId];
  if (!link) return false;

  const prevId = grooveElement.dataset.linkId;
  if (prevId === linkId) return true;
  if (prevId) unequipLink(grooveElement);

  grooveElement.dataset.linkId = linkId;
  updateTotalAttributes('add', link);
  renderEquippedInfo(grooveElement, link);
  return true;
}

// 卸下玄络
function unequipLink(grooveElement) {
  const linkId = grooveElement.dataset.linkId;
  if (!linkId) return false;
  const link = meridianLinkConfig[linkId];
  if (link) updateTotalAttributes('remove', link);
  delete grooveElement.dataset.linkId;
  const info = grooveElement.querySelector('.groove-equipped-info');
  if (info) info.remove();
  return true;
}

// 渲染已装备信息
function renderEquippedInfo(grooveElement, link) {
  let info = grooveElement.querySelector('.groove-equipped-info');
  if (!info) {
    info = el('div', { class: 'groove-equipped-info' });
    grooveElement.appendChild(info);
  }
  clearChildren(info);
  info.appendChild(el('p', {}, [el('strong', {}, link.name)]));
  info.appendChild(el('p', { class: 'text-sm' }, `属性：${formatProperties(link.property)}`));
  if (link.specialproperty?.length > 0) {
    info.appendChild(el('p', { class: 'text-sm' }, `特殊：${formatProperties(link.specialproperty)}`));
  }
  info.appendChild(el('p', { class: 'text-sm text-muted' }, `解锁：${link.Unlocktext || '无'}`));
}

// 更新总属性
function updateTotalAttributes(operation, linkData) {
  const modifier = operation === 'add' ? 1 : -1;
  linkData.property?.forEach((prop) => {
    const [, propType, elementId, value] = prop;
    const key = `${propType}_${elementId}`;
    totalAttributes[key] = (totalAttributes[key] || 0) + value * modifier;
  });
  linkData.specialproperty?.forEach((prop) => {
    const [, propType, elementId, value] = prop;
    const key = `${propType}_${elementId}`;
    totalAttributes[key] = (totalAttributes[key] || 0) + value * modifier;
  });
  refreshTotalDisplay();
}

function refreshTotalDisplay() {
  const list = document.getElementById('totalAttrsList');
  if (!list) return;
  clearChildren(list);
  const entries = Object.entries(totalAttributes).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    list.appendChild(el('span', { class: 'text-muted text-sm' }, '暂无装备玄络'));
    return;
  }
  entries.forEach(([key, value]) => {
    const [propType, elementId] = key.split('_');
    const element = getElementName(elementId);
    const type = propType === 'defDamageClass' ? '防御' : '伤害';
    list.appendChild(el('span', { class: 'total-attr-item' }, `${element}${type}: ${formatPercent(value)}`));
  });
}

// 展示所有玄络（分类：正基/中丹/通元）
function showMeridianLinks(container) {
  // 清除窍关网格
  if (currentGridContainer) currentGridContainer.innerHTML = '';

  const categories = { 正基: [], 中丹: [], 通元: [] };
  Object.values(meridianLinkConfig).forEach((link) => {
    const cat = link.class === 1 ? '正基' : link.class === 2 ? '中丹' : '通元';
    categories[cat].push(link);
  });

  // 标签页
  const tabsEl = el('div', { class: 'tabs', id: 'linkTabs' }, [
    el('div', { class: 'tab active', 'data-tab': '正基' }, `正基 (${categories['正基'].length})`),
    el('div', { class: 'tab', 'data-tab': '中丹' }, `中丹 (${categories['中丹'].length})`),
    el('div', { class: 'tab', 'data-tab': '通元' }, `通元 (${categories['通元'].length})`),
  ]);
  currentGridContainer.appendChild(el('div', { style: { gridColumn: '1 / -1' } }, [tabsEl]));

  const contents = {};
  ['正基', '中丹', '通元'].forEach((cat) => {
    const content = el('div', { class: `tab-content ${cat === '正基' ? 'active' : ''}`, 'data-content': cat, style: { gridColumn: '1 / -1' } });
    categories[cat].forEach((link) => {
      const item = el('div', { class: 'link-list-item' });
      item.appendChild(el('div', { class: 'link-item-header' }, [
        el('div', { class: 'flex gap-2 items-center' }, [
          el('span', { class: `badge ${TYPE_INFO[link.type]?.badge || 'badge-muted'}` }, TYPE_INFO[link.type]?.label || ''),
          el('span', { class: `badge ${CLASS_INFO[link.class]?.badge || 'badge-muted'}` }, CLASS_INFO[link.class]?.label || ''),
        ]),
        el('strong', { class: 'link-item-name' }, link.name),
      ]));
      item.appendChild(el('div', { class: 'link-item-info' }, `解锁条件：${link.Unlocktext || '无'}`));
      if (link.resource?.length) item.appendChild(el('div', { class: 'link-item-info' }, `资源：${link.resource.map((r) => `${getResourceName(r[0])}: ${r[1]}`).join('，')}`));
      item.appendChild(el('div', { class: 'link-item-info' }, `属性加成：${formatProperties(link.property)}`));
      if (link.specialproperty?.length > 0) item.appendChild(el('div', { class: 'link-item-info' }, `特殊加成：${formatProperties(link.specialproperty)}`));
      if (link.SUnlocktext) item.appendChild(el('div', { class: 'link-item-info text-muted' }, `特殊加成解锁条件：${link.SUnlocktext}`));
      content.appendChild(item);
    });
    contents[cat] = content;
    currentGridContainer.appendChild(content);
  });

  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    Object.values(contents).forEach((c) => c.classList.remove('active'));
    contents[tab.dataset.tab].classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', initYinmaiPage);
