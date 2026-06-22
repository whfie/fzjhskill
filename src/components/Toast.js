// Toast 通知组件
import { el } from '../utils/dom.js';

let container = null;

function getContainer() {
  if (!container) {
    container = el('div', { class: 'toast-container' });
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info', duration = 3000) {
  const t = el('div', { class: `toast ${type}` }, message);
  getContainer().appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

export function success(msg, duration) { toast(msg, 'success', duration); }
export function error(msg, duration) { toast(msg, 'error', duration); }
export function warning(msg, duration) { toast(msg, 'warning', duration); }
