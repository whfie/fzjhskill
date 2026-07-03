import '../styles/main.css';
import { initHeader } from '../components/Header.js';
import { createSearchBar, getSearchValue } from '../components/SearchBar.js';
import {
  createEquipmentFilterPanel,
  populateEquipmentFilterBadges,
  matchesEquipmentFilters,
  sortEquipment,
} from '../components/EquipmentFilterPanel.js';
import { createEquipmentCard } from '../components/EquipmentCard.js';
import { loadResource, loadVersion } from '../core/dataLoader.js';
import { el, clearChildren, batchRender } from '../utils/dom.js';
import { toast } from '../components/Toast.js';

let equipmentData = null;
let currentRenderPromise = null;
let listRefreshSeq = 0;
let initialized = false;

function showLoadingInList(container, text) {
  if (!container) return;
  clearChildren(container);
  container.appendChild(
    el('div', { class: 'loading-spinner' }, [
      el('div', { class: 'spinner' }),
      el('p', {}, text || '加载数据中...'),
    ]),
  );
}

function showEmptyState(container, text) {
  if (!container) return;
  clearChildren(container);
  container.appendChild(
    el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, '?'),
      el('p', {}, text || '没有匹配的装备'),
    ]),
  );
}

function updateStats(filteredCount, totalCount) {
  const stats = document.getElementById('equipmentStatsInfo');
  if (!stats) return;
  if (totalCount == null) {
    stats.textContent = '数据加载中...';
    return;
  }
  stats.textContent = `共 ${filteredCount ?? 0} / ${totalCount} 项`;
}

async function initEquipmentPage() {
  if (initialized) return;
  initialized = true;

  const headerTask = initHeader('equipment').catch(() => {});
  const versionTask = loadVersion().catch(() => null);

  const container = document.getElementById('app');

  container.appendChild(el('h1', { class: 'page-title' }, '装备查询'));
  const versionText = (await versionTask)?.version || '';
  container.appendChild(
    el(
      'p',
      { class: 'page-subtitle' },
      `数据日期：${versionText || '加载中...'}`,
    ),
  );
  container.appendChild(createSearchBar(safeRefresh));
  container.appendChild(createEquipmentFilterPanel(safeRefresh));
  container.appendChild(
    el('div', { class: 'stats-info', id: 'equipmentStatsInfo' }, '加载中...'),
  );

  const listContainer = el('div', { class: 'equipment-card-grid', id: 'equipmentList' });
  container.appendChild(listContainer);

  showLoadingInList(listContainer);

  await headerTask;

  try {
    equipmentData = await loadResource('equipment');
    if (!equipmentData) throw new Error('装备数据格式异常');

    safeRefresh();

    populateEquipmentFilterBadges(equipmentData, safeRefresh);
  } catch (err) {
    console.error('加载数据失败:', err);
    showEmptyState(listContainer, '加载数据失败，请刷新页面重试');
    toast('数据加载失败', 'error');
  }
}

function safeRefresh() {
  const mySeq = ++listRefreshSeq;
  refreshList(mySeq);
}

function refreshList(seq) {
  const container = document.getElementById('equipmentList');
  if (!container) return;

  if (!equipmentData) {
    showEmptyState(container, '数据加载中...');
    updateStats(null, null);
    return;
  }

  if (
    currentRenderPromise &&
    typeof currentRenderPromise.abort === 'function'
  ) {
    try {
      currentRenderPromise.abort();
    } catch {}
  }

  const searchText = getSearchValue();
  const cards = [];
  let filteredCount = 0;
  const totalCount = Object.keys(equipmentData).length;

  const filteredItems = Object.values(equipmentData).filter((item) => {
    if (typeof item !== 'object' || item === null) return false;
    return matchesEquipmentFilters(item, searchText);
  });

  const sortedItems = sortEquipment(filteredItems);

  sortedItems.forEach((item) => {
    filteredCount++;
    cards.push(createEquipmentCard(item));
  });

  updateStats(filteredCount, totalCount);

  if (cards.length === 0) {
    clearChildren(container);
    showEmptyState(container, '没有匹配的装备');
    return;
  }

  clearChildren(container);
  currentRenderPromise = batchRender(cards, container, 30, 16);
}

document.addEventListener('DOMContentLoaded', initEquipmentPage);