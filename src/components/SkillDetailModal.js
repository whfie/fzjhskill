// 武学详情弹窗 - 拆分为独立弹窗：基础属性 / 单个主动技能 / 被动技能表格
import { el } from '../utils/dom.js';
import { Modal } from './Modal.js';
import {
  getMethodCN,
} from '../data/mappings.js';
import { collectConditions, getBookLearnText } from '../data/conditionParser.js';
import { showEffectDetail } from './EffectDetailModal.js';
import { parseEffects } from '../utils/format.js';

// 查找关联的主动技能
export function findActiveSkills(skillId, activeSkillData) {
  if (!activeSkillData?.skillRelation) return [];
  const groups = [];
  for (const [activeSkillId, relation] of Object.entries(activeSkillData.skillRelation)) {
    if (relation.skillId !== skillId) continue;
    const baseSkillId = relation.id;
    const baseSkill = activeSkillData.ActiveZhao[baseSkillId];
    if (!baseSkill) continue;
    const skills = [];
    for (let i = 1; i <= 11; i++) {
      const currentId = i === 1 ? baseSkillId : `${baseSkillId}${i}`;
      if (activeSkillData.ActiveZhao[currentId]) {
        skills.push({ id: currentId, level: i, data: activeSkillData.ActiveZhao[currentId] });
      }
    }
    groups.push({ activeId: baseSkillId, baseActive: baseSkill, allActives: skills });
  }
  return groups;
}

// 创建效果链接 HTML
function createEffectLinksHtml(effectsStr, cost) {
  if (!effectsStr) return '';
  const effects = parseEffects(effectsStr);
  return effects.map((eff) => {
    const costAttr = cost !== undefined ? ` data-cost="${cost}"` : '';
    return `{<span class="effect-link" data-effect-id="${eff.id}" data-z="${eff.z}"${costAttr}>"${eff.id}"</span>${eff.z ? ',' + eff.z : ''}}`;
  }).join(';');
}

// 查找入场效果链接
function getEnterEffectLinks(activeSkillData, activeLevelId) {
  if (!activeSkillData?.enterEffect) return '';
  const links = [];
  for (const [key, entry] of Object.entries(activeSkillData.enterEffect)) {
    if ((entry.id === activeLevelId || key === activeLevelId) && entry.effectId) {
      links.push(createEffectLinksHtml(entry.effectId));
    }
  }
  return links.join(' ');
}

// 查找被动效果链接
function getPassiveEffectLinks(activeSkillData, activeLevelId) {
  if (!activeSkillData?.passiveEffect) return '';
  const links = [];
  for (const [key, entry] of Object.entries(activeSkillData.passiveEffect)) {
    if ((entry.skillId === activeLevelId || entry.id === activeLevelId || key === activeLevelId) && entry.effectId) {
      links.push(createEffectLinksHtml(entry.effectId));
    }
  }
  return links.join(' ');
}

// 渲染条件卡片
function renderConditionCard(label, conditions) {
  if (!conditions.length) return null;
  return el('div', { class: 'condition-card' }, [
    el('div', { class: 'condition-card-title' }, label),
    el('div', { class: 'condition-card-body' },
      conditions.map((c) => el('div', { class: 'condition-item' }, c)),
    ),
  ]);
}

// 绑定效果链接点击
function bindEffectLinks(body, activeSkillData) {
  body.addEventListener('click', (e) => {
    const link = e.target.closest('.effect-link');
    if (!link) return;
    const effectId = link.dataset.effectId;
    const zStr = link.dataset.z;
    const costVal = link.dataset.cost;
    const defaultParams = {};
    if (zStr) {
      zStr.split(',').forEach((p, idx) => { defaultParams[`z${idx + 1}`] = parseFloat(p.trim()) || 0; });
    }
    if (costVal != null) defaultParams.cost = parseFloat(costVal) || 0;
    showEffectDetail(effectId, activeSkillData, defaultParams);
  });
}

// ===== 基础属性弹窗 =====
export function showBasicAttributesModal(skillId, skill) {
  const modal = new Modal({
    title: `${skill.name || skillId} - 基础属性`,
    size: 'lg',
  });
  const body = modal.getBody();
  body.appendChild(el('div', { class: 'json-viewer' }, JSON.stringify(skill, null, 2)));
  modal.show();
}

// ===== 单个主动技能弹窗 =====
export function showActiveSkillModal(skillName, activeId, activeSkillData, bookSkillUnlockData) {
  const groups = findActiveSkillsByActiveId(activeId, activeSkillData);
  const group = groups[0];
  if (!group) return;

  const { baseActive, allActives } = group;
  const modal = new Modal({
    title: `${skillName || baseActive.name || activeId} - 主动技能`,
    size: 'lg',
  });
  const body = modal.getBody();

  const groupEl = renderActiveSkillGroup(group, activeSkillData, bookSkillUnlockData);
  body.appendChild(groupEl);

  bindEffectLinks(body, activeSkillData);
  modal.show();
}

