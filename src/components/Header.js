// 顶部导航组件 - 含主题切换 + 清缓存刷新
import { el } from '../utils/dom.js';
import { initTheme, getTheme, setTheme } from '../core/themeManager.js';
import { clearCacheAndRefresh, getDataVersion } from '../core/dataLoader.js';
import { Modal } from './Modal.js';
import { toast } from './Toast.js';

const THEME_OPTIONS = [
  { id: 'sujian', label: '素笺', short: '素', name: '素笺清录' },
  { id: 'moyun', label: '墨韵', short: '墨', name: '墨韵武侠' },
  { id: 'jiandu', label: '简牍', short: '简', name: '简牍古卷' },
];

export async function initHeader(currentPage = '') {
  initTheme();
  const version = await getDataVersion().catch(() => '');

  const header = el('header', { class: 'app-header' }, [
    el('div', { class: 'header-brand' }, '武学隐脉查询'),
    el('nav', { class: 'header-nav' }, [
      el('a', {
        class: `nav-link ${currentPage === 'wuxue' ? 'active' : ''}`,
        href: 'index.html',
      }, '武学查询'),
      el('a', {
        class: `nav-link ${currentPage === 'yinmai' ? 'active' : ''}`,
        href: 'yinmai.html',
      }, '隐脉查询'),
    ]),
    el('div', { class: 'header-actions' }, [
      buildThemeSwitcher(),
      el('button', {
        class: 'icon-btn',
        title: '清缓存并刷新',
        onclick: () => showClearCacheModal(),
        html: '&#8635;',
      }),
      ...(version ? [el('span', { class: 'data-date hidden', id: 'dataDate' }, version)] : []),
    ]),
  ]);

  document.body.insertBefore(header, document.body.firstChild);
}

function buildThemeSwitcher() {
  const current = getTheme();
  const switcher = el('div', { class: 'theme-switcher' });
  THEME_OPTIONS.forEach((opt) => {
    const btn = el('button', {
      class: `theme-btn ${current === opt.id ? 'active' : ''}`,
      title: opt.name,
      'data-short': opt.short,
      onclick: () => {
        setTheme(opt.id);
        switcher.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        toast(`已切换至「${opt.name}」`, 'success', 1500);
      },
    }, opt.label);
    switcher.appendChild(btn);
  });
  return switcher;
}

function showClearCacheModal() {
  const modal = new Modal({
    title: '清缓存并刷新',
    closable: true,
    size: 'sm',
  });

  const body = el('div', {}, [
    el('p', { class: 'mb-2' }, '将重新下载全部数据，成功后自动刷新页面。'),
    el('p', { class: 'text-muted text-sm' }, '请耐心等待数据导入，请勿关闭页面。'),
    el('div', { class: 'progress-bar-wrap hidden', id: 'refreshProgress' }, [
      el('div', { class: 'progress-bar', style: { width: '0%' }, id: 'refreshBar' }, '0%'),
    ]),
    el('div', { class: 'text-muted text-sm text-center mt-2 hidden', id: 'refreshStatus' }),
  ]);

  modal.setBody(body);
  modal.setFooter([
    { text: '取消', variant: 'btn-ghost', onClick: () => modal.close() },
    {
      text: '清缓存并刷新',
      variant: 'btn-primary',
      onClick: async () => {
        const bar = document.getElementById('refreshBar');
        const wrap = document.getElementById('refreshProgress');
        const status = document.getElementById('refreshStatus');
        wrap.classList.remove('hidden');
        status.classList.remove('hidden');
        status.textContent = '正在清理缓存并下载数据...';
        bar.style.width = '50%';
        bar.textContent = '50%';
        try {
          await clearCacheAndRefresh();
        } catch (e) {
          status.textContent = `刷新失败：${e.message}`;
          toast('刷新失败，请重试', 'error');
        }
      },
    },
  ]);
  modal.show();
}
