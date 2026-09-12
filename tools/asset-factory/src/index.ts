import { fileURLToPath } from 'node:url';
import {
  assetManifestRelativePath,
  auditAssetManifest,
  loadAssetManifest,
  migrateAssetManifest,
} from './manifest.js';

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const commands = [
  'doctor',
  'validate',
  'audit',
  'catalog',
  'budget',
  'manifest',
  'migrate',
] as const;
type AssetCommand = (typeof commands)[number];

export interface AssetCommandOptions {
  command: AssetCommand;
  gameId: string;
}

export function parseAssetCommand(arguments_: readonly string[]): AssetCommandOptions {
  const [command, ...flags] = arguments_;
  if (!command || !commands.includes(command as AssetCommand)) {
    throw new Error(`Choose one command: ${commands.join(', ')}.`);
  }
  let gameId = 'puzzle-swap';
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === '--') continue;
    if ((flag !== '--game' && flag !== '--owner') || !flags[index + 1]) {
      throw new Error(
        'Usage: asset-factory <command> [--game <game-id> | --owner christmas-shell].',
      );
    }
    if (flag === '--owner' && flags[index + 1] !== 'christmas-shell')
      throw new Error('The supported application owner is christmas-shell.');
    gameId = flags[index + 1]!;
    index += 1;
  }
  return { command: command as AssetCommand, gameId };
}

export async function runAssetCommand(
  options: AssetCommandOptions,
  root = workspaceRoot,
): Promise<{ exitCode: number; lines: readonly string[] }> {
  if (options.command === 'manifest') {
    await loadAssetManifest(root, options.gameId);
    return { exitCode: 0, lines: [assetManifestRelativePath(options.gameId)] };
  }

  const document = await loadAssetManifest(root, options.gameId);
  const manifest = await migrateAssetManifest(root, document);
  if (options.command === 'migrate') {
    return { exitCode: 0, lines: [JSON.stringify(manifest, null, 2)] };
  }
  const audit = await auditAssetManifest(root, options.gameId);
  const prefix = `Assets de ${manifest.gameId}`;
  const errors = audit.errors.map((error) => `ERRO: ${error}`);
  const warnings = audit.warnings.map((warning) => `AVISO: ${warning}`);
  const budgetLines = [
    `${prefix}: ${manifest.assets.length} arquivos catalogados.`,
    `Pacote público: ${audit.totals.publicBytes} / ${manifest.budget.publicBytesMax} bytes.`,
    `Uma partida: ${audit.totals.runtimeBytes} / ${manifest.budget.runtimeBytesMax} bytes.`,
    `Visuais: ${audit.totals.visualBytes} / ${manifest.budget.visualBytesMax} bytes.`,
  ];

  if (options.command === 'catalog') {
    const catalog = manifest.assets.map((asset) => {
      const role =
        asset.kind === 'audio'
          ? `som:${asset.runtime.cue}`
          : `${asset.kind}:${asset.runtime.textureKey}`;
      return `${asset.id} — ${role} — ${asset.runtime.bytes} bytes — ${asset.source.origin}`;
    });
    return {
      exitCode: errors.length === 0 ? 0 : 1,
      lines: [...budgetLines.slice(0, 1), ...catalog, ...warnings, ...errors],
    };
  }
  if (options.command === 'budget') {
    return {
      exitCode: errors.length === 0 ? 0 : 1,
      lines: [...budgetLines, ...warnings, ...errors],
    };
  }
  if (options.command === 'doctor') {
    const health =
      errors.length === 0
        ? 'Pronto para auditar e reutilizar.'
        : 'Encontrou problemas que precisam ser corrigidos.';
    return {
      exitCode: errors.length === 0 ? 0 : 1,
      lines: [health, ...budgetLines, ...warnings, ...errors],
    };
  }
  return {
    exitCode: errors.length === 0 ? 0 : 1,
    lines:
      errors.length === 0
        ? [
            'Manifesto válido: arquivos, tamanhos, orçamento e catálogo estão consistentes.',
            ...warnings,
          ]
        : [...warnings, ...errors],
  };
}

async function main(): Promise<void> {
  const options = parseAssetCommand(process.argv.slice(2));
  const result = await runAssetCommand(options);
  for (const line of result.lines) console.log(line);
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}

if (process.argv[1]?.endsWith('index.ts')) {
  void main();
}
