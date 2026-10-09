import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(currentDir, '..');
const srcMigrations = join(packageDir, 'migrations');
const distMigrations = join(packageDir, 'dist', 'migrations');

if (existsSync(srcMigrations)) {
  mkdirSync(distMigrations, { recursive: true });
  cpSync(srcMigrations, distMigrations, { recursive: true });
}
