// DOM 辅助工具
/**
 * 创建元素
 * @param {string} tag 标签名
 * @param {object} attrs 属性 { class, id, dataset, onclick, ... }
 * @param {Array|string|Node} children 子元素
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (val == null || val === false) continue;
    if (key === 'class') node.className = val;
    else if (key === 'dataset') Object.assign(node.dataset, val);
    else if (key === 'style' && typeof val === 'object') Object.assign(node.style, val);
    else if (key.startsWith('on') && typeof val === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'html') {
      node.innerHTML = val;
    } else {
      node.setAttribute(key, val);
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  if (children == null || children === '') return;
  if (Array.isArray(children)) {
    children.forEach((c) => appendChildren(node, c));
  } else if (children instanceof Node) {
    node.appendChild(children);
  } else {
    node.appendChild(document.createTextNode(String(children)));
  }
}

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// 批量渲染：分批插入 DOM 避免长时间阻塞，返回带 abort 方法的 Promise
export function batchRender(items, container, batchSize = 30, delay = 16) {
  let index = 0;
  let timer = null;
  let cancelled = false;
  let resolved = false;
  let resolveFn = null;

  const promise = new Promise((resolve) => {
    resolveFn = resolve;
    function renderBatch() {
      if (cancelled) return;
      const end = Math.min(index + batchSize, items.length);
      const frag = document.createDocumentFragment();
      for (; index < end; index++) {
        if (cancelled) return;
        frag.appendChild(items[index]);
      }
      if (!cancelled) container.appendChild(frag);
      if (index < items.length && !cancelled) {
        timer = setTimeout(renderBatch, delay);
      } else if (!resolved) {
        resolved = true;
        resolve();
      }
    }
    renderBatch();
  });

  promise.abort = () => {
    cancelled = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!resolved && resolveFn) {
      resolved = true;
      resolveFn();
    }
  };
  return promise;
}
