// 武学卡片组件
import { el } from "../utils/dom.js";
import {
  getMethodName,
  getElementName,
  getWeaponType,
  SKILL_ATTRIBUTES,
  getFamilyName,
  NPC_SKILLS,
  getWxClassifyName,
} from "../data/mappings.js";
import { findActiveSkills, getPassiveStats } from "./SkillDetailModal.js";
import { computeDefaultAvgQiAtk } from "./EffectDetailModal.js";
import { loadResource } from "../core/dataLoader.js";
import { showAvgQiAtkPresetModal } from "./AvgQiAtkPresetModal.js";

export function createSkillCard(id, skill, onAction, data) {
  const { activeSkillData, skillAutoData } = data || {};

  // 预计算被动技能统计信息（供头部按钮与属性列表使用）
  const passiveStats = getPassiveStats(id, skillAutoData);

  const card = el("div", { class: "skill-card fade-in" });

  // 头部（点击可展开/收起底部的被动招式与基础属性按钮）
  const headerBadges = [];
  if (skill.mcmrestrict && skill.mcmrestrict.includes(",300")) {
    headerBadges.push(el("span", { class: "badge badge-danger" }, "绝学"));
  }
  if (skill.wxclassify && skill.wxclassify === "zhishi") {
    headerBadges.push(el("span", { class: "badge badge-warning" }, "知识"));
  }

  // 可展开按钮栏（被动招式 + 基础属性，默认隐藏）
  const toggleBar = el("div", { class: "header-toggle-bar" });
  if (passiveStats) {
    toggleBar.appendChild(
      el(
        "button",
        {
          class: "skill-action-btn skill-action-btn-sm",
          onclick: (e) => {
            e.stopPropagation();
            onAction("passive", id, skill);
          },
        },
        "被动招式",
      ),
    );
  }
  toggleBar.appendChild(
    el(
      "button",
      {
        class:
          "skill-action-btn skill-action-btn-sm skill-action-btn-secondary",
        onclick: (e) => {
          e.stopPropagation();
          onAction("basic", id, skill);
        },
      },
      "基础属性",
    ),
  );

  // 标题行：标题文字 + [展开按钮（从左滑入） + 徽章] 整体右对齐 + 指示器
  const isNpcSkill = NPC_SKILLS.has(id);
  const titleText = isNpcSkill
    ? `${skill.name || id}（NPC）`
    : skill.name || id;
  const headerMain = el("div", { class: "header-main-row" }, [
    el("span", { class: "skill-card-title", title: titleText }, titleText),
    el("div", { class: "header-right-group" }, [
      toggleBar,
      el("div", { class: "skill-card-badges" }, headerBadges),
    ]),
    el("span", { class: "header-chevron" }),
  ]);

  const header = el("div", { class: "skill-card-header" }, [headerMain]);

  header.addEventListener("click", () => {
    header.classList.toggle("is-expanded");
  });

  card.appendChild(header);

  // 内容
  const body = el("div", { class: "skill-card-body" });

  // 点击 body 区域（非标题栏、非主动技能按钮）时，展示该武学所有主动技能
  body.addEventListener("click", (e) => {
    // 排除主动技能按钮的点击
    if (e.target.closest(".skill-action-btn")) return;
    onAction("allActive", id, skill);
  });

  // 描述（点击展开/收起全文，独立点击热区，不触发弹窗）
  if (skill.dsc) {
    const desc = el(
      "p",
      { class: "skill-desc" },
      skill.dsc.replace(/HIW|NOR/g, ""),
    );
    desc.addEventListener("click", (e) => {
      e.stopPropagation();
      desc.classList.toggle("expanded");
    });
    body.appendChild(desc);
  }

  // 门派
  const useFamilyListDirect = skill.familyList === "门派心法";
  const families = isNpcSkill
    ? ["NPC"]
    : useFamilyListDirect
      ? [skill.familyList]
      : skill.familyId
        ? String(skill.familyId)
            .split("#")
            .map((f) => f.trim())
            .filter(Boolean)
            .map((f) => getFamilyName(f) || f)
        : skill.familyList
          ? String(skill.familyList)
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : [];
  if (families.length > 0) {
    body.appendChild(
      el("div", { class: "skill-meta-row" }, [
        el("span", { class: "skill-meta-label" }, "门派："),
        ...families.map((f) => el("span", { class: "badge badge-info" }, f)),
      ]),
    );
  }

  // 武学类型（methods + wxclassify拳脚属性）
  const typeBadges = [];
  if (skill.methods) {
    String(skill.methods)
      .split(",")
      .map((m) => m.trim())
      .forEach((m) => {
        const name = getMethodName(m);
        if (name) typeBadges.push(name);
      });
  }
  if (skill.wxclassify) {
    String(skill.wxclassify)
      .split(",")
      .map((c) => c.trim())
      .forEach((c) => {
        const name = getWxClassifyName(c);
        if (name) typeBadges.push(name);
      });
  }
  if (typeBadges.length > 0) {
    body.appendChild(
      el("div", { class: "skill-meta-row" }, [
        el("span", { class: "skill-meta-label" }, "类型："),
        ...typeBadges.map((t) =>
          el("span", { class: "badge badge-success" }, t),
        ),
      ]),
    );
  }

  // 装备类型
  if (skill.weapontype) {
    const types = String(skill.weapontype)
      .split(",")
      .map((t) => getWeaponType(t.trim()));
    body.appendChild(
      el("div", { class: "skill-meta-row" }, [
        el("span", { class: "skill-meta-label" }, "装备："),
        ...types.map((t) => el("span", { class: "badge badge-muted" }, t)),
      ]),
    );
  }

  // 伤害属性 + 招架属性（同一行展示，各占一半宽度）
  const hasDamageAttr =
    skill.autoZhaoAtkDamageClass != null && skill.autoZhaoAtkDamageClass !== "";
  const hasParryAttr =
    skill.zhaoJiaDefDamageClass != null && skill.zhaoJiaDefDamageClass !== "";

  if (hasDamageAttr || hasParryAttr) {
    const cells = [];
    if (hasDamageAttr) {
      const damageName = getElementName(skill.autoZhaoAtkDamageClass);
      if (damageName) {
        cells.push(
          el("div", { class: "meta-cell" }, [
            el("span", { class: "skill-meta-label" }, "伤害："),
            el("span", { class: "badge badge-element" }, damageName),
          ]),
        );
      }
    }
    if (hasParryAttr) {
      const parryName = getElementName(skill.zhaoJiaDefDamageClass);
      if (parryName) {
        cells.push(
          el("div", { class: "meta-cell" }, [
            el("span", { class: "skill-meta-label" }, "招架："),
            el("span", { class: "badge badge-parry" }, parryName),
          ]),
        );
      }
    }
    if (cells.length) {
      body.appendChild(el("div", { class: "skill-meta-row" }, cells));
    }
  }

  // 属性列表（武学系数 + 招式系数统一展示）
  const attrList = el("div", { class: "attr-list" });

  // 武学数值系数（为 0 时不展示，伤害类型已分离）
  SKILL_ATTRIBUTES.forEach((attr) => {
    if (attr.key === "autoZhaoAtkDamageClass") return;
    const raw = skill[attr.key];
    if (raw == null || raw === "") return;
    const num = Number(raw);
    if (!isNaN(num) && num === 0) return;
    attrList.appendChild(
      el("div", { class: "attr-item" }, [
        el("span", { class: "attr-label" }, attr.label),
        el("span", { class: "attr-value" }, String(raw)),
      ]),
    );
  });

  // 招式系数（被动技能平均值，整合到同一网格，样式一致）
  if (passiveStats) {
    const passiveAttrs = [
      { label: "招式平均攻击", value: passiveStats.avgAtk },
      { label: "招式平均伤害", value: passiveStats.avgDam },
      { label: "招式平均命中", value: passiveStats.avgHitRate },
      { label: "招式平均前后摇", value: passiveStats.avgDuration },
    ];
    passiveAttrs.forEach((a) => {
      attrList.appendChild(
        el("div", { class: "attr-item" }, [
          el("span", { class: "attr-label" }, a.label),
          el("span", { class: "attr-value" }, a.value),
        ]),
      );
    });
  }

  // 气血攻击参考（仅输出武学显示，每次重新计算）
  const outputMethodTypes = new Set(["1", "5", "6", "7", "8", "9", "10", "11"]);
  const isOutputMethod =
    skill.methods &&
    String(skill.methods)
      .split(",")
      .map((t) => t.trim())
      .some((t) => outputMethodTypes.has(t));
  if (isOutputMethod && passiveStats) {
    const skillC = (() => {
      try {
        return JSON.parse(localStorage.getItem(`avgqiatk_skill_${id}`)) || {};
      } catch {
        return {};
      }
    })();
    const weaponType = skillC.weaponType || "";

    loadResource("weaponSpecials")
      .then((wsData) => {
        const weaponSpecials =
          wsData && typeof wsData === "object" ? wsData : [];
        const avgQiAtk = computeDefaultAvgQiAtk(
          skill,
          passiveStats.avgAtk,
          weaponSpecials,
          weaponType,
        );
        const avgQiAtkEl = el(
          "div",
          { class: "attr-item attr-item-highlight", title: "点击打开预设配置" },
          [
            el("span", { class: "attr-label" }, "气血攻击参考"),
            el("span", { class: "attr-value" }, avgQiAtk),
          ],
        );
        avgQiAtkEl.addEventListener("click", (e) => {
          e.stopPropagation();
          showAvgQiAtkPresetModal({
            skillId: id,
            skill: skill,
            avgAtk: passiveStats.avgAtk,
            onSave: () => {},
            fromCard: true,
          });
        });
        attrList.appendChild(avgQiAtkEl);
        if (!body.contains(attrList)) {
          body.appendChild(attrList);
        }
      })
      .catch(() => {
        const avgQiAtk = computeDefaultAvgQiAtk(skill, passiveStats.avgAtk);
        const avgQiAtkEl = el(
          "div",
          { class: "attr-item attr-item-highlight", title: "点击打开预设配置" },
          [
            el("span", { class: "attr-label" }, "气血攻击参考"),
            el("span", { class: "attr-value" }, avgQiAtk),
          ],
        );
        avgQiAtkEl.addEventListener("click", (e) => {
          e.stopPropagation();
          showAvgQiAtkPresetModal({
            skillId: id,
            skill: skill,
            avgAtk: passiveStats.avgAtk,
            onSave: () => {},
            fromCard: true,
          });
        });
        attrList.appendChild(avgQiAtkEl);
        if (!body.contains(attrList)) {
          body.appendChild(attrList);
        }
      });
  }

  if (attrList.firstChild) body.appendChild(attrList);

  // ===== 主动技能操作区（无主动技能时不渲染，分隔线也随之隐藏） =====
  const activeGroups = findActiveSkills(id, activeSkillData);
  if (activeGroups.length > 0) {
    const actions = el("div", { class: "skill-card-actions" });
    const activeRow = el("div", { class: "skill-action-row" }, [
      el("span", { class: "skill-action-label" }, "主动技能："),
      ...activeGroups.map((group) =>
        el(
          "button",
          {
            class: "skill-action-btn",
            onclick: (e) => {
              e.stopPropagation();
              onAction("active", id, skill, { activeId: group.activeId });
            },
          },
          group.baseActive.name || group.activeId,
        ),
      ),
    ]);
    actions.appendChild(activeRow);
    body.appendChild(actions);
  }

  card.appendChild(body);
  return card;
}
