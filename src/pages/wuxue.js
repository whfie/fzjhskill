// 武学查询页面 - 主逻辑
import "../styles/main.css";
import { initHeader } from "../components/Header.js";
import { createSearchBar, getSearchValue } from "../components/SearchBar.js";
import {
  createFilterPanel,
  populateFilterBadges,
  getUniqueValues,
  getFamilyValues,
  matchesFilters,
  filterState,
} from "../components/FilterPanel.js";
import { createSkillCard } from "../components/SkillCard.js";
import {
  showBasicAttributesModal,
  showActiveSkillModal,
  showAllActiveSkillsModal,
  showPassiveSkillsModal,
} from "../components/SkillDetailModal.js";
import {
  loadResource,
  loadVersion,
  getDataVersion,
} from "../core/dataLoader.js";
import { setSkillLookup } from "../data/conditionParser.js";
import { el, clearChildren, batchRender } from "../utils/dom.js";
import { toast } from "../components/Toast.js";

let skillData = null;
let activeSkillData = null;
let skillAutoData = null;
let bookSkillUnlockData = null;
let searchIndex = new Map();

// === 并发控制 / 取消令牌 ===
let currentRenderPromise = null; // 当前批量渲染任务，新的刷新会中止它
let extrasLoadPromise = null; // 附加数据加载的共享 Promise
let listRefreshSeq = 0; // 列表刷新序号，避免旧请求覆盖新请求
let initialized = false; // 主流程是否已经跑过一次，避免重复 init

// 渲染时的 loading 状态：
// 列表区域会在 loading 与 empty 两种状态之间切换，
// 不再依赖 init 阶段一次性的 showLoading。
function showLoadingInList(container, text) {
  if (!container) return;
  clearChildren(container);
  container.appendChild(
    el("div", { class: "loading-spinner" }, [
      el("div", { class: "spinner" }),
      el("p", {}, text || "加载数据中..."),
    ]),
  );
}

function showEmptyState(container, text) {
  if (!container) return;
  clearChildren(container);
  container.appendChild(
    el("div", { class: "empty-state" }, [
      el("div", { class: "empty-state-icon" }, "?"),
      el("p", {}, text || "没有匹配的武学"),
    ]),
  );
}

function updateStats(filteredCount, totalCount, extraReady) {
  const stats = document.getElementById("statsInfo");
  if (!stats) return;
  if (totalCount == null) {
    stats.textContent = "数据加载中...";
    return;
  }
  const extraHint = extraReady
    ? ""
    : "（附加数据加载中，主动技能搜索可能不完整）";
  stats.textContent = `共 ${filteredCount ?? 0} / ${totalCount} 项${extraHint}`;
}

async function initWuxuePage() {
  // 防止重复初始化（如异步事件被多次触发）
  if (initialized) return;
  initialized = true;

  // 先拉取版本号，供 dataLoader 中的版本化缓存使用
  // 失败不阻塞主流程
  const headerTask = initHeader("wuxue").catch(() => {});
  const versionTask = loadVersion().catch(() => null);

  const container = document.getElementById("app");

  // 基本 UI 先行
  container.appendChild(el("h1", { class: "page-title" }, "武学技能查询"));
  const versionText = (await versionTask)?.version || "";
  container.appendChild(
    el(
      "p",
      { class: "page-subtitle" },
      `数据日期：${versionText || "加载中..."}`,
    ),
  );
  container.appendChild(createSearchBar(safeRefresh));
  container.appendChild(createFilterPanel(safeRefresh));
  container.appendChild(
    el("div", { class: "stats-info", id: "statsInfo" }, "加载中..."),
  );

  const listContainer = el("div", { class: "card-grid", id: "skillList" });
  container.appendChild(listContainer);

  showLoadingInList(listContainer);

  await headerTask;

  try {
    // 阻塞式加载主武学数据
    skillData = await loadResource("skill");
    if (!skillData?.skills) throw new Error("主数据格式异常");

    // 注入技能查询回调
    setSkillLookup((id) =>
      skillData?.skills?.[id] ? { name: skillData.skills[id].name } : null,
    );

    // 主数据就绪后立即渲染（基于主数据字段的搜索此时已可用）
    safeRefresh();

    // 填充筛选器所需的可选值
    populateFilterBadges(
      "familyFilters",
      getFamilyValues(skillData.skills),
      "family",
      safeRefresh,
    );
    populateFilterBadges(
      "elementFilters",
      getUniqueValues(skillData.skills, "autoZhaoAtkDamageClass"),
      "element",
      safeRefresh,
    );
    populateFilterBadges(
      "parryFilters",
      getUniqueValues(skillData.skills, "zhaoJiaDefDamageClass"),
      "parry",
      safeRefresh,
    );
    populateFilterBadges(
      "methodsFilters",
      getUniqueValues(skillData.skills, "methods"),
      "methods",
      safeRefresh,
    );

    // 并行加载附加数据：失败不抛异常，单个失败不影响其他
    loadExtras();
  } catch (err) {
    console.error("加载数据失败:", err);
    showEmptyState(listContainer, "加载数据失败，请刷新页面重试");
    toast("数据加载失败", "error");
  }
}

