// 格式化工具
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${h}小时${m}分钟${s}秒`;
}

export function formatPercent(val) {
  return `${(Number(val) * 100).toFixed(2)}%`;
}

// 防抖
export function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 转义 HTML
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 解析 effects 字符串生成效果链接数据
export function parseEffects(effectsStr) {
  if (!effectsStr) return [];
  const effects = [];
  const regex = /\{"([^"]+)"((?:\s*,\s*[^,}]+)*)\}/g;
  let match;
  while ((match = regex.exec(effectsStr)) !== null) {
    const id = match[1];
    let zValues = '';
    if (match[2] && match[2].trim().startsWith(',')) {
      zValues = match[2].trim().substring(1);
    }
    effects.push({ id, z: zValues });
  }
  return effects;
}

// 判断是否为效果 ID
const EXCLUDED_FIELDS = new Set([
  'arg1', 'arg2', 'arg3', 'arg4', 'arg5', 'duration', 'effectType',
  'cost', 'name', 'type', 'target', 'id', 'property', 'beginDesc',
  'endDesc', 'doDesc', 'activeZhaoAtkDamageClass', 'activeZhaoAtkDamageParam',
  'skillText', 'action', 'atk', 'dam', 'hitRate', 'lv', 'preDuration',
  'aftDuration', 'damageType', 'effects',
]);

export function isPotentialEffectId(str) {
  if (typeof str !== 'string' || str.length < 2) return false;
  if (EXCLUDED_FIELDS.has(str)) return false;
  if (/^[A-Z][A-Z0-9a-z]*$/.test(str)) return true;
  if (/^ff_[A-Z_]/.test(str)) return true;
  return false;
}
