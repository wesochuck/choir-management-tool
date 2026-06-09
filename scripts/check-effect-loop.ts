/**
 * Scans for useEffect dependency cycles:
 *   useEffect(() => {
 *     apiCall().then(setData).catch(() => setData([]));
 *   }, [filters, data]);  // data in deps causes loop on failure
 *
 * Run: node --import ./test/register.js --experimental-strip-types scripts/check-effect-loop.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = walkDir('src');

interface Hit {
  file: string;
  line: number;
  stateVar: string;
  deps: string[];
}

const hits: Hit[] = [];

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  
  // Find useEffect calls with their dep arrays
  const useEffectRegex = /useEffect\s*\(\s*(?:\(\)\s*)?=>\s*{([\s\S]*?)}\s*,\s*\[([\s\S]*?)\]\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = useEffectRegex.exec(content)) !== null) {
    const body = match[1];
    const depsStr = match[2];
    const deps = depsStr.split(',').map(d => d.trim()).filter(Boolean);
    const depsSet = new Set(deps);

    // Find setState calls that write fallback values inside .catch() or .then()
    // Pattern: setXxx(...) where Xxx matches a dep name
    const setterRegex = /(set([A-Z]\w*))\s*\(/g;
    let setterMatch: RegExpExecArray | null;

    while ((setterMatch = setterRegex.exec(body)) !== null) {
      const stateName = setterMatch[2];     // e.g., Data → data
      const stateVar = stateName.charAt(0).toLowerCase() + stateName.slice(1); // data

      if (depsSet.has(stateVar)) {
        // Check if the setter is inside a .then() or .catch()
        const pos = setterMatch.index;
        const before = body.slice(Math.max(0, pos - 200), pos);
        const after = body.slice(pos, Math.min(body.length, pos + 200));

        if (/\.(then|catch|finally)\s*\(/.test(before) || /\.(then|catch|finally)\s*\(/.test(after)) {
          const lineNum = content.slice(0, content.indexOf(match[0])).split('\n').length;
          hits.push({ file, line: lineNum + 1, stateVar, deps });
          break; // one hit per useEffect
        }
      }
    }
  }
}

if (hits.length === 0) {
  console.log('✅ No useEffect dependency cycles detected.');
} else {
  console.log(`⚠️  Found ${hits.length} potential useEffect dependency cycle(s):\n`);
  for (const h of hits) {
    console.log(`  ${h.file}:${h.line}`);
    console.log(`    state: ${h.stateVar} in deps: [${h.deps.join(', ')}]`);
    console.log();
  }
}
