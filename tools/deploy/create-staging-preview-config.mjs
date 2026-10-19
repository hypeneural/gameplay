import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const output = parseOutput(process.argv.slice(2));
const absoluteOutput = resolve(output);

if (isInsideRepository(absoluteOutput)) {
  throw new Error('Refusing to write staging capability configuration inside the repository.');
}

const activeToken = randomBytes(32).toString('base64url');
const revokedToken = randomBytes(32).toString('base64url');
const config = {
  version: 1,
  sessions: [
    {
      token: activeToken,
      status: 'active',
      preview: { kind: 'generic', version: 'evydencia-christmas-v2' },
    },
    {
      token: revokedToken,
      status: 'revoked',
    },
  ],
};

await mkdir(dirname(absoluteOutput), { recursive: true, mode: 0o700 });
await writeFile(absoluteOutput, `${JSON.stringify(config, null, 2)}\n`, {
  encoding: 'utf8',
  mode: 0o600,
  flag: 'wx',
});

process.stdout.write(
  `${JSON.stringify({
    status: 'created',
    tokenPrinted: false,
    instruction:
      'Read the private file locally when you need the synthetic token; never paste it into Git, CI logs or documentation.',
  })}\n`,
);

function parseOutput(argv) {
  let outputPath;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') continue;
    const value = argv[index + 1];
    if (!flag || !value) throw new Error(`Expected a value after ${flag ?? 'option'}.`);
    index += 1;
    if (flag === '--output') outputPath = value;
    else throw new Error(`Unknown staging config option: ${flag}.`);
  }
  if (!outputPath) {
    throw new Error('Usage: pnpm deploy:staging-config --output <private-path-outside-repository>');
  }
  return outputPath;
}

function isInsideRepository(path) {
  const candidate = relative(repositoryRoot, path);
  return candidate === '' || (!candidate.startsWith('..') && !isAbsolute(candidate));
}
