import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !specifier.endsWith('.js') && !specifier.endsWith('.ts') && !specifier.endsWith('.json')) {
    try {
      return await nextResolve(specifier + '.ts', context);
    } catch (e) {
      // Fallback to nextResolve
    }
  }
  if (specifier === '../lib/pocketbase') {
    return nextResolve(specifier + '.ts', context);
  }
  return nextResolve(specifier, context);
}

