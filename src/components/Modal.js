// 可复用模态框组件
import { el, clearChildren } from '../utils/dom.js';

// 模态框栈：跟踪当前打开的模态框数量，确保嵌套关闭时仅当栈空才恢复背景滚动
const modalStack = [];

export class Modal {
  constructor(options = {}) {
    this.options = {
      size: 'md', // sm | md | lg
      title: '',
      closable: true,
      onClose: null,
      ...options,
    };
    this.overlay = null;
    this.container = null;
    this.bodyEl = null;
    this.footerEl = null;
    this._build();
  }

  _build() {
    const sizeClass = this.options.size === 'lg' ? 'modal-lg' : this.options.size === 'sm' ? 'modal-sm' : '';
    this.overlay = el('div', { class: 'modal-overlay' });
    this.container = el('div', { class: `modal-container ${sizeClass}`.trim() });

    // 头部
    const header = el('div', { class: 'modal-header' }, [
      el('h3', { class: 'modal-title' }, this.options.title),
    ]);
    if (this.options.closable) {
      header.appendChild(el('button', {
        class: 'modal-close',
        onclick: () => this.close(),
        html: '&times;',
      }));
    }
    this.container.appendChild(header);

    // 内容区
    this.bodyEl = el('div', { class: 'modal-body' });
    this.container.appendChild(this.bodyEl);

    // 底部
    this.footerEl = el('div', { class: 'modal-footer hidden' });
    this.container.appendChild(this.footerEl);

    this.overlay.appendChild(this.container);

    // 点击遮罩关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.options.closable) this.close();
    });

    // ESC 关闭
    this._onKey = (e) => {
      if (e.key === 'Escape' && this.options.closable) this.close();
    };
  }

  setBody(content) {
    clearChildren(this.bodyEl);
    if (typeof content === 'string') {
      this.bodyEl.innerHTML = content;
    } else if (Array.isArray(content)) {
      content.forEach((c) => this.bodyEl.appendChild(c));
    } else if (content instanceof Node) {
      this.bodyEl.appendChild(content);
    }
    return this;
  }

  setTitle(title) {
    const titleEl = this.container.querySelector('.modal-title');
    if (titleEl) titleEl.textContent = title;
    return this;
  }

  setFooter(buttons) {
    clearChildren(this.footerEl);
    buttons.forEach((btn) => {
      this.footerEl.appendChild(el('button', {
        class: `btn ${btn.variant || 'btn-primary'}`,
        onclick: btn.onClick,
      }, btn.text));
    });
    this.footerEl.classList.remove('hidden');
    return this;
  }

  show() {
    document.body.appendChild(this.overlay);
    modalStack.push(this);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKey);
    return this;
  }

  close() {
    if (this.overlay.parentNode) {
      this.overlay.remove();
    }
    const idx = modalStack.indexOf(this);
    if (idx !== -1) modalStack.splice(idx, 1);
    // 仅当没有其他模态框打开时才恢复背景滚动
    if (modalStack.length === 0) {
      document.body.style.overflow = '';
    }
    document.removeEventListener('keydown', this._onKey);
    if (this.options.onClose) this.options.onClose();
  }

  getBody() { return this.bodyEl; }
}
