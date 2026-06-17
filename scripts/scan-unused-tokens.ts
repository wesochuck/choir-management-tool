import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

interface ThemeToken {
  rawName: string;
  type: string;
  name: string;
  generatedClasses: string[];
}

interface UsageLocation {
  file: string;
  line: number;
}

interface TokenUsage {
  token: ThemeToken;
  usageCount: number;
  usageLocations: UsageLocation[];
}

type OutputFormat = 'cli' | 'json';

interface ScanOptions {
  context?: boolean;
  format?: OutputFormat;
}

function parseThemeTokens(css: string): ThemeToken[] {
  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (!themeMatch) return [];

  const themeContent = themeMatch[1];
  const tokens: ThemeToken[] = [];

  for (const line of themeContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('--')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const withoutPrefix = key.slice(2);
    if (withoutPrefix.includes('--')) continue;

    const firstHyphen = withoutPrefix.indexOf('-');
    if (firstHyphen === -1) continue;

    const type = withoutPrefix.slice(0, firstHyphen);
    const name = withoutPrefix.slice(firstHyphen + 1);
    if (type === 'default') continue;

    tokens.push({
      rawName: key,
      type,
      name,
      generatedClasses: generateClasses(type, name),
    });
  }

  const utilityRegex = /@utility\s+(\S+)/g;
  let utilMatch: RegExpExecArray | null;
  while ((utilMatch = utilityRegex.exec(css)) !== null) {
    const name = utilMatch[1];
    tokens.push({
      rawName: `@utility ${name}`,
      type: 'utility',
      name,
      generatedClasses: [name],
    });
  }

  return tokens;
}

function generateClasses(type: string, name: string): string[] {
  switch (type) {
    case 'color':
      return [
        `bg-${name}`,
        `text-${name}`,
        `border-${name}`,
        `outline-${name}`,
        `ring-${name}`,
        `from-${name}`,
        `to-${name}`,
        `via-${name}`,
        `divide-${name}`,
        `accent-${name}`,
        `caret-${name}`,
        `fill-${name}`,
        `stroke-${name}`,
        `decoration-${name}`,
      ];
    case 'text':
      return [`text-${name}`];
    case 'animate':
      return [`animate-${name}`];
    default:
      return [];
  }
}

function walkDir(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'pocketbase'
        ) {
          results.push(...walkDir(full, extensions));
        }
      } else if (entry.isFile()) {
        if (extensions.some((e) => entry.name.endsWith(e))) {
          results.push(full);
        }
      }
    }
  } catch {
    // skip unreadable directories
  }
  return results;
}

function findLines(content: string, searchTerm: string): number[] {
  const lines: number[] = [];
  let idx = 0;
  let lineNum = 1;
  while (idx < content.length) {
    const lineEnd = content.indexOf('\n', idx);
    const line = lineEnd === -1 ? content.slice(idx) : content.slice(idx, lineEnd);
    if (line.includes(searchTerm)) {
      lines.push(lineNum);
    }
    if (lineEnd === -1) break;
    idx = lineEnd + 1;
    lineNum++;
  }
  return lines;
}

function scanTokenUsage(tokens: ThemeToken[], sourceFiles: string[]): TokenUsage[] {
  const usages: TokenUsage[] = tokens.map((token) => ({
    token,
    usageCount: 0,
    usageLocations: [],
  }));

  const searchTerms = new Map<string, number[]>();
  for (let i = 0; i < tokens.length; i++) {
    for (const cls of tokens[i].generatedClasses) {
      const existing = searchTerms.get(cls) || [];
      existing.push(i);
      searchTerms.set(cls, existing);
    }
    const existing = searchTerms.get(tokens[i].rawName) || [];
    existing.push(i);
    searchTerms.set(tokens[i].rawName, existing);
  }

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf-8');
    for (const [term, indexes] of searchTerms) {
      if (content.includes(term)) {
        const matchedLines = findLines(content, term);
        for (const tokenIdx of indexes) {
          usages[tokenIdx].usageCount += matchedLines.length;
          for (const line of matchedLines) {
            usages[tokenIdx].usageLocations.push({ file, line });
          }
        }
      }
    }
  }

  return usages;
}

