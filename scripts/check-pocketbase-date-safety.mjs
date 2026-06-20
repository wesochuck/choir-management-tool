import fs from 'node:fs';
import path from 'node:path';

const root = 'pocketbase/pb_hooks_src';

const dateishFieldPattern = String.raw`(?:date|Date|created|updated|At|Time|fulfilledAt|saleEndDate|reminderSentAt|reportSentAt)`;

const fragilePatterns = [
  {
    name: 'typeof record.get(dateField) === string',
    regex: new RegExp(
      String.raw`typeof\s+[^;\n]*\.get\(['"][^'"]*${dateishFieldPattern}[^'"]*['"]\)[^;\n]*===\s*['"]string['"]`,
      'g'
    ),
  },
  {
    name: 'new Date(record.get(dateField))',
    regex: new RegExp(
      String.raw`new\s+Date\s*\(\s*[^;\n]*\.get\(['"][^'"]*${dateishFieldPattern}[^'"]*['"]\)[^)]*\)`,
      'g'
    ),
  },
  {
    name: 'string-only DateRaw parsing',
    regex: /typeof\s+[^;\n]*(?:DateRaw|dateRaw|TimeRaw|timeRaw|AtRaw)[^;\n]*===\s*['"]string['"]/g,
  },
  {
    name: 'Date constructor from raw datetime variable',
    regex:
      /new\s+Date\s*\(\s*(?:dateRaw|eventDateRaw|checkoutEventDateRaw|.*DateRaw|.*TimeRaw|.*AtRaw)\s*\)/g,
  },
];

const allowedFiles = new Set([path.normalize('pocketbase/pb_hooks_src/pocketbaseDate.ts')]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (/\.(ts|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const offenders = [];

for (const file of walk(root)) {
  const normalizedFile = path.normalize(file);
  if (allowedFiles.has(normalizedFile)) continue;

  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');

  for (const pattern of fragilePatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const index = match.index ?? 0;
      const lineNumber = text.slice(0, index).split('\n').length;
      const line = lines[lineNumber - 1]?.trim() ?? '';

      offenders.push({
        file,
        lineNumber,
        pattern: pattern.name,
        line,
      });
    }
  }
}

if (offenders.length > 0) {
  console.error('');
  console.error('Unsafe PocketBase datetime parsing detected.');
  console.error('');
  console.error('PocketBase Goja may return datetime fields as Go time.Time objects, not strings.');
  console.error('Use coercePocketBaseDate() from pocketbaseDate.ts instead.');
  console.error('');

  for (const offender of offenders) {
    console.error(`${offender.file}:${offender.lineNumber}`);
    console.error(`  Pattern: ${offender.pattern}`);
    console.error(`  ${offender.line}`);
    console.error('');
  }

  process.exit(1);
}
