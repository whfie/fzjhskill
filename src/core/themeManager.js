// 主题管理器 - 三套主题自由切换
import { emit } from './eventBus.js';

const THEMES = ['sujian', 'moyun', 'jiandu'];
const STORAGE_KEY = 'fzjhskill_theme';
let current = 'sujian';

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && THEMES.includes(saved)) {
    current = saved;
  }
  applyTheme(current);
}

export function applyTheme(name) {
  if (!THEMES.includes(name)) return;
  current = name;
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem(STORAGE_KEY, name);
  emit('theme:changed', name);
}

export function getTheme() {
  return current;
}

export function getThemes() {
  return THEMES;
}

export function setTheme(name) {
  applyTheme(name);
}
