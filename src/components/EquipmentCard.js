import { el } from '../utils/dom.js';
import { colorMapping } from '../data/mappings.js';

function parseColorCode(colorStr) {
  const match = colorStr.match(/cc\.c3b\((\d+),(\d+),(\d+)\)/);
  if (match) {
    return `rgb(${match[1]},${match[2]},${match[3]})`;
  }
  return null;
}

function parseEquipmentName(name) {
  if (!name) return { text: '', color: null };

  let processedName = name;
  let color = null;

  const colorPatterns = [
    /^\[([A-Z]{2,4})\]/,
    /^([A-Z]{2,4}):/,
    /^([A-Z]{2,4})/,
  ];

  for (const pattern of colorPatterns) {
    const match = processedName.match(pattern);
    if (match) {
      const colorId = match[1];
      const colorInfo = colorMapping.ColorCode?.[colorId];
      if (colorInfo) {
        color = parseColorCode(colorInfo.color);
        processedName = processedName.replace(pattern, '');
        break;
      }
    }
  }

  if (!color) {
    const bracketMatch = processedName.match(/\[([A-Z]{2,4})\]/);
    if (bracketMatch) {
      const colorId = bracketMatch[1];
      const colorInfo = colorMapping.ColorCode?.[colorId];
      if (colorInfo) {
        color = parseColorCode(colorInfo.color);
      }
      processedName = processedName.replace(/\[([A-Z]{2,4})\]/, '');
    }
  }

  if (processedName.endsWith('NOR')) {
    processedName = processedName.slice(0, -3);
  }

  processedName = processedName.trim();

  return { text: processedName, color };
}

import { isArmorItem } from '../data/equipmentConstants.js';

export function createEquipmentCard(item) {
  const { text: nameText, color: nameColor } = parseEquipmentName(item.name);
  const isArmor = isArmorItem(item);

  const card = el('div', { class: 'equipment-card' });

  const headerBadges = [];
  if (item.bType) {
    headerBadges.push(el('span', { class: 'badge badge-info' }, item.bType));
  }
  if (item.shoucang === 1 || item.shoucang === '1') {
    headerBadges.push(el('span', { class: 'badge badge-accent' }, '可收藏'));
  }

  const header = el('div', { class: 'equipment-card-header' }, [
    el('span', {
      class: 'equipment-card-title',
      style: nameColor ? { color: nameColor } : {},
    }, nameText),
    el('div', { class: 'equipment-card-badges' }, headerBadges),
  ]);

  const body = el('div', { class: 'equipment-card-body' });

  if (item.dsc) {
    body.appendChild(el('div', { class: 'equipment-desc' }, item.dsc));
  }

  const infoItems = [];
  if (isArmor && item.protect) {
    infoItems.push(createInfoRow('保护力', item.protect));
  }
  if ((item.shoucang === 1 || item.shoucang === '1') && item.wuzang) {
    infoItems.push(createInfoRow('收藏值', item.wuzang));
  }
  if (!isArmor && item.damage) {
    infoItems.push(createInfoRow('伤害力', item.damage));
  }
  if (item.yindu) {
    infoItems.push(createInfoRow('硬度', item.yindu));
  }
  if (item.rendu) {
    infoItems.push(createInfoRow('韧性', item.rendu));
  }
  if (item.weight) {
    infoItems.push(createInfoRow('重量', item.weight));
  }

  if (infoItems.length > 0) {
    const infoGrid = el('div', { class: 'equipment-info-grid' }, infoItems);
    body.appendChild(infoGrid);
  }

  card.appendChild(header);
  card.appendChild(body);

  return card;
}

function createInfoRow(label, value) {
  return el('div', { class: 'equipment-info-row' }, [
    el('span', { class: 'equipment-info-label' }, label),
    el('span', { class: 'equipment-info-value' }, value),
  ]);
}