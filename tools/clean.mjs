import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entries = fs.readdirSync(root, { withFileTypes: true });

let count = 0;
for (const entry of entries) {
  if (entry.isDirectory()) {
    if (entry.name.startsWith('playwright-report') || entry.name.startsWith('test-results')) {
      const fullPath = path.join(root, entry.name);
      fs.rmSync(fullPath, { recursive: true, force: true });
      count++;
    }
  }
}

console.log(`Cleaned ${count} test artifact directories.`);
