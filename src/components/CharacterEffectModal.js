// 拳脚特性效果弹窗分发
// conditiontype=0：走通用公式计算弹窗（formula 作为结果公式，specialEffect[0] 作为结果描述键）
// conditiontype=2/3：复用主动效果弹窗，specialEffect[0] 为效果 ID，specialEffect[1..] 为 z 参数；
//                   formula 作为生效概率公式，duration>0 时附 "（持续X秒，生效概率XX%）"
import { showEffectDetail } from './EffectDetailModal.js';
import { showFormulaCalcModal } from './WeaponSpecialDetailModal.js';
import { getSpecialNumberName } from '../data/mappings.js';

// 单条特性效果（按 level 维度）
//   entry            - character.json 中某等级的原始条目
//   activeSkillData  - activeZhao 数据（含 Effect 表），cond=2/3 时必需
export function showCharacterEffect(entry, activeSkillData) {
  if (!entry) return;
  const ct = entry.conditiontype;
  const se = Array.isArray(entry.specialEffect) ? entry.specialEffect : [];
  const formula = entry.formula;

  // cond=0：纯公式特性（增加命中/攻击/防御/闪避/招架力）
  if (ct === 0) {
    const resultKey = se[0];
    showFormulaCalcModal({
      formula,
      resultKey,
      title: `特性效果: ${entry.name || ''} - 第${entry.level}重 - ${getSpecialNumberName(resultKey)}`,
      rawData: entry,
    });
    return;
  }

  // cond=2/3：命中生效 / 敌方招架生效，效果走 activeZhao.Effect
  const effectId = se[0];
  if (!effectId || !activeSkillData?.Effect?.[effectId]) return;

  // specialEffect[1..] 映射为 z1, z2, z3, z4
  const defaultParams = {};
  for (let i = 1; i < se.length; i++) {
    defaultParams[`z${i}`] = Number(se[i]) || 0;
  }

  showEffectDetail(effectId, activeSkillData, defaultParams, {
    probabilityFormula: formula,
    isWeaponSpecial: true,
  });
}