// 展示该武学的所有主动技能
export function showAllActiveSkillsModal(skillName, skillId, activeSkillData, bookSkillUnlockData) {
  const groups = findActiveSkills(skillId, activeSkillData);
  if (groups.length === 0) return;

  const modal = new Modal({
    title: `${skillName || skillId} - 主动技能`,
    size: 'lg',
  });
  const body = modal.getBody();

  groups.forEach((group) => {
    body.appendChild(renderActiveSkillGroup(group, activeSkillData, bookSkillUnlockData));
  });

  bindEffectLinks(body, activeSkillData);
  modal.show();
}

// 通过 activeId 查找技能组
function findActiveSkillsByActiveId(activeId, activeSkillData) {
  if (!activeSkillData?.ActiveZhao) return [];
  const baseSkill = activeSkillData.ActiveZhao[activeId];
  if (!baseSkill) return [];
  const skills = [];
  for (let i = 1; i <= 11; i++) {
    const currentId = i === 1 ? activeId : `${activeId}${i}`;
    if (activeSkillData.ActiveZhao[currentId]) {
      skills.push({ id: currentId, level: i, data: activeSkillData.ActiveZhao[currentId] });
    }
  }
  return [{ activeId, baseActive: baseSkill, allActives: skills }];
}

// 渲染单个主动技能组（复用原逻辑）
function renderActiveSkillGroup(group, activeSkillData, bookSkillUnlockData) {
  const { activeId, baseActive, allActives } = group;
  const groupEl = el('div', { class: 'active-skill-group' });

  // 头部
  const typeBadge = baseActive.type
    ? el('span', { class: `badge ${baseActive.type === '释放' ? 'badge-success' : baseActive.type === '攻击' ? 'badge-danger' : 'badge-muted'}` }, `${baseActive.type}类`)
    : null;
  const levelNames = { 1: '低级残页', 2: '中级残页', 3: '高级残页', 4: '顶级残页' };
  const levelBadge = baseActive.level && levelNames[baseActive.level]
    ? el('span', { class: 'badge badge-info' }, levelNames[baseActive.level])
    : null;

  const header = el('div', { class: 'active-skill-header' }, [
    el('div', { class: 'header-left' }, [
      el('span', { class: 'active-skill-name' }, baseActive.name || activeId),
      ...(typeBadge ? [typeBadge] : []),
      ...(levelBadge ? [levelBadge] : []),
    ]),
    el('button', {
      class: 'expand-base-btn',
      'data-active-id': activeId,
      onclick: (e) => {
        const btn = e.currentTarget;
        const pre = groupEl.querySelector(`.base-data-${activeId}`);
        const expanded = btn.dataset.expanded === 'true';
        pre.style.display = expanded ? 'none' : 'block';
        btn.dataset.expanded = !expanded;
        btn.textContent = expanded ? '原始数据 ▾' : '原始数据 ▴';
      },
    }, '原始数据 ▾'),
  ]);
  groupEl.appendChild(header);

  // 原始数据块
  const baseDataPre = document.createElement('pre');
  baseDataPre.className = `base-data-pre base-data-${activeId}`;
  baseDataPre.textContent = JSON.stringify(baseActive, null, 2);
  baseDataPre.style.display = 'none';
  groupEl.appendChild(baseDataPre);

  if (allActives.length > 1) {
    const firstData = allActives[0].data;

    // 学习条件
    const learnConditions = collectConditions('learn', firstData);
    const bookText = getBookLearnText(activeId, activeSkillData, bookSkillUnlockData);
    if (bookText) learnConditions.unshift(bookText);
    const learnCard = renderConditionCard('学习条件', learnConditions);
    if (learnCard) groupEl.appendChild(learnCard);

    // 使用条件
    const useConditions = collectConditions('use', firstData);
    if (baseActive.methods != null) {
      const methodName = getMethodCN(Number(baseActive.methods));
      if (methodName) useConditions.push(`准备在【${methodName}】位置`);
    }
    const useCard = renderConditionCard('使用条件', useConditions);
    if (useCard) groupEl.appendChild(useCard);

    // 各重数差异
    const levelSection = el('div', { class: 'level-diff-section' });
    levelSection.appendChild(el('div', { class: 'level-diff-header' }, [
      el('span', { class: 'text-sm', style: { fontWeight: '600', color: 'var(--text-secondary)' } }, '各重数差异'),
      el('span', {
        class: 'level-diff-toggle',
        onclick: (e) => {
          const expanded = e.target.dataset.expanded === 'true';
          levelSection.querySelectorAll('.level-row').forEach((row) => {
            const level = parseInt(row.dataset.level);
            if (level <= 8) row.style.display = expanded ? 'none' : 'flex';
          });
          e.target.dataset.expanded = !expanded;
          e.target.textContent = expanded ? '展开 ▾' : '收起 ▴';
        },
      }, '展开 ▾'),
    ]));

    allActives.forEach((skill, index) => {
      if (index > 9) return;
      const parts = [];
      const fieldLabel = { desc: '描述', pvpcd: 'PVP冷却', cost: '内力消耗' };
      Object.entries(skill.data)
        .filter(([key]) => ['desc', 'pvpcd', 'cost', 'effects'].includes(key))
        .forEach(([key, value]) => {
          if (key === 'effects') {
            parts.push(el('div', {}, [
              el('span', { class: 'text-muted text-xs' }, '主动效果 '),
              el('span', { html: createEffectLinksHtml(value, skill.data.cost) }),
            ]));
            const enterLinks = getEnterEffectLinks(activeSkillData, skill.id);
            const passiveLinks = getPassiveEffectLinks(activeSkillData, skill.id);
            if (enterLinks) parts.push(el('div', {}, [el('span', { class: 'text-muted text-xs' }, '入场效果 '), el('span', { html: enterLinks })]));
            if (passiveLinks) parts.push(el('div', {}, [el('span', { class: 'text-muted text-xs' }, '被动效果 '), el('span', { html: passiveLinks })]));
          } else {
            parts.push(el('div', {}, [el('span', { class: 'text-muted text-xs' }, `${fieldLabel[key] || key} `), String(value)]));
          }
        });

      const isHidden = index < 8;
      levelSection.appendChild(el('div', {
        class: 'level-row',
        'data-level': index + 1,
        style: { display: isHidden ? 'none' : 'flex' },
      }, [
        el('span', { class: 'level-label' }, `第${skill.level}重`),
        el('div', { class: 'level-content' }, parts),
      ]));
    });

    groupEl.appendChild(levelSection);
  }

  return groupEl;
}

