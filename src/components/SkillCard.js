// 武学卡片组件
import { el } from '../utils/dom.js';
import {
  getMethodName, getElementName, getWeaponType, SKILL_ATTRIBUTES,
} from '../data/mappings.js';

export function createSkillCard(id, skill, onClick) {
  const card = el('div', { class: 'skill-card fade-in', onclick: () => onClick(id, skill) });

  // 头部
  const headerBadges = [];
  if (skill.mcmrestrict && skill.mcmrestrict.includes(',300')) {
    headerBadges.push(el('span', { class: 'badge badge-danger' }, '绝学'));
  }
  if (skill.wxclassify && skill.wxclassify === 'zhishi') {
    headerBadges.push(el('span', { class: 'badge badge-warning' }, '知识'));
  }

  card.appendChild(el('div', { class: 'skill-card-header' }, [
    el('span', { class: 'skill-card-title', title: skill.name || id }, skill.name || id),
    el('div', { class: 'skill-card-badges' }, headerBadges),
  ]));

  // 内容
  const body = el('div', { class: 'skill-card-body' });

  // 描述
  if (skill.dsc) {
    const shortDesc = skill.dsc.replace(/HIW|NOR/g, '').split('\\n')[0];
    body.appendChild(el('p', { class: 'skill-desc' }, shortDesc));
  }

  // 门派
  if (skill.familyList) {
    body.appendChild(el('div', { class: 'skill-meta-row' }, [
      el('span', { class: 'skill-meta-label' }, '门派：'),
      el('span', { class: 'badge badge-info' }, skill.familyList),
    ]));
  }

  // 武学类型
  if (skill.methods) {
    const methods = String(skill.methods).split(',').map((m) => getMethodName(m.trim()));
    body.appendChild(el('div', { class: 'skill-meta-row' }, [
      el('span', { class: 'skill-meta-label' }, '类型：'),
      ...methods.map((m) => el('span', { class: 'badge badge-success' }, m)),
    ]));
  }

  // 装备类型
  if (skill.weapontype) {
    const types = String(skill.weapontype).split(',').map((t) => getWeaponType(t.trim()));
    body.appendChild(el('div', { class: 'skill-meta-row' }, [
      el('span', { class: 'skill-meta-label' }, '装备：'),
      ...types.map((t) => el('span', { class: 'badge badge-muted' }, t)),
    ]));
  }

  // 属性列表
  const attrList = el('div', { class: 'attr-list' });
  SKILL_ATTRIBUTES.forEach((attr) => {
    if (skill[attr.key] != null && skill[attr.key] !== '') {
      const val = attr.key === 'autoZhaoAtkDamageClass' ? getElementName(skill[attr.key]) : skill[attr.key];
      attrList.appendChild(el('div', { class: 'attr-item' }, [
        el('span', { class: 'attr-label' }, attr.label),
        el('span', { class: 'attr-value' }, String(val)),
      ]));
    }
  });
  body.appendChild(attrList);

  card.appendChild(body);
  return card;
}
