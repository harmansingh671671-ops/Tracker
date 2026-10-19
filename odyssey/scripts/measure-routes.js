// Per-route first-load measurement for PERFORMANCE.md.
//
// Usage:  npm run measure-routes
//
// WHY THIS EXISTS
//
// `measure-bundle.js` totals every chunk in the build, which answers "how much
// JavaScript exists" rather than "what does opening a screen cost". Those are
// different numbers and they lead to different work: the total was 457 KB while
// any single screen paid 261 KB of it as a shared set, and the screens' own code
// turned out to be 1.6-39 KB. Splitting the screen files (`PERF-5c`) could not
// have moved that, and the total hid it.
//
// So this runs Next's own Turbopack analyzer, which knows the module graph, and
// reports what each route loads at first paint -- split into the part every route
// pays and the part that route adds -- with gzip on the headline because that is
// what a phone downloads.
//
// It intentionally does NOT enforce a budget: `PERF-18a` wants that in CI, and
// there is no CI in this repo. A budget nobody runs is a comment.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const statsFile = path.join(root, '.next', 'diagnostics', 'route-bundle-stats.json');

// The analyzer reads the LAST build's output -- its own help says "does not
// produce an application build" -- so a build has to come first, and skipping it
// silently reports the previous code's numbers.
if (!process.argv.includes('--no-analyze')) {
  console.log('Building, then running the Turbopack analyzer (a few seconds)...\n');
  execSync('npx next build', { cwd: root, stdio: 'inherit' });
  execSync('npx next experimental-analyze --output', { cwd: root, stdio: 'inherit' });
}

if (!fs.existsSync(statsFile)) {
  console.error(`No route stats at ${statsFile}. Run: npm run analyze`);
  process.exit(1);
}

const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));

// Size every chunk once. The analyzer reports raw bytes only; gzip is measured
// here because raw chunk bytes are not what a phone downloads.
const sizes = new Map();
for (const route of stats) {
  for (const p of route.firstLoadChunkPaths) {
    if (sizes.has(p)) continue;
    const content = fs.readFileSync(path.join(root, p));
    sizes.set(p, { raw: content.length, gz: zlib.gzipSync(content, { level: 9 }).length });
  }
}

const kb = (n) => (n / 1024).toFixed(1);
const total = (paths, key) => paths.reduce((s, p) => s + sizes.get(p)[key], 0);

// A chunk every route loads cannot be split by route; everything else is a route's own.
const loadedBy = new Map();
for (const route of stats) for (const p of route.firstLoadChunkPaths) loadedBy.set(p, (loadedBy.get(p) || 0) + 1);

const rows = stats
  .map((route) => {
    const shared = route.firstLoadChunkPaths.filter((p) => loadedBy.get(p) === stats.length);
    const own = route.firstLoadChunkPaths.filter((p) => loadedBy.get(p) < stats.length);
    return { route: route.route, gz: total(route.firstLoadChunkPaths, 'gz'), raw: total(route.firstLoadChunkPaths, 'raw'), sharedGz: total(shared, 'gz'), ownGz: total(own, 'gz'), chunks: route.firstLoadChunkPaths.length };
  })
  .sort((a, b) => b.gz - a.gz);

console.log('FIRST LOAD PER ROUTE -- what opening that screen downloads');
console.log('  route             gzip      =  shared   +  its own   (chunks)');
for (const r of rows) {
  console.log(`  ${r.route.padEnd(16)} ${kb(r.gz).padStart(7)} KB = ${kb(r.sharedGz).padStart(7)} + ${kb(r.ownGz).padStart(7)}   (${r.chunks})`);
}

const sharedPaths = [...loadedBy.keys()].filter((p) => loadedBy.get(p) === stats.length);
const sharedGz = total(sharedPaths, 'gz');
console.log(`\nSHARED BY EVERY ROUTE: ${kb(sharedGz)} KB gzip across ${sharedPaths.length} chunks`);
for (const p of sharedPaths.sort((a, b) => sizes.get(b).gz - sizes.get(a).gz)) {
  const content = fs.readFileSync(path.join(root, p), 'utf8');
  const hits = [
    ['react', ['react-dom', 'react-stack-bottom-frame']],
    ['next', ['next/dist', '__NEXT_DATA__']],
    ['framer-motion', ['framer-motion', 'transformPagePoint', 'MotionValue']],
    ['base-ui', ['@base-ui', 'base-ui']],
    ['dexie', ['Dexie', 'dexie']],
    ['lucide', ['lucide']],
    ['date-fns', ['date-fns', 'formatDistance']],
    ['day-picker', ['react-day-picker', 'DayPicker']],
  ].filter(([, markers]) => markers.some((m) => content.includes(m))).map(([name]) => name);
  console.log(`  ${kb(sizes.get(p).gz).padStart(7)} KB  ${path.basename(p).padEnd(26)} ${hits.join(', ')}`);
}

console.log('\nALL CLIENT JS IN THE BUILD (every chunk, every route)');
const chunksDir = path.join(root, '.next', 'static', 'chunks');
let allRaw = 0, allGz = 0;
if (fs.existsSync(chunksDir)) {
  for (const name of fs.readdirSync(chunksDir)) {
    if (!name.endsWith('.js')) continue;
    const b = fs.readFileSync(path.join(chunksDir, name));
    allRaw += b.length;
    allGz += zlib.gzipSync(b, { level: 9 }).length;
  }
}
console.log(`  ${kb(allGz)} KB gzip / ${kb(allRaw)} KB raw`);
console.log('\nFor the whole-build total (JS + CSS + images, split by compressibility): npm run measure-bundle');
