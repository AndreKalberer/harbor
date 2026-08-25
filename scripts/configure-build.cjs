const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const args = new Set(process.argv.slice(2));
const apiKey = String(process.env.TMDB_API_KEY || '').trim();
const requireKey = args.has('--require');
const includeDesktop = args.has('--desktop') || (!args.has('--desktop') && !args.has('--tv'));
const includeTv = args.has('--tv');

if (apiKey && !/^[a-zA-Z0-9_-]{20,}$/.test(apiKey)) {
  throw new Error('TMDB_API_KEY has an unexpected format.');
}

if (requireKey && !apiKey) {
  throw new Error('TMDB_API_KEY is required for this release build.');
}

const configSource = `window.HARBOR_CONFIG = Object.freeze({\n  tmdbApiKey: '${apiKey}'\n});\n`;
const targets = [];
if (includeDesktop) targets.push(path.join(root, 'app', 'config.js'));
if (includeTv) targets.push(path.join(root, 'tv', 'config.js'));

for (const target of targets) {
  fs.writeFileSync(target, configSource, 'utf8');
}

process.stdout.write(`Configured ${targets.length} Harbor build target${targets.length === 1 ? '' : 's'} (${apiKey ? 'catalog enabled' : 'offline catalog fallback'}).\n`);
