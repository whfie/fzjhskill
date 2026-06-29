// 神兵特性查询页面 - 主逻辑
import '../styles/main.css';
import { initHeader } from '../components/Header.js';
import { createSearchBar, getSearchValue } from '../components/SearchBar.js';
import {
  createWeaponSpecialFilterPanel,
  populateWSFilterBadges,
  getWSUniqueValues,
  matchesWSFilters,
} from '../components/WeaponSpecialFilterPanel.js';
import { createWeaponSpecialCard } from '../components/WeaponSpecialCard.js';
import {
  showRawDataModal,
  showWeaponSpecialEffect,
} from '../components/WeaponSpecialDetailModal.js';
import { loadResource, loadVersion } from '../core/dataLoader.js';
import { el, clearChildren, batchRender } from '../utils/dom.js';
import { toast } from '../components/Toast.js';
import { getConditionTypeName } from '../data/mappings.js';

let weaponSpecialsData = null;
let activeSkillData = null;
let extrasLoadPromise = null;
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
      el('p', {}, text || '没有匹配的特性'),
    ]),
  );
}

function updateStats(filteredCount, totalCount, extraReady) {
  const stats = document.getElementById('statsInfo');
  if (!stats) return;
  if (totalCount == null) {
    stats.textContent = '数据加载中...';
    return;
  }
  const extraHint = extraReady
    ? ''
    : '（效果数据加载中，特性效果可能无法查看）';
  stats.textContent = `共 ${filteredCount ?? 0} / ${totalCount} 项${extraHint}`;
}

async function initShenbingPage() {
  if (initialized) return;
  initialized = true;

  const headerTask = initHeader('shenbing').catch(() => {});
  const versionTask = loadVersion().catch(() => null);

  const container = document.getElementById('app');

  container.appendChild(el('h1', { class: 'page-title' }, '神兵特性查询'));
  const versionText = (await versionTask)?.version || '';
  container.appendChild(
    el(
      'p',
      { class: 'page-subtitle' },
      `数据日期：${versionText || '加载中...'}`,
    ),
  );
  container.appendChild(createSearchBar(safeRefresh));
  container.appendChild(createWeaponSpecialFilterPanel(safeRefresh));
  container.appendChild(
    el('div', { class: 'stats-info', id: 'statsInfo' }, '加载中...'),
  );

  const listContainer = el('div', { class: 'card-grid', id: 'specialList' });
  container.appendChild(listContainer);

  showLoadingInList(listContainer);

  await headerTask;

  try {
    weaponSpecialsData = await loadResource('weaponSpecials');
    if (!weaponSpecialsData) throw new Error('神兵特性数据格式异常');

    safeRefresh();

    populateWSFilterBadges(
      'wsWeapontypeFilters',
      getWSUniqueValues(weaponSpecialsData, 'weapontype'),
      'weapontype',
      safeRefresh,
      (v) => v,
    );
    populateWSFilterBadges(
      'wsConditionFilters',
      getWSUniqueValues(weaponSpecialsData, 'conditiontype').sort(
        (a, b) => Number(a) - Number(b),
      ),
      'conditiontype',
      safeRefresh,
      getConditionTypeName,
    );
    populateWSFilterBadges(
      'wsSpecialgetFilters',
      getWSUniqueValues(weaponSpecialsData, 'specialget').sort(
        (a, b) => Number(a) - Number(b),
      ),
      'specialget',
      safeRefresh,
      (v) => (Number(v) === 0 ? '自动解锁' : `${v}特性值`),
    );

    loadExtras();
  } catch (err) {
    console.error('加载数据失败:', err);
    showEmptyState(listContainer, '加载数据失败，请刷新页面重试');
    toast('数据加载失败', 'error');
  }
}

// 加载 activeZhao（conditiontype!=0 的特性效果需要查 Effect 表）
function loadExtras() {
  if (extrasLoadPromise) return extrasLoadPromise;
  extrasLoadPromise = (async () => {
    const results = await Promise.allSettled([loadResource('activeZhao')]);
    const [activeZhao] = results;
    activeSkillData =
      activeZhao.status === 'fulfilled' ? activeZhao.value : null;

    if (activeSkillData?.skillRelation) {
      const idx = new Map();
      for (const [activeSkillId, relation] of Object.entries(
        activeSkillData.skillRelation,
      )) {
        const sid = relation.skillId;
        if (!idx.has(sid)) idx.set(sid, []);
        idx.get(sid).push(activeSkillId);
      }
      activeSkillData._skillRelationIndex = idx;
    }

    if (activeZhao.status === 'rejected') {
      console.warn('效果数据加载失败，已降级显示');
      toast('部分效果数据加载失败，特性效果可能无法查看', 'warning');
    }
    safeRefresh();
    return activeSkillData;
  })().catch((err) => {
    console.error('loadExtras 失败:', err);
    extrasLoadPromise = null;
    return null;
  });
  return extrasLoadPromise;
}

function safeRefresh() {
  const mySeq = ++listRefreshSeq;
  refreshList(mySeq);
}

function refreshList(seq) {
  const container = document.getElementById('specialList');
  if (!container) return;

  if (!weaponSpecialsData) {
    showEmptyState(container, '数据加载中...');
    updateStats(null, null, !!activeSkillData);
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
  const totalCount = Object.keys(weaponSpecialsData).length;

  Object.entries(weaponSpecialsData)
    .sort(([, a], [, b]) => {
      const wt = (a.weapontype || '').localeCompare(b.weapontype || '', 'zh');
      if (wt !== 0) return wt;
      return Number(a.specialget) - Number(b.specialget);
    })
    .forEach(([id, special]) => {
      if (
        typeof special === 'object' &&
        special !== null &&
        matchesWSFilters(special, searchText)
      ) {
        filteredCount++;
        cards.push(createWeaponSpecialCard(id, special, handleCardAction));
      }
    });

  updateStats(filteredCount, totalCount, !!activeSkillData);

  if (cards.length === 0) {
    clearChildren(container);
    showEmptyState(container, '没有匹配的特性');
    return;
  }

  clearChildren(container);
  currentRenderPromise = batchRender(cards, container, 30, 16);
}

async function handleCardAction(action, id, special) {
  if (action === 'rawData') {
    showRawDataModal(special);
    return;
  }

  if (action === 'effect') {
    // conditiontype=0 仅用 formula，无需 activeZhao；其余需等待效果数据
    if (special.conditiontype !== 0) {
      if (!extrasLoadPromise) loadExtras();
      try {
        await extrasLoadPromise;
      } catch {
        // loadExtras 内部已 catch，这里仅兜底
      }
      if (!activeSkillData) {
        toast('效果数据仍在加载，请稍后', 'info', 1500);
        return;
      }
    }
    showWeaponSpecialEffect(special, activeSkillData);
  }
}

document.addEventListener('DOMContentLoaded', initShenbingPage);
