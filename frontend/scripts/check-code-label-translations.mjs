import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = join(ROOT, 'src', 'views');

const INCLUDE_EXTENSIONS = new Set(['.ts', '.tsx']);

const WHITELIST_PATTERNS = [
  /groupDraft\.name_default/,
  /editingGroupDraft\.name_default/,
  /fieldDraft\.name_default/,
  /group\.name_default/,
  /field\.name_default/,
  /permission\.name_default/,
  /catalogue\?\.name_default/,
  /medical_value_template\?\.name_default/,
  /tpl\?\.name_default/,
  /l\.name_default/,
  /templates\[0\]\.name_default/,
  /first\?\.name_default/,
  /createElement\('option', \{ key: c\.id, value: c\.key \}, c\.name_default\)/,
  /\{c\.key\} – \{c\.name_default\}/,
  /catalogue\.name_default/,
  /\{t\.name_default\}/,
  /languages\[0\]\?\.name_default/,
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }
    const dot = entry.lastIndexOf('.');
    const ext = dot >= 0 ? entry.slice(dot) : '';
    if (!INCLUDE_EXTENSIONS.has(ext)) continue;
    out.push(fullPath);
  }
  return out;
}

function isWhitelisted(line) {
  return WHITELIST_PATTERNS.some((pattern) => pattern.test(line));
}

function main() {
  const files = walk(TARGET_DIR);
  const violations = [];
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (!line.includes('.name_default')) return;
      if (line.includes('name_default:')) return;
      if (isWhitelisted(line)) return;
      violations.push({
        file: relative(ROOT, filePath),
        line: idx + 1,
        content: line.trim(),
      });
    });
  }

  if (violations.length === 0) {
    console.log('Code label translation guard passed.');
    process.exit(0);
  }

  console.error('Found direct .name_default usage in views. Use translateCodeLabel() for code displays:');
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line}`);
    console.error(`  ${v.content}`);
  }
  process.exit(1);
}

main();
