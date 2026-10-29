import { referencedEntryAssets } from './check-public-web-alignment.mjs';

export function assertViteEntryIntegrity(html, manifestPaths) {
  if (!(manifestPaths instanceof Set)) throw Error('VITE_ASSET_MANIFEST_INVALID');
  const assets = referencedEntryAssets(html);
  if (assets.length < 2 ||
      !assets.some((name) => name.endsWith('.js')) ||
      !assets.some((name) => name.endsWith('.css'))) {
    throw Error('VITE_ENTRYPOINT_PAIR_MISSING');
  }
  for (const asset of assets) {
    if (!manifestPaths.has('web' + asset)) throw Error('VITE_REFERENCED_ENTRY_MISSING');
  }
  return { status: 'VITE_ENTRY_MANIFEST_PASS', assetCount: assets.length };
}
