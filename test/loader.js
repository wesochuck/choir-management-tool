import { pathToFileURL } from 'node:url';

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

