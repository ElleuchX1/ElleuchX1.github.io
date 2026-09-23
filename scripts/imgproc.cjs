const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_ROOT = path.resolve('public/assets/img');
const CONTENT = path.resolve('src/content');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const files = walk(IMG_ROOT).filter((f) => /\.(png|jpe?g)$/i.test(f));
  let converted = 0;
  for (const f of files) {
    const out = f.replace(/\.(png|jpe?g)$/i, '.webp');
    try {
      const buf = await sharp(f).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      fs.writeFileSync(out, buf);
      fs.unlinkSync(f);
      converted++;
    } catch (e) {
      console.error('fail', f, e.message);
    }
  }
  console.log('converted', converted, 'images');

  // rewrite markdown refs + fix <img> tags
  const mds = walk(CONTENT).filter((f) => f.endsWith('.md'));
  for (const md of mds) {
    let text = fs.readFileSync(md, 'utf8');
    const before = text;
    // extension swap only on /assets/img paths
    text = text.replace(/(\/assets\/img\/[^\s")'<>]+)\.(png|jpe?g)/gi, '$1.webp');
    // process <img> tags: alt + lazy + decoding, strip inline style
    text = text.replace(/<img\b[^>]*>/gi, (tag) => {
      let t = tag;
      const src = (t.match(/src\s*=\s*"([^"]+)"/i) || [])[1] || '';
      const base = decodeURIComponent(src.split('/').pop() || 'image').replace(/\.webp$/i, '').replace(/[-_]+/g, ' ');
      if (!/\balt\s*=/i.test(t)) t = t.replace(/<img\b/i, `<img alt="${base}"`);
      if (/\bstyle\s*=\s*"[^"]*"/i.test(t)) t = t.replace(/\s*style\s*=\s*"[^"]*"/i, '');
      if (!/\bloading\s*=/i.test(t)) t = t.replace(/<img\b/i, '<img loading="lazy"');
      if (!/\bdecoding\s*=/i.test(t)) t = t.replace(/<img\b/i, '<img decoding="async"');
      return t;
    });
    // strip inline style attributes on other inline html (old palette hacks)
    text = text.replace(/(<(?:p|span|div|h[1-6])\b[^>]*?)\sstyle="[^"]*"/gi, '$1');
    if (text !== before) fs.writeFileSync(md, text);
  }
  console.log('rewrote markdown files');
}
main().catch((e) => { console.error(e); process.exit(1); });
