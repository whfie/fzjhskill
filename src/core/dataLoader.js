// 数据加载器 - gzip 解码 + IndexedDB 缓存 + 多源回退
import {
  cacheGet,
  cacheSet,
  cacheClearAll,
  cacheCleanOtherVersions,
  clearBrowserCacheStorage,
} from "./cacheManager.js";

// 数据源：仅本地（使用 Vite BASE_URL 适配部署子路径）
const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const DATA_SOURCES = [(path) => `${BASE_URL}/data/${path}`];

// 资源定义
const RESOURCES = {
  skill: { file: "skill.json.gz", cacheKey: "skill.json" },
  activeZhao: { file: "activeZhao.json.gz", cacheKey: "activeZhao.json" },
  skillAuto: { file: "skillAuto.json.gz", cacheKey: "skillAuto.json" },
  bookSkills: { file: "bookSkills.json.gz", cacheKey: "bookSkills.json" },
  meridianMapConfig: {
    file: "MeridianMapConfig.json.gz",
    cacheKey: "MeridianMapConfig.json",
  },
  acupointConfig: {
    file: "AcupointConfig.json.gz",
    cacheKey: "AcupointConfig.json",
  },
  meridianLinkConfig: {
    file: "MeridianLinkConfig.json.gz",
    cacheKey: "MeridianLinkConfig.json",
  },
  unlockCondition: {
    file: "unlockConditionConfig.json.gz",
    cacheKey: "unlockConditionConfig.json",
  },
};

const VERSION_FILE = "version.json";
const FETCH_TIMEOUT_MS = 15_000;
const inflight = new Map();
const memoryData = new Map();
let currentVersion = null;

// 版本号安全包装：确保 key 跟随版本，避免新旧数据混杂
function versionedKey(key) {
  return currentVersion ? `${key}__v__${currentVersion}` : key;
}

// 带超时的 fetch
function fetchWithTimeout(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`请求超时(${FETCH_TIMEOUT_MS}ms): ${url}`));
    }, FETCH_TIMEOUT_MS);
    fetch(url, opts)
      .then((resp) => {
        clearTimeout(timer);
        resolve(resp);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// gzip 解码：检测 magic number，若响应数据已被服务器解压则直接走 JSON 解析
async function decodeGzip(response) {
  // 克隆一次响应，先检测前两字节是否为 gzip magic (0x1f, 0x8b)
  try {
    const cloned = response.clone();
    const ab = await cloned.arrayBuffer();
    const view = new Uint8Array(ab);
    const isGzip = view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b;
    if (!isGzip) {
      // 服务器已自动解压，直接解析文本 JSON
      return JSON.parse(new TextDecoder("utf-8").decode(view));
    }
    if (typeof DecompressionStream === "undefined") {
      return JSON.parse(new TextDecoder("utf-8").decode(view));
    }
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
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
    return JSON.parse(new TextDecoder("utf-8").decode(merged));
  } catch (err) {
    // body 可能已被 pipeThrough 消费，无法再次读取；
    // 直接抛出，由外层 fetchWithFallback 的 .gz → .json 回退兜底
    throw err;
  }
}

// 从单个 URL 拉取并解码
async function fetchFromUrl(url) {
  const resp = await fetchWithTimeout(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  if (url.endsWith(".gz")) {
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
    if (url.endsWith(".gz")) {
      const plainUrl = src(file.replace(/\.gz$/, ""));
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
  return singleFlight("version", async () => {
    const cached = await cacheGet(versionedKey("version.json"));
    try {
      const { data } = await fetchWithFallback(VERSION_FILE);
      const v = data?.version;
      if (v && v !== currentVersion) {
        currentVersion = v;
        // 版本变化：异步清理旧版本缓存键，不阻塞主流程
        cacheCleanOtherVersions(v);
      } else if (v) {
        currentVersion = v;
      }
      await cacheSet(versionedKey("version.json"), data);
      return data;
    } catch {
      if (cached?.version) currentVersion = cached.version;
      return cached || null;
    }
  });
}

// 加载资源（带缓存），使用版本号绑定的 cacheKey
export async function loadResource(resourceId) {
  const def = RESOURCES[resourceId];
  if (!def) throw new Error(`未知资源: ${resourceId}`);

  // 内存缓存（按版本号隔离）
  const memKey = versionedKey(resourceId);
  if (memoryData.has(memKey)) return memoryData.get(memKey);

  return singleFlight(resourceId, async () => {
    // IndexedDB 缓存
    const cached = await cacheGet(versionedKey(def.cacheKey));
    if (cached) {
      memoryData.set(memKey, cached);
      return cached;
    }

    // 网络拉取
    const { data } = await fetchWithFallback(def.file);
    await cacheSet(versionedKey(def.cacheKey), data);
    memoryData.set(memKey, data);
    return data;
  });
}

// 批量加载
export async function loadResources(ids) {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await loadResource(id)]),
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
  url.searchParams.set("_refresh", Date.now().toString());
  window.location.replace(url.toString());
}

// 获取数据版本日期
export async function getDataVersion() {
  const v = await loadVersion();
  return v?.version || "";
}