// 共享附加数据加载 Promise：handleCardAction / refreshList 都会等它
function loadExtras() {
  if (extrasLoadPromise) return extrasLoadPromise;
  extrasLoadPromise = (async () => {
    const results = await Promise.allSettled([
      loadResource("activeZhao"),
      loadResource("skillAuto"),
      loadResource("bookSkills"),
    ]);
    const [activeZhao, skillAuto, bookSkills] = results;
    activeSkillData =
      activeZhao.status === "fulfilled" ? activeZhao.value : null;
    skillAutoData = skillAuto.status === "fulfilled" ? skillAuto.value : null;
    bookSkillUnlockData =
      bookSkills.status === "fulfilled" ? bookSkills.value : null;

    // 预构建 skillId → [activeSkillId...] 反向索引，供 findActiveSkills 与搜索索引 O(1) 查表
    if (activeSkillData?.skillRelation) {
      const idx = new Map();
      for (const [activeSkillId, relation] of Object.entries(
        activeSkillData.skillRelation,
      )) {
        const sid = relation.skillId;
        if (!idx.has(sid)) idx.set(sid, []);
        idx.get(sid).push(activeSkillId);
      }
      activeSkillData._skillRelationIndex = idx;
    }

    // 构建搜索索引（即便 activeZhao 为 null，也正常调用，内部判空）
    buildSearchIndex(skillData, activeSkillData);

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      console.warn(`有 ${failed} 项附加数据加载失败，已降级显示`);
      toast("部分附加数据加载失败，显示可能不完整", "warning");
    }
    // 附加数据就绪后再刷新一次列表，使用最新数据重新筛选
    safeRefresh();
    return { activeSkillData, skillAutoData, bookSkillUnlockData };
  })().catch((err) => {
    // 兜底错误：保证 loadExtras 永远不会抛未捕获异常
    console.error("loadExtras 失败:", err);
    extrasLoadPromise = null;
    return null;
  });
  return extrasLoadPromise;
}

