import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        getAllFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

test('Static Analysis: No sequential await inside loop structures (unless annotated with @allow-sequential-await)', () => {
  const rootDir = path.resolve(process.cwd(), 'src');
  const files = getAllFiles(rootDir);
  const violations: { file: string; line: number; loopType: string }[] = [];

  for (const file of files) {
    const sourceCode = fs.readFileSync(file, 'utf-8');
    const sourceFile = ts.createSourceFile(
      file,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    function hasDirectAwait(node: ts.Node): boolean {
      let found = false;

      function walk(n: ts.Node) {
        if (found) return;

        if (n.kind === ts.SyntaxKind.AwaitExpression) {
          found = true;
          return;
        }

        // Do not descend into nested function boundaries
        if (
          n.kind === ts.SyntaxKind.FunctionDeclaration ||
          n.kind === ts.SyntaxKind.FunctionExpression ||
          n.kind === ts.SyntaxKind.ArrowFunction ||
          n.kind === ts.SyntaxKind.MethodDeclaration
        ) {
          return;
        }

        ts.forEachChild(n, walk);
      }

      ts.forEachChild(node, walk);
      return found;
    }

    function checkNode(node: ts.Node) {
      const isLoop =
        node.kind === ts.SyntaxKind.ForStatement ||
        node.kind === ts.SyntaxKind.ForInStatement ||
        node.kind === ts.SyntaxKind.ForOfStatement ||
        node.kind === ts.SyntaxKind.WhileStatement ||
        node.kind === ts.SyntaxKind.DoStatement;

      if (isLoop) {
        const fullText = node.getFullText(sourceFile);
        
        // Skip check if the loop is explicitly allowed with the override annotation
        if (!fullText.includes('@allow-sequential-await')) {
          if (hasDirectAwait(node)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            let loopType = 'loop';
            if (node.kind === ts.SyntaxKind.ForStatement) loopType = 'for';
            else if (node.kind === ts.SyntaxKind.ForInStatement) loopType = 'for...in';
            else if (node.kind === ts.SyntaxKind.ForOfStatement) loopType = 'for...of';
            else if (node.kind === ts.SyntaxKind.WhileStatement) loopType = 'while';
            else if (node.kind === ts.SyntaxKind.DoStatement) loopType = 'do...while';

            violations.push({
              file: path.relative(process.cwd(), file),
              line: line + 1, // 1-indexed
              loopType,
            });
          }
        }
      }

      ts.forEachChild(node, checkNode);
    }

    ts.forEachChild(sourceFile, checkNode);
  }

  if (violations.length > 0) {
    const errorMsg = violations
      .map(
        (v) =>
          `  - [${v.file}:${v.line}] Sequential await in "${v.loopType}" loop. Use Promise.all or annotate with // @allow-sequential-await to ignore.`
      )
      .join('\n');
    assert.fail(`Found ${violations.length} sequential await-in-loop violation(s):\n${errorMsg}`);
  }
});