// ===== 被动技能弹窗 =====
export function showPassiveSkillsModal(skillName, skillId, skillAutoData) {
  const passiveSkills = skillAutoData?.[skillId];
  const modal = new Modal({
    title: `${skillName || skillId} - 被动招式`,
    size: 'lg',
  });
  const body = modal.getBody();

  if (!passiveSkills) {
    body.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, '—'),
      el('p', {}, '该武学没有关联的被动技能'),
    ]));
    modal.show();
    return;
  }

  const skills = Object.values(passiveSkills);

  // 表格（与主动技能风格统一）
  const tableWrap = el('div', { class: 'passive-table-wrap' });
  const table = el('table', { class: 'passive-table' });
  table.appendChild(el('thead', {}, [el('tr', {}, [
    el('th', {}, '技能效果'),
    el('th', {}, '描述'),
    el('th', {}, '攻击系数'),
    el('th', {}, '伤害力'),
    el('th', {}, '命中率'),
    el('th', {}, '前后摇'),
    el('th', {}, '伤害类型'),
    el('th', {}, '解锁等级'),
  ])]));

  const tbody = el('tbody', {});
  skills.forEach((s) => {
    tbody.appendChild(el('tr', {}, [
      el('td', {}, s.skillText || ''),
      el('td', {}, s.action || ''),
      el('td', {}, String(s.atk || 0)),
      el('td', {}, String(s.dam || 0)),
      el('td', {}, String(s.hitRate || 0)),
      el('td', {}, ((s.preDuration || 0) + (s.aftDuration || 0)).toFixed(2)),
      el('td', {}, s.damageType || ''),
      el('td', {}, String(s.lv || '')),
    ]));
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);

  modal.show();
}

// ===== 计算被动技能基础数据（供卡片展示） =====
export function getPassiveStats(skillId, skillAutoData) {
  const passiveSkills = skillAutoData?.[skillId];
  if (!passiveSkills) return null;
  const skills = Object.values(passiveSkills);
  let totalAtk = 0, totalDam = 0, totalHitRate = 0, totalDuration = 0;
  skills.forEach((s) => {
    totalAtk += s.atk || 0;
    totalDam += s.dam || 0;
    totalHitRate += s.hitRate || 0;
    totalDuration += (s.preDuration || 0) + (s.aftDuration || 0);
  });
  const count = skills.length;
  const avg = (v) => (count > 0 ? (v / count).toFixed(2) : '0.00');
  return {
    count,
    avgAtk: avg(totalAtk),
    avgDam: avg(totalDam),
    avgHitRate: avg(totalHitRate),
    avgDuration: avg(totalDuration),
  };
}
