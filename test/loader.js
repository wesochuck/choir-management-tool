import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '../lib/pocketbase') {
    return nextResolve(specifier + '.ts', context);
  }
  return nextResolve(specifier, context);
}