function findStemReferences(
  stem: string,
  files: string[]
): { file: string; line: number; snippet: string }[] {
  const results: { file: string; line: number; snippet: string }[] = [];
  const stemRegex = new RegExp(`\\b${stem}\\b`, 'i');
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (stemRegex.test(lines[i]) && /className|style|var\(|--/.test(lines[i])) {
        results.push({ file, line: i + 1, snippet: lines[i].trim().slice(0, 80) });
        if (results.length >= 5) break;
      }
    }
    if (results.length >= 5) break;
  }
  return results;
}

function printCliReport(
  usages: TokenUsage[],
  tokens: ThemeToken[],
  sourceFiles: string[],
  options: ScanOptions
): void {
  const unused = usages.filter((u) => u.usageCount === 0);
  const total = usages.length;
  const used = total - unused.length;
  const pct = total > 0 ? Math.round((used / total) * 100) : 100;

  if (unused.length > 0) {
    console.log('\nUNUSED THEME TOKENS');
    console.log('━'.repeat(72));
    console.log(` Token${' '.repeat(22)}Possible classes${' '.repeat(24)}Matches`);
    console.log('─'.repeat(72));
    for (const u of unused) {
      const classes = u.token.generatedClasses.slice(0, 3).join(', ');
      const suffix = u.token.generatedClasses.length > 3 ? ', ...' : '';
      const clsDisplay = (classes + suffix).padEnd(40).slice(0, 40);
      console.log(` ${u.token.rawName.padEnd(24)}${clsDisplay}${String(u.usageCount).padStart(5)}`);
      if (options.context) {
        const stem = u.token.name;
        const refs = findStemReferences(stem, sourceFiles);
        if (refs.length > 0) {
          console.log(` ${' '.repeat(24)}potential indirect refs for "${stem}":`);
          for (const ref of refs.slice(0, 5)) {
            const shortPath = relative(process.cwd(), ref.file);
            console.log(` ${' '.repeat(28)}${shortPath}:${ref.line}  ${ref.snippet}`);
          }
          if (refs.length > 5) {
            console.log(` ${' '.repeat(28)}... and ${refs.length - 5} more`);
          }
        }
      }
    }
    console.log('─'.repeat(72));
  }

  const usedTokens = usages.filter((u) => u.usageCount > 0);
  if (usedTokens.length > 0) {
    console.log('\nUSED THEME TOKENS');
    console.log('━'.repeat(72));
    console.log(` Token${' '.repeat(22)}Matches  Sample locations`);
    console.log('─'.repeat(72));
    for (const u of usedTokens) {
      const locations = u.usageLocations
        .slice(0, 3)
        .map((l) => `${relative(process.cwd(), l.file)}:${l.line}`);
      const hasMore = u.usageLocations.length > 3;
      const locDisplay = locations.join(', ') + (hasMore ? ', ...' : '');
      console.log(
        ` ${u.token.rawName.padEnd(24)}${String(u.usageCount).padStart(7)}  ${locDisplay}`
      );
    }
    console.log('─'.repeat(72));
  }

  console.log(` ${unused.length} of ${total} tokens unused (${pct}% usage)\n`);
}

function printJsonReport(usages: TokenUsage[]): void {
  const output = usages.map((u) => ({
    token: u.token.rawName,
    type: u.token.type,
    generatedClasses: u.token.generatedClasses,
    usageCount: u.usageCount,
    usageLocations: u.usageLocations.map((l) => `${relative(process.cwd(), l.file)}:${l.line}`),
  }));
  console.log(JSON.stringify(output, null, 2));
}

function main(): void {
  const args = process.argv.slice(2);
  const options: ScanOptions = {
    context: args.includes('--context'),
    format: args.includes('--json') ? 'json' : 'cli',
  };

  const rootDir = resolve(process.cwd());
  const cssPath = join(rootDir, 'src', 'index.css');

  const css = readFileSync(cssPath, 'utf-8');
  const tokens = parseThemeTokens(css);
  if (tokens.length === 0) {
    console.error('No theme tokens found in src/index.css');
    process.exit(1);
  }

  const sourceFiles = walkDir(join(rootDir, 'src'), ['.ts', '.tsx', '.css']);
  const usages = scanTokenUsage(tokens, sourceFiles);

  if (options.format === 'json') {
    printJsonReport(usages);
  } else {
    printCliReport(usages, tokens, sourceFiles, options);
  }

  if (usages.some((u) => u.usageCount === 0)) {
    process.exit(1);
  }
}

main();
