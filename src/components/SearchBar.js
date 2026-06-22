// 搜索栏组件
import { el } from '../utils/dom.js';
import { debounce } from '../utils/format.js';

export function createSearchBar(onSearch, initialValue = '') {
  const input = el('input', {
    type: 'text',
    class: 'search-input',
    placeholder: '搜索技能名称、描述、属性、效果...',
    value: initialValue,
  });
  const icon = el('span', { class: 'search-icon', html: '&#128269;' });
  const debouncedSearch = debounce(() => onSearch(input.value), 200);
  input.addEventListener('input', debouncedSearch);
  return el('div', { class: 'search-bar' }, [icon, input]);
}

export function getSearchValue() {
  const input = document.querySelector('.search-input');
  return input ? input.value : '';
}
