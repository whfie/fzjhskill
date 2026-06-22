// 武学查询页面 - 主逻辑
import '../styles/main.css';
import { initHeader } from '../components/Header.js';
import { createSearchBar, getSearchValue } from '../components/SearchBar.js';
import {
  createFilterPanel, populateFilterBadges, getUniqueValues,
  matchesFilters, filterState,
} from '../components/FilterPanel.js';
import { createSkillCard } from '../components/SkillCard.js';
import { showSkillDetail } from '../components/SkillDetailModal.js';
import { loadResource, loadResources, getDataVersion } from '../core/dataLoader.js';
import { setSkillLookup } from '../data/conditionParser.js';
import { el, clearChildren, batchRender } from '../utils/dom.js';

let skillData = null;
let activeSkillData = null;
let skillAutoData = null;
let bookSkillUnlockData = null;
let searchIndex = new Map();

// 构建搜索索引
function buildSearchIndex(skillsData, activeData) {
  searchIndex.clear();
  if (!skillsData?.skills || !activeData?.skillRelation) return;
  for (const [skillId, skill] of Object.entries(skillsData.skills)) {
    const parts = [JSON.stringify(skill)];
    for (const [, relation] of Object.entries(activeData.skillRelation)) {
      if (relation.skillId !== skillId) continue;
      const activeSkill = activeData.ActiveZhao[relation.id];
      if (!activeSkill) continue;
      for (const val of Object.values(activeSkill)) {
        if (val != null) parts.push(String(val));
      }
      if (activeSkill.effects && activeData.Effect) {
        const regex = /\{"([^"]+)"/g;
        let m;
        while ((m = regex.exec(activeSkill.effects)) !== null) {
          const effectData = activeData.Effect[m[1]];
          if (effectData) parts.push(JSON.stringify(effectData));
        }
      }
    }
    searchIndex.set(skillId, parts.join(' ').toLowerCase());
  }
}

async function initWuxuePage() {
  await initHeader('wuxue');

  const container = document.getElementById('app');
  container.appendChild(el('h1', { class: 'page-title' }, '武学技能查询'));
  const version = await getDataVersion().catch(() => '');
  container.appendChild(el('p', { class: 'page-subtitle' }, `数据日期：${version || '加载中...'}`));

  // 搜索栏
  container.appendChild(createSearchBar(refreshList));

  // 过滤面板
  container.appendChild(createFilterPanel(refreshList));

  // 统计信息
  container.appendChild(el('div', { class: 'stats-info', id: 'statsInfo' }, ''));

  // 技能列表容器
  const listContainer = el('div', { class: 'card-grid', id: 'skillList' });
  container.appendChild(listContainer);

  // 加载中
  showLoading(listContainer);

  try {
    // 优先加载核心数据
    skillData = await loadResource('skill');
    // 修正 yidaoliu 武器类型
    if (skillData.skills?.yidaoliu) {
      skillData.skills.yidaoliu.weapontype = 'jianfa1,jianfa2,jianfa3,jianfa4,jianfa5,daofa1,daofa2,daofa3,daofa4,daofa5';
    }

    // 注入技能查询回调
    setSkillLookup((id) => skillData?.skills?.[id] ? { name: skillData.skills[id].name } : null);

    // 立即渲染
    refreshList();

    // 填充过滤器
    populateFilterBadges('familyFilters', getUniqueValues(skillData.skills, 'familyList'), 'family', refreshList);
    populateFilterBadges('elementFilters', getUniqueValues(skillData.skills, 'autoZhaoAtkDamageClass'), 'element', refreshList);
    populateFilterBadges('methodsFilters', getUniqueValues(skillData.skills, 'methods'), 'methods', refreshList);

    // 并行加载附加数据（bookSkills 失败不阻塞主流程）
    const [activeZhaoRes, skillAutoRes, bookSkillsRes] = await Promise.all([
      loadResource('activeZhao').catch((e) => { console.warn('activeZhao 加载失败:', e); return null; }),
      loadResource('skillAuto').catch((e) => { console.warn('skillAuto 加载失败:', e); return null; }),
      loadResource('bookSkills').catch((e) => { console.warn('bookSkills 加载失败:', e); return null; }),
    ]);
    activeSkillData = activeZhaoRes;
    skillAutoData = skillAutoRes;
    bookSkillUnlockData = bookSkillsRes;

    // 建立搜索索引
    buildSearchIndex(skillData, activeSkillData);

    // 若搜索框已有内容则重新刷新
    if (getSearchValue().trim()) refreshList();
  } catch (err) {
    console.error('加载数据失败:', err);
    listContainer.innerHTML = '';
    listContainer.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, '!'),
      el('p', {}, '加载数据失败，请检查网络后重试'),
    ]));
  }
}

function showLoading(container) {
  clearChildren(container);
  container.appendChild(el('div', { class: 'loading-spinner' }, [
    el('div', { class: 'spinner' }),
    el('p', {}, '加载数据中...'),
  ]));
}

function refreshList() {
  const container = document.getElementById('skillList');
  if (!container || !skillData?.skills) return;

  clearChildren(container);
  const searchText = getSearchValue();
  const cards = [];
  let filteredCount = 0;
  const totalCount = Object.keys(skillData.skills).length;

  Object.entries(skillData.skills)
    .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''))
    .forEach(([id, skill]) => {
      if (typeof skill === 'object' && skill !== null && matchesFilters(skill, searchText, searchIndex)) {
        filteredCount++;
        cards.push(createSkillCard(id, skill, handleCardClick));
      }
    });

  // 统计
  const stats = document.getElementById('statsInfo');
  if (stats) stats.textContent = `共 ${filteredCount} / ${totalCount} 项`;

  if (cards.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, '?'),
      el('p', {}, '没有匹配的武学'),
    ]));
    return;
  }

  // 批量渲染
  batchRender(cards, container, 30, 16);
}

async function handleCardClick(skillId, skill) {
  // 确保附加数据已加载
  if (!activeSkillData) {
    try {
      const [activeZhaoRes, skillAutoRes, bookSkillsRes] = await Promise.all([
        loadResource('activeZhao').catch(() => null),
        loadResource('skillAuto').catch(() => null),
        loadResource('bookSkills').catch(() => null),
      ]);
      activeSkillData = activeZhaoRes;
      skillAutoData = skillAutoRes;
      bookSkillUnlockData = bookSkillsRes;
      buildSearchIndex(skillData, activeSkillData);
    } catch (e) {
      console.error('加载附加数据失败:', e);
    }
  }
  showSkillDetail(skillId, skill, { activeSkillData, skillAutoData, bookSkillUnlockData });
}

document.addEventListener('DOMContentLoaded', initWuxuePage);