// 构建搜索索引：与主数据分离、activeSkillData 为 null 时安全
function buildSearchIndex(skillsData, activeData) {
  searchIndex.clear();
  if (!skillsData?.skills) return;
  // 使用预构建的反向索引，避免 O(skills × relations) 全量遍历
  const index = activeData?._skillRelationIndex;
  for (const [skillId, skill] of Object.entries(skillsData.skills)) {
    const parts = [];
    // 主数据字段也入索引（便于搜索条件更一致）
    for (const val of Object.values(skill)) {
      if (val != null && val !== "") parts.push(String(val));
    }
    // 关联主动技能数据（通过反向索引 O(1) 查表）
    if (index && activeData?.ActiveZhao) {
      const activeIds = index.get(skillId);
      if (activeIds) {
        for (const activeSkillId of activeIds) {
          const relation = activeData.skillRelation[activeSkillId];
          const activeSkill = activeData.ActiveZhao?.[relation?.id];
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
      }
    }
    searchIndex.set(skillId, parts.join(" ").toLowerCase());
  }
}

// 线程安全的刷新入口：保证并发调用时只有最新一次真正渲染
function safeRefresh() {
  // 使用序号递增：即便 refreshList 异步，也能让旧任务放弃写入
  const mySeq = ++listRefreshSeq;
  refreshList(mySeq);
}

function refreshList(seq) {
  const container = document.getElementById("skillList");
  if (!container) return;

  if (!skillData?.skills) {
    showEmptyState(container, "数据加载中...");
    updateStats(null, null, !!activeSkillData);
    return;
  }

  // 取消上一次未完成的批量渲染，防止旧条目混入新结果
  if (
    currentRenderPromise &&
    typeof currentRenderPromise.abort === "function"
  ) {
    try {
      currentRenderPromise.abort();
    } catch {}
  }

  const searchText = getSearchValue();
  const cards = [];
  let filteredCount = 0;
  const totalCount = Object.keys(skillData.skills).length;

  let filteredSkills = Object.entries(skillData.skills).filter(
    ([, skill]) =>
      typeof skill === "object" &&
      skill !== null &&
      matchesFilters(skill, searchText, searchIndex),
  );

  if (filterState.sortField) {
    const passiveAvgFields = new Set([
      "avgAtk",
      "avgDam",
      "avgHitRate",
      "avgDuration",
    ]);
    filteredSkills = filteredSkills.filter(([id, skill]) => {
      if (passiveAvgFields.has(filterState.sortField)) {
        return skillAutoData?.[id] && Object.keys(skillAutoData[id]).length > 0;
      }
      const val = skill[filterState.sortField];
      return val != null && val !== "" && Number(val) > 0;
    });

    filteredSkills.sort(([idA, a], [idB, b]) => {
      const field = filterState.sortField;
      let valA, valB;
      if (passiveAvgFields.has(field)) {
        const statsA = skillAutoData?.[idA];
        const statsB = skillAutoData?.[idB];
        if (!statsA || !statsB) return 0;
        let totalA = 0, totalB = 0, countA = 0, countB = 0;
        Object.values(statsA).forEach((s) => {
          if (field === "avgDuration") {
            totalA += (s.preDuration || 0) + (s.aftDuration || 0);
          } else {
            let key;
            if (field === "avgAtk") key = "atk";
            else if (field === "avgDam") key = "dam";
            else if (field === "avgHitRate") key = "hitRate";
            else {
              const k = field.replace("avg", "");
              key = k.charAt(0).toLowerCase() + k.slice(1);
            }
            totalA += s[key] || 0;
          }
          countA++;
        });
        Object.values(statsB).forEach((s) => {
          if (field === "avgDuration") {
            totalB += (s.preDuration || 0) + (s.aftDuration || 0);
          } else {
            let key;
            if (field === "avgAtk") key = "atk";
            else if (field === "avgDam") key = "dam";
            else if (field === "avgHitRate") key = "hitRate";
            else {
              const k = field.replace("avg", "");
              key = k.charAt(0).toLowerCase() + k.slice(1);
            }
            totalB += s[key] || 0;
          }
          countB++;
        });
        valA = countA > 0 ? totalA / countA : 0;
        valB = countB > 0 ? totalB / countB : 0;
      } else {
        valA = Number(a[field]) || 0;
        valB = Number(b[field]) || 0;
      }
      return filterState.sortOrder === "desc" ? valB - valA : valA - valB;
    });
  } else {
    filteredSkills.sort(([, a], [, b]) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }

  filteredSkills.forEach(([id, skill]) => {
    filteredCount++;
    cards.push(
      createSkillCard(id, skill, handleCardAction, {
        activeSkillData,
        skillAutoData,
      }),
    );
  });

  updateStats(filteredCount, totalCount, !!activeSkillData);

  if (cards.length === 0) {
    clearChildren(container);
    showEmptyState(container, "没有匹配的武学");
    return;
  }

  // 先清空再开始新一批插入；再次检查序号，避免被后续请求覆盖后仍写入
  clearChildren(container);
  currentRenderPromise = batchRender(cards, container, 30, 16);
}

async function handleCardAction(action, skillId, skill, extra) {
  const skillName = skill?.name || skillId;

  // 附加数据若还没完成，则共享等待；避免再发起独立请求
  if (action !== "basic") {
    if (!extrasLoadPromise) loadExtras();
    try {
      await extrasLoadPromise;
    } catch {
      // loadExtras 内部已 catch，这里只是兜底
    }
  }

  switch (action) {
    case "basic":
      showBasicAttributesModal(skillId, skill);
      break;
    case "active":
      if (!activeSkillData) {
        toast("主动技能数据仍在加载，请稍后", "info", 1500);
        return;
      }
      if (extra?.activeId) {
        showActiveSkillModal(
          skillName,
          extra.activeId,
          activeSkillData,
          bookSkillUnlockData,
          { skillId, skill, skillAutoData },
        );
      }
      break;
    case "allActive":
      if (!activeSkillData) {
        toast("主动技能数据仍在加载，请稍后", "info", 1500);
        return;
      }
      showAllActiveSkillsModal(
        skillName,
        skillId,
        activeSkillData,
        bookSkillUnlockData,
        { skillId, skill, skillAutoData },
      );
      break;
    case "passive":
      if (!skillAutoData) {
        toast("被动技能数据仍在加载，请稍后", "info", 1500);
        return;
      }
      showPassiveSkillsModal(skillName, skillId, skillAutoData);
      break;
  }
}

document.addEventListener("DOMContentLoaded", initWuxuePage);
