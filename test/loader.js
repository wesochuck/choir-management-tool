import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !specifier.endsWith('.js') && !specifier.endsWith('.ts') && !specifier.endsWith('.json') && !specifier.endsWith('.tsx')) {
    try {
      return await nextResolve(specifier + '.ts', context);
    } catch (e) {
      try {
        return await nextResolve(specifier + '.tsx', context);
      } catch (e2) {
        // Fallback to nextResolve
      }
    }
  }
  if (specifier === '../lib/pocketbase') {
    return nextResolve(specifier + '.ts', context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.tsx')) {
    const source = await readFile(new URL(url), 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: new URL(url).pathname,
    });

    return {
      format: 'module',
      shortCircuit: true,
      source: transpiled.outputText,
    };
  }

  return nextLoad(url, context);
}
