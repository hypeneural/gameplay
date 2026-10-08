import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { runAssetCommand } from './index.js';

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));

export async function validateAllAssetOwners(
  root = workspaceRoot,
): Promise<{ readonly exitCode: number; readonly owners: readonly string[] }> {
  const gamesRoot = join(root, 'packages', 'games');
  const entries = await readdir(gamesRoot, { withFileTypes: true });
  const owners: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(join(gamesRoot, entry.name, 'assets', 'manifest.json'))) {
      owners.push(entry.name);
    }
  }
  owners.sort((left, right) => left.localeCompare(right));
  owners.push('christmas-shell');

  let exitCode = 0;
  for (const owner of owners) {
    const result = await runAssetCommand({ command: 'validate', gameId: owner }, root);
    for (const line of result.lines) {
      process.stdout.write(`[${owner}] ${line}\n`);
    }
    if (result.exitCode !== 0) exitCode = 1;
  }
  return { exitCode, owners };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const result = await validateAllAssetOwners();
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}

if (process.argv[1]?.endsWith('validateAll.ts')) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        code: 'asset_validate_all_failed',
        message: error instanceof Error ? error.message : 'Unknown asset validation error.',
      })}\n`,
    );
    process.exitCode = 1;
  });
}
