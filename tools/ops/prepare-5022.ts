import { prepareLocalMedia } from '../media-pipeline/src/prepareLocal.js';
import { resolve } from 'node:path';

async function main() {
  const sourceDirectory = resolve(
    'C:/Evydencia/evydflow-first-stage/data/pilots/natal-5022/runs/pilot-5022-20ab4d88a60feb81/staging/pilot-5022-20ab4d88a60feb81/_GAMEPLAY_LOCAL_SOURCE',
  );
  const storageRoot = resolve('C:/Evydencia/data/gameplay-storage-5022');

  console.log(`Starting media preparation from ${sourceDirectory} to ${storageRoot}...`);
  const result = await prepareLocalMedia({
    sourceDirectory,
    storageRoot,
    displayName: 'Lucas Henrique - Natal 2026',
    concurrency: 4,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
