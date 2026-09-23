const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(text: string, max: number, maxLines = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur.trim());
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur.trim());
  if (lines.length === maxLines) {
    const used = lines.join(' ').length;
    if (used < text.length - 3) lines[maxLines - 1] = lines[maxLines - 1].replace(/.{3}$/, '…');
  }
  return lines.slice(0, maxLines);
}

export function renderOg(title: string, kind = 'posts'): string {
  const lines = wrap(title, 28, 3);
  const startY = 250;
  const lineH = 78;
  const tspans = lines
    .map((l, i) => `<tspan x="80" y="${startY + i * lineH}">${esc(l)}</tspan>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0c0c0d"/>
  <rect x="0" y="0" width="1200" height="4" fill="#3fb950"/>
  <text x="80" y="110" font-family="DejaVu Sans Mono, monospace" font-size="26" fill="#e7e7e4">elleuch<tspan fill="#3fb950">:~$</tspan></text>
  <text x="80" y="160" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#3fb950">## ${esc(kind)}</text>
  <text font-family="DejaVu Sans Mono, monospace" font-size="58" font-weight="600" fill="#e7e7e4">${tspans}</text>
  <text x="80" y="560" font-family="DejaVu Sans Mono, monospace" font-size="24" fill="#8a8a86">elleu.ch</text>
</svg>`;
}
