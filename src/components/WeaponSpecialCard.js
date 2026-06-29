// 神兵特性卡片组件
import { el } from '../utils/dom.js';
import { getConditionTypeName } from '../data/mappings.js';

export function createWeaponSpecialCard(id, special, onAction) {
  const card = el('div', { class: 'skill-card fade-in', style: { cursor: 'pointer' } });

  // 点击卡片任意区域触发效果弹窗（子元素的 stopPropagation 会阻止冲突）
  card.addEventListener('click', () => {
    onAction('effect', id, special);
  });

  // 标题栏：weapontype（左）+ name 徽章（右侧）+ 原始数据下拉（最右）
  const rawBtn = el('button', { class: 'expand-base-btn' }, '原始数据 ▾');
  const header = el('div', { class: 'skill-card-header' }, [
    el('div', { class: 'header-main-row' }, [
      el('div', { class: 'ws-header-left' }, [
        el(
          'span',
          { class: 'ws-card-title', title: special.weapontype || id },
          special.weapontype || id,
        ),
        special.name
          ? el('span', { class: 'badge badge-info' }, special.name)
          : null,
      ]),
      el('div', { class: 'header-right-group' }, [rawBtn]),
    ]),
  ]);

  // 原始数据 pre（默认隐藏，点击下拉按钮切换）
  const rawPre = el(
    'pre',
    { class: 'base-data-pre ws-raw-pre' },
    JSON.stringify(special, null, 2),
  );
  rawPre.style.display = 'none';
  let rawExpanded = false;
  rawBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    rawExpanded = !rawExpanded;
    rawPre.style.display = rawExpanded ? 'block' : 'none';
    rawBtn.textContent = rawExpanded ? '原始数据 ▴' : '原始数据 ▾';
  });

  card.appendChild(header);
  card.appendChild(rawPre);

  // 内容区
  const body = el('div', { class: 'skill-card-body' });

  // 描述（点击展开/收起全文，同时冒泡到 card 触发效果弹窗）
  if (special.specialdsc) {
    const desc = el('p', { class: 'skill-desc' }, special.specialdsc);
    desc.addEventListener('click', () => {
      desc.classList.toggle('expanded');
    });
    body.appendChild(desc);
  }

  // 解锁条件
  const sg = Number(special.specialget);
  const unlockText =
    sg > 0
      ? `此特性需 ${special.specialget} 特性值解锁`
      : '此特性自动解锁';
  body.appendChild(
    el('div', { class: 'skill-meta-row' }, [
      el('span', { class: 'skill-meta-label' }, '解锁条件：'),
      el('span', {}, unlockText),
    ]),
  );

  // 生效条件
  body.appendChild(
    el('div', { class: 'skill-meta-row' }, [
      el('span', { class: 'skill-meta-label' }, '生效条件：'),
      el(
        'span',
        { class: 'badge badge-muted' },
        getConditionTypeName(special.conditiontype),
      ),
    ]),
  );

  // 特性效果（点击下划线效果打开详情弹窗）
  const actions = el('div', { class: 'skill-card-actions' });
  actions.appendChild(
    el('div', { class: 'skill-action-row' }, [
      el('span', { class: 'skill-action-label' }, '特性效果：'),
      el(
        'span',
        {
          class: 'effect-link',
          onclick: (e) => {
            e.stopPropagation();
            onAction('effect', id, special);
          },
        },
        String(special.specialnumber ?? ''),
      ),
    ]),
  );
  body.appendChild(actions);

  card.appendChild(body);
  return card;
}
