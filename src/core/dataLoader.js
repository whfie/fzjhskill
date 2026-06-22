// 数据加载器 - gzip 解码 + IndexedDB 缓存 + 多源回退
import { cacheGet, cacheSet, cacheClearAll, clearBrowserCacheStorage } from './cacheManager.js';

// 数据源：本地优先，CDN 回退（原项目 data 路径）
const DATA_SOURCES = [
  (path) => `data/${path}`,
  (path) => `https://cdn.jsdelivr.net/gh/buzhidao32/wuxue@main/data/${path}`,
  (path) => `https://buzhidao32.github.io/wuxue/data/${path}`,
];

// 资源定义
const RESOURCES = {
  skill: { file: 'skill.json.gz', cacheKey: 'skill.json' },
  activeZhao: { file: 'activeZhao.json.gz', cacheKey: 'activeZhao.json' },
  skillAuto: { file: 'skillAuto.json.gz', cacheKey: 'skillAuto.json' },
  bookSkills: { file: 'bookSkills.json.gz', cacheKey: 'bookSkills.json' },
  meridianMapConfig: { file: 'MeridianMapConfig.json.gz', cacheKey: 'MeridianMapConfig.json' },
  acupointConfig: { file: 'AcupointConfig.json.gz', cacheKey: 'AcupointConfig.json' },
  meridianLinkConfig: { file: 'MeridianLinkConfig.json.gz', cacheKey: 'MeridianLinkConfig.json' },
  unlockCondition: { file: 'unlockConditionConfig.json.gz', cacheKey: 'unlockConditionConfig.json' },
};

const VERSION_FILE = 'version.json';
const inflight = new Map();
const memoryData = new Map();

// gzip 解码
async function decodeGzip(response) {
  if (typeof DecompressionStream === 'undefined') {
    // 回退：不支持 DecompressionStream 时尝试 pako 或直接 json
    const text = await response.text();
    return JSON.parse(text);
  }
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder('utf-8').decode(merged));
}

// 从单个 URL 拉取并解码
async function fetchFromUrl(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  if (url.endsWith('.gz')) {
    return await decodeGzip(resp);
  }
  return await resp.json();
}

// 多源尝试拉取（.gz 失败时自动回退到非 .gz 格式）
async function fetchWithFallback(file) {
  let lastErr;
  for (const src of DATA_SOURCES) {
    const url = src(file);
    try {
      return { data: await fetchFromUrl(url), url };
    } catch (e) {
      lastErr = e;
    }
    // .gz 失败时尝试非 .gz 格式（仅远程源）
    if (url.endsWith('.gz')) {
      const plainUrl = src(file.replace(/\.gz$/, ''));
      if (plainUrl !== url) {
        try {
          return { data: await fetchFromUrl(plainUrl), url: plainUrl };
        } catch (e) {
          lastErr = e;
        }
      }
    }
  }
  throw lastErr || new Error(`无法加载 ${file}`);
}

// 单飞：同一资源并发请求只发一次
function singleFlight(key, factory) {
  if (inflight.has(key)) return inflight.get(key);
  const p = factory().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// 加载版本信息
export async function loadVersion() {
  return singleFlight('version', async () => {
    const cached = await cacheGet('version.json');
    try {
      const { data } = await fetchWithFallback(VERSION_FILE);
      await cacheSet('version.json', data);
      return data;
    } catch {
      return cached || null;
    }
  });
}

// 加载资源（带缓存）
export async function loadResource(resourceId) {
  const def = RESOURCES[resourceId];
  if (!def) throw new Error(`未知资源: ${resourceId}`);

  // 内存缓存
  if (memoryData.has(resourceId)) return memoryData.get(resourceId);

  return singleFlight(resourceId, async () => {
    // IndexedDB 缓存
    const cached = await cacheGet(def.cacheKey);
    if (cached) {
      memoryData.set(resourceId, cached);
      return cached;
    }

    // 网络拉取
    const { data } = await fetchWithFallback(def.file);
    await cacheSet(def.cacheKey, data);
    memoryData.set(resourceId, data);
    return data;
  });
}

// 批量加载
export async function loadResources(ids) {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await loadResource(id)])
  );
  return Object.fromEntries(entries);
}

// 预热：后台加载指定资源
export function warmResources(ids) {
  return loadResources(ids).catch(() => {});
}

// 清缓存并刷新
export async function clearCacheAndRefresh() {
  memoryData.clear();
  await cacheClearAll();
  await clearBrowserCacheStorage();
  // 清除 URL 查询参数中的缓存标记并刷新
  const url = new URL(window.location.href);
  url.searchParams.set('_refresh', Date.now().toString());
  window.location.replace(url.toString());
}

// 获取数据版本日期
export async function getDataVersion() {
  const v = await loadVersion();
  return v?.version || '';
}
