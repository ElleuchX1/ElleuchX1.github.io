const fs = require('fs');
const path = require('path');

const CONTENT = path.resolve('src/content');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const enc = (u) => u.replace(/ /g, '%20');

function normUrl(url) {
  let u = url.replace(/\.(png|jpe?g)(?=$|\?)/i, '.webp');
  u = u.replace(/\.(png|jpe?g)/gi, '.webp');
  return enc(u);
}

for (const md of walk(CONTENT).filter((f) => f.endsWith('.md'))) {
  let t = fs.readFileSync(md, 'utf8');
  const before = t;

  // markdown images: ![alt](url){: ...}  (url may contain spaces)
  t = t.replace(/!\[([^\]]*)\]\(\s*([^)]+?)\s*\)(\{[^}]*\})?/g, (_m, alt, url) => {
    const u = normUrl(url.trim());
    const a = alt && alt.trim() ? alt.trim() : decodeURIComponent(u.split('/').pop()).replace(/\.webp$/i, '').replace(/[-_]+/g, ' ');
    return `![${a}](${u})`;
  });

  // <img ...> tags: normalize src, alt, lazy, decoding, strip style
  t = t.replace(/<img\b[^>]*>/gi, (tag) => {
    let x = tag;
    x = x.replace(/(src\s*=\s*")([^"]+)(")/i, (_m, a, url, b) => a + normUrl(url) + b);
    const src = (x.match(/src\s*=\s*"([^"]+)"/i) || [])[1] || '';
    const base = decodeURIComponent(src.split('/').pop() || 'image').replace(/\.webp$/i, '').replace(/[-_]+/g, ' ');
    if (!/\balt\s*=/i.test(x)) x = x.replace(/<img\b/i, `<img alt="${base}"`);
    x = x.replace(/\s*style\s*=\s*"[^"]*"/i, '');
    if (!/\bloading\s*=/i.test(x)) x = x.replace(/<img\b/i, '<img loading="lazy"');
    if (!/\bdecoding\s*=/i.test(x)) x = x.replace(/<img\b/i, '<img decoding="async"');
    return x;
  });

  // any leftover asset png/jpg refs (allow spaces)
  t = t.replace(/(\/assets\/img\/[^)"'<>\n]*?)\.(png|jpe?g)/gi, (_m, p) => enc(p) + '.webp');

  // strip stray kramdown attribute blocks
  t = t.replace(/\{:\s*[^}]*\}/g, '');

  if (t !== before) fs.writeFileSync(md, t);
}
console.log('pass2 done');
