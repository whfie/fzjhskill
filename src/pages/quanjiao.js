// 拳脚特性查询页面 - 主逻辑
// 数据：character.json（特性主表）+ characterPool.json（槽位映射）+ activeZhao（cond=2/3 效果表）
import '../styles/main.css';
import { initHeader } from '../components/Header.js';
import { createSearchBar, getSearchValue } from '../components/SearchBar.js';
import {
  createCharacterFilterPanel,
  populateCharFilterBadges,
  getCharUniqueValues,
  matchesCharFilters,
  getBranchLabel,
  isQianAn,
  isAn,
} from '../components/CharacterFilterPanel.js';
import { createCharacterCard } from '../components/CharacterCard.js';
import { loadResource, loadVersion } from '../core/dataLoader.js';
import { getConditionTypeName } from '../data/mappings.js';
import { el, clearChildren, batchRender } from '../utils/dom.js';
import { toast } from '../components/Toast.js';

// peculiarityid → 合并后的特性组
let peculiarityGroups = [];
// peculiarityid → 槽位集合（papool 末位）
const pecToSlots = new Map();
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
    : '（效果数据加载中，cond=2/3 效果可能无法查看）';
  stats.textContent = `共 ${filteredCount ?? 0} / ${totalCount} 项${extraHint}`;
}

// 将 character.json 原始数据按 peculiarityid 合并
function buildPeculiarityGroups(characterData) {
  // 数据结构：{ "1": { [id]: entry, ... } }
  const inner =
    characterData && characterData['1']
      ? characterData['1']
      : characterData || {};
  const byPec = new Map();
  Object.values(inner).forEach((entry) => {
    if (!entry || entry.peculiarityid == null) return;
    const key = entry.peculiarityid;
    if (!byPec.has(key)) {
      byPec.set(key, {
        peculiarityid: key,
        name: entry.name,
        text: entry.text,
        conditiontype: entry.conditiontype,
        opentext: entry.opentext,
        entries: [],
      });
    }
    byPec.get(key).entries.push(entry);
  });
  return Array.from(byPec.values());
}

// 从 characterPool 构建 peculiarityid → [槽位...] 映射
function buildPecToSlots(poolData) {
  const inner =
    poolData && poolData['1'] ? poolData['1'] : poolData || {};
  pecToSlots.clear();
  Object.values(inner).forEach((p) => {
    if (!p || p.peculiarityid == null || p.papool == null) return;
    const slot = Number(String(p.papool).slice(-1));
    if (!pecToSlots.has(p.peculiarityid)) pecToSlots.set(p.peculiarityid, []);
    pecToSlots.get(p.peculiarityid).push(slot);
  });
}

async function initQuanjiaoPage() {
  if (initialized) return;
  initialized = true;

  const headerTask = initHeader('quanjiao').catch(() => {});
  const versionTask = loadVersion().catch(() => null);

  const container = document.getElementById('app');

  container.appendChild(el('h1', { class: 'page-title' }, '拳脚特性查询'));
  const versionText = (await versionTask)?.version || '';
  container.appendChild(
    el('p', { class: 'page-subtitle' }, `数据日期：${versionText || '加载中...'}`),
  );
  container.appendChild(createSearchBar(safeRefresh));
  container.appendChild(createCharacterFilterPanel(safeRefresh));
  container.appendChild(
    el('div', { class: 'stats-info', id: 'statsInfo' }, '加载中...'),
  );

  const listContainer = el('div', { class: 'card-grid', id: 'characterList' });
  container.appendChild(listContainer);

  showLoadingInList(listContainer);

  await headerTask;

  try {
    const [characterData, poolData] = await Promise.all([
      loadResource('character'),
      loadResource('characterPool'),
    ]);
    if (!characterData) throw new Error('拳脚特性数据格式异常');

    peculiarityGroups = buildPeculiarityGroups(characterData);
    buildPecToSlots(poolData);

    if (peculiarityGroups.length === 0) {
      throw new Error('未解析到任何特性数据');
    }

    safeRefresh();

    // 填充过滤徽章
    populateCharFilterBadges(
      'charBranchFilters',
      getCharUniqueValues(peculiarityGroups, (g) =>
        String(g.peculiarityid).charAt(0),
      ).sort(),
      'branch',
      safeRefresh,
      getBranchLabel,
    );
    populateCharFilterBadges(
      'charConditionFilters',
      getCharUniqueValues(peculiarityGroups, (g) => g.conditiontype).sort(
        (a, b) => Number(a) - Number(b),
      ),
      'conditiontype',
      safeRefresh,
      getConditionTypeName,
    );

    // 可选槽位：从 pecToSlots 收集所有槽位值
    const allSlots = new Set();
    pecToSlots.forEach((slots) => slots.forEach((s) => allSlots.add(s)));
    populateCharFilterBadges(
      'charSlotFilters',
      Array.from(allSlots).sort((a, b) => a - b),
      'slot',
      safeRefresh,
      (s) => `${s}槽`,
    );

    // 特性类型：浅谙 / 谙
    populateCharFilterBadges(
      'charTypeFilters',
      ['qianan', 'an'],
      'type',
      safeRefresh,
      (t) => (t === 'qianan' ? '浅谙' : '谙'),
    );

    // 并行加载 activeZhao（cond=2/3 效果详情需要）
    loadExtras();
  } catch (err) {
    console.error('加载数据失败:', err);
    showEmptyState(listContainer, '加载数据失败，请刷新页面重试');
    toast('数据加载失败', 'error');
  }
}

// 加载 activeZhao（cond=2/3 的效果弹窗需要 Effect 表）
function loadExtras() {
  if (extrasLoadPromise) return extrasLoadPromise;
  extrasLoadPromise = (async () => {
    const results = await Promise.allSettled([loadResource('activeZhao')]);
    const [activeZhao] = results;
    activeSkillData =
      activeZhao.status === 'fulfilled' ? activeZhao.value : null;

    if (activeZhao.status === 'rejected') {
      console.warn('效果数据加载失败，已降级显示');
      toast('部分效果数据加载失败，cond=2/3 效果可能无法查看', 'warning');
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
  const container = document.getElementById('characterList');
  if (!container) return;

  if (peculiarityGroups.length === 0) {
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
  const totalCount = peculiarityGroups.length;

  peculiarityGroups
    .slice()
    .sort((a, b) => {
      // 先按分支（peculiarityid 首位），再按 peculiarityid 数值
      const ba = String(a.peculiarityid).charAt(0);
      const bb = String(b.peculiarityid).charAt(0);
      if (ba !== bb) return ba.localeCompare(bb);
      return Number(a.peculiarityid) - Number(b.peculiarityid);
    })
    .forEach((group) => {
      const slots = pecToSlots.get(group.peculiarityid) || [];
      if (matchesCharFilters(group, searchText, slots)) {
        filteredCount++;
        cards.push(
          createCharacterCard(group, slots, activeSkillData),
        );
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

document.addEventListener('DOMContentLoaded', initQuanjiaoPage);
