export function referencedEntryAssets(html) {
  if (typeof html !== 'string') throw new TypeError('HTML_NOT_STRING');
  const found = new Set();
  const matcher =
    /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["'](\/assets\/[A-Za-z0-9_.-]+\.(?:js|css))["']/gi;
  for (const match of html.matchAll(matcher)) found.add(match[1]);
  return [...found].sort();
}

export function assertViteEntryIntegrity(html, manifestPaths) {
  if (!(manifestPaths instanceof Set)) throw Error('VITE_ASSET_MANIFEST_INVALID');
  const assets = referencedEntryAssets(html);
  if (
    assets.length < 2 ||
    !assets.some((name) => name.endsWith('.js')) ||
    !assets.some((name) => name.endsWith('.css'))
  ) {
    throw Error('VITE_ENTRYPOINT_PAIR_MISSING');
  }
  for (const asset of assets) {
    if (!manifestPaths.has('web' + asset)) throw Error('VITE_REFERENCED_ENTRY_MISSING');
  }
  return { status: 'VITE_ENTRY_MANIFEST_PASS', assetCount: assets.length };
}
