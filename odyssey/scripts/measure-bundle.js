// Bundle measurement for PERFORMANCE.md.
//
// Usage:  npm run build && node scripts/measure-bundle.js
//
// WHY THIS EXISTS INSTEAD OF A "TOTAL BYTES" NUMBER
//
// A single total hides problems in both directions. JS and CSS compress about 3:1, so
// 1.4 MB of source ships as 436 KB. Images are already compressed, so 3 MB of PNG ships
// as ~3 MB. Add those together and the images look free. They are not -- and that is
// exactly how a 1,808 KB logo survived in a directory no item was looking at.
//
// So the output is deliberately split by compressibility, and the gzip column is the one
// to watch. Uncompressed bytes on disk are not what a phone downloads.
//
// This script lives in the repo because PERFORMANCE.md tells the next person how to
// re-measure. A measurement instruction that points at a temp directory is not an
// instruction, it is a rumour.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const kb = (n) => (n / 1024).toFixed(1).padStart(8) + ' KB';

const measure = (files, label) => {
  let raw = 0,
    gz = 0;
  const rows = [];
  for (const f of files) {
    const b = fs.readFileSync(f);
    const g = zlib.gzipSync(b, { level: 9 }).length;
    raw += b.length;
    gz += g;
    rows.push({ name: path.basename(f), raw: b.length, gz: g });
  }
  const ratio = raw > 0 ? ((gz / raw) * 100).toFixed(1) : '0.0';
  console.log(`\n${label}`);
  console.log(`  files : ${files.length}`);
  console.log(`  raw   : ${kb(raw)}`);
  console.log(`  gzip  : ${kb(gz)}   (${ratio}% of raw)`);
  return { count: files.length, raw, gz, rows };
};

const staticDir = '.next/static';

if (!fs.existsSync(staticDir)) {
  console.error(
    'No .next directory. Run `npm run build` first --\n' +
      'measuring a dev build or a stale one reports the wrong thing,\n' +
      'and `next start` will happily serve the PREVIOUS build while looking healthy.'
  );
  process.exit(1);
}

const js = walk(path.join(staticDir, 'chunks')).filter((f) => f.endsWith('.js'));
const css = walk(staticDir).filter((f) => f.endsWith('.css'));
const media = walk(path.join(staticDir, 'media'));
const fonts = walk('public').filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));
const pubimg = walk('public').filter((f) => /\.(png|jpe?g|webp|avif|svg|gif)$/i.test(f));

const jsM = measure(js, 'CLIENT JS  (.next/static/chunks/**/*.js)');
const cssM = measure(css, 'CSS');
measure(media, 'BUILD MEDIA  (.next/static/media)');
measure(fonts, 'FONTS  (public)');
measure(pubimg, 'PUBLIC IMAGES  (public)');

console.log('\nLARGEST JS CHUNKS (by gzip -- what a slow connection pays)');
jsM.rows
  .sort((a, b) => b.gz - a.gz)
  .slice(0, 8)
  .forEach((r) => console.log(`  ${kb(r.gz)} gzip  ${kb(r.raw)} raw   ${r.name}`));

console.log('\nLARGEST CSS');
cssM.rows
  .sort((a, b) => b.gz - a.gz)
  .slice(0, 5)
  .forEach((r) => console.log(`  ${kb(r.gz)} gzip  ${kb(r.raw)} raw   ${r.name}`));

console.log('\n--- BASELINE ---');
console.log(`  TOTAL client JS (all routes, gzip) : ${kb(jsM.gz)}`);
console.log(`  TOTAL CSS (gzip)                   : ${kb(cssM.gz)}`);
console.log(`  COMBINED (gzip)                    : ${kb(jsM.gz + cssM.gz)}`);

// `public/downloads/*.apk` is the in-app updater payload: it is downloaded deliberately
// by the updater, never on page load, so counting it against "what a page costs" would be
// as wrong as excluding it from "what a release costs". Reported, not judged.
const updater = walk('public/downloads');
if (updater.length) {
  const bytes = updater.reduce((n, f) => n + fs.statSync(f).size, 0);
  console.log(`\n  (not counted above) in-app updater payload: ${kb(bytes)} in public/downloads`);
}