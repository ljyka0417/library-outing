/**
 * 아주 작은 xlsx 읽기 — 압축을 푼 폴더(xl/sharedStrings.xml, xl/worksheets/sheet1.xml)에서 첫 시트를 행 배열로.
 * 라이브러리를 새로 깔지 않으려고 쓴다(셀 값·공유 문자열만, 서식은 무시).
 */
const fs = require('node:fs');
const path = require('node:path');

const unescape = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function colIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

module.exports = function readXlsx(dir) {
  const ssPath = path.join(dir, 'xl', 'sharedStrings.xml');
  const shared = fs.existsSync(ssPath)
    ? [...fs.readFileSync(ssPath, 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
      )
    : [];
  const xml = fs.readFileSync(path.join(dir, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
  const rows = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, ref, attrs, inner = ''] = c;
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const isText = /t="s"/.test(attrs);
      const inline = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      row[colIndex(ref)] = isText ? shared[Number(v)] : inline !== undefined ? unescape(inline) : v !== undefined ? unescape(v) : '';
    }
    rows.push(row.map((x) => (x === undefined ? '' : String(x))));
  }
  return rows;
};
