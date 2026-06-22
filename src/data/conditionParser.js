// 条件转中文描述（重构自原项目 conditionToCN.js）
import { getAttrName, getFamilyName, getMethodCN, LOGIC_CN } from './mappings.js';

// 技能查询回调（由外部注入，避免循环依赖）
let skillLookup = null;

export function setSkillLookup(fn) {
  skillLookup = fn;
}

function getSkill(id) {
  if (!skillLookup) return null;
  return skillLookup(id);
}

/**
 * 将单条条件转换为中文描述
 * @param {string} ctype 条件类型
 * @param {string} id 条件ID
 * @param {string} logic 逻辑运算符
 * @param {string} value 条件值
 * @returns {string|undefined}
 */
export function conditionToCN(ctype, id, logic, value) {
  const logicWord = LOGIC_CN[logic] !== undefined ? LOGIC_CN[logic] : '';

  switch (ctype) {
    case '属性':
      return `【${getAttrName(id)}】${logicWord}${value}`;

    case '武功': {
      const skill = getSkill(id);
      if (skill) return `【${skill.name}】${logicWord}${value}级`;
      return undefined;
    }

    case '装备技能': {
      const list = String(id).split(' or ');
      let str = '';
      for (let i = 0; i < list.length; i++) {
        const skill = getSkill(list[i]);
        if (skill) str += i === 0 ? `【${skill.name}】` : `或【${skill.name}】`;
      }
      const prefix = logic === '不等于' ? '禁止' : '';
      if (value === '是') return `${prefix}准备${str}`;
      if (!isNaN(Number(value))) return `${prefix}准备${str}为${getMethodCN(Number(value))}`;
      if (String(value).indexOf(' or ') !== -1) {
        const vals = String(value).split(' or ');
        let text = `${prefix}准备${str}为${getMethodCN(Number(vals[0]))}`;
        for (let k = 1; k < vals.length; k++) text += `或${getMethodCN(Number(vals[k]))}`;
        return text;
      }
      return `未准备${str}`;
    }

    case '门派': {
      const list = String(id).split(' or ');
      let str = '[门派]为';
      for (let i = 0; i < list.length; i++) {
        const name = getFamilyName(list[i]);
        if (name) str += i === 0 ? `【${name}】` : `或【${name}】`;
      }
      return str;
    }

    case '使用武学': {
      const list = String(id).split(' or ');
      let str = '';
      for (let i = 0; i < list.length; i++) {
        const skill = getSkill(list[i]);
        if (skill) str += i === 0 ? `【${skill.name}】` : `或【${skill.name}】`;
      }
      if (str) return `战斗中使用【${value}】为${str}`;
      return undefined;
    }

    case '使用武学属于门派': {
      const families = String(value).split(' or ');
      let str = `战斗中使用【${id}】`;
      for (let i = 0; i < families.length; i++) {
        const name = getFamilyName(families[i]);
        if (name) str += i === 0 ? `为【${name}】` : `或【${name}】`;
      }
      return str + '武学';
    }

    default:
      return undefined;
  }
}

/**
 * 从数据行收集指定前缀的条件
 * @param {string} prefix "learn" 或 "use"
 * @param {object} dataRow 数据行
 * @returns {string[]}
 */
export function collectConditions(prefix, dataRow) {
  const conditions = [];
  for (let i = 1; i <= 10; i++) {
    const idKey = `${prefix}_id_${i}`;
    const logicKey = `${prefix}_logic_${i}`;
    const typeKey = `${prefix}_type_${i}`;
    const valueKey = `${prefix}_value_${i}`;
    if (dataRow[idKey] === undefined || dataRow[logicKey] === undefined || dataRow[valueKey] === undefined) continue;

    const ids = String(dataRow[idKey]).split(';');
    const logics = String(dataRow[logicKey]).split(';');
    const values = String(dataRow[valueKey]).split(';');
    const typeStr = dataRow[typeKey] || '';

    for (let j = 0; j < ids.length; j++) {
      const rawId = ids[j].trim();
      let logicStr = (logics[j] || logics[0] || '').trim();
      let valueStr = (values[j] || values[0] || '').trim();
      const cnText = conditionToCN(typeStr, rawId, logicStr, valueStr);
      if (cnText) {
        conditions.push(cnText);
      } else {
        if (typeStr === '装备武器') { logicStr = ''; valueStr = ''; }
        conditions.push(`${typeStr} ${getAttrName(rawId) || rawId} ${logicStr} ${valueStr}`);
      }
    }
  }
  return conditions;
}

// 获取通过书页学习招式的描述
export function getBookLearnText(activeId, activeSkillData, bookSkillUnlockData) {
  const m = String(activeId).match(/^(.*?)\d*$/);
  const normalized = m ? m[1] : activeId;
  const activeZhao = activeSkillData?.ActiveZhao?.[normalized];
  if (!activeZhao || activeZhao.learnMethod !== 1) return '此技能自动解锁';
  const relation = activeSkillData?.skillRelation?.[normalized];
  if (!relation?.skillId) return '';
  const bookData = bookSkillUnlockData?.activeZhao?.[relation.skillId];
  if (!bookData) return '';
  const targetPage = normalized + 'canye';
  for (let i = 1; i <= 10; i++) {
    if (bookData['pageName' + i] === targetPage && bookData['pageCount' + i] > 0) {
      return `此技能需要 ${bookData['pageCount' + i]} 张残页解锁`;
    }
  }
  return '';
}
