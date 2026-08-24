import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface NewGameCommand {
  id: string;
  dryRun: boolean;
}

export interface GeneratedFile {
  relativePath: string;
  contents: string;
}

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const gameIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function parseNewGameCommand(arguments_: readonly string[]): NewGameCommand {
  const [id, ...flags] = arguments_;
  if (!id || !gameIdPattern.test(id)) {
    throw new Error('Game id must use lowercase kebab-case, for example: photo-bingo.');
  }
  if (flags.some((flag) => flag !== '--dry-run')) {
    throw new Error('Only --dry-run is supported. Usage: pnpm game:new <game-id> [--dry-run]');
  }
  return { id, dryRun: flags.includes('--dry-run') };
}

export function renderGameFiles(id: string): readonly GeneratedFile[] {
  const pascal = toPascalCase(id);
  const camel = `${pascal.slice(0, 1).toLowerCase()}${pascal.slice(1)}`;
  const constant = id.replaceAll('-', '_').toUpperCase();
  return [
    {
      relativePath: 'package.json',
      contents: `${JSON.stringify(
        {
          name: `@christmas-games/${id}`,
          version: '0.1.0',
          private: true,
          type: 'module',
          exports: { '.': './src/index.ts', './definition': './src/definition.ts' },
          peerDependencies: { phaser: '4.2.1' },
          dependencies: { '@christmas-games/platform': 'workspace:*' },
        },
        null,
        2,
      )}\n`,
    },
    {
      relativePath: 'src/index.ts',
      contents: `export * from './definition.js';\nexport * from './domain/${pascal}State.js';\nexport * from './tuning.js';\nexport * from './runtime/phaser/create${pascal}Game.js';\n`,
    },
    {
      relativePath: 'src/definition.ts',
      contents: `import type { GameDefinition } from '@christmas-games/platform';\n\n/** Static metadata the React shell can import without loading the Phaser runtime. */\nexport const ${camel}Definition: GameDefinition = {\n  id: '${id}',\n  displayName: '${pascal}',\n  shortDescription: 'Describe the personalized photo game.',\n  shortRule: 'Describe the first action in one short sentence.',\n  cover: { alt: 'Describe the small game-cover preview.' },\n  minPhotos: 1,\n  recommendedPhotos: 1,\n  photoSelection: 'single',\n  supportsMixedOrientation: true,\n};\n`,
    },
    {
      relativePath: 'src/tuning.ts',
      contents: `/** Game-feel values belong here; deterministic rules remain in domain/. */\nexport const ${camel}Tuning = {\n  primaryTargetMinCssPx: 52,\n  secondaryTargetMinCssPx: 44,\n  dragDistanceThresholdPx: 16,\n  dragTimeThresholdMs: 200,\n  idleAssistDelayMs: 7000,\n  pressScale: 0.98,\n  pressDurationMs: 100,\n  feedbackDurationMs: 160,\n  hintPulseDurationMs: 600,\n} as const;\n`,
    },
    {
      relativePath: `src/domain/${pascal}State.ts`,
      contents: `export interface ${pascal}State {\n  started: boolean;\n  completed: boolean;\n}\n\nexport const ${constant}_INITIAL_STATE: ${pascal}State = { started: false, completed: false };\n\nexport function start${pascal}(state: ${pascal}State): ${pascal}State {\n  return state.started ? state : { ...state, started: true };\n}\n\nexport function complete${pascal}(state: ${pascal}State): ${pascal}State {\n  if (!state.started || state.completed) return state;\n  return { ...state, completed: true };\n}\n`,
    },
    {
      relativePath: `src/runtime/phaser/create${pascal}Game.ts`,
      contents: `import { SceneScope } from '@christmas-games/platform';\nimport type {\n  GameBridge,\n  GameContext,\n  GameController,\n  GameModule,\n} from '@christmas-games/platform';\nimport type * as PhaserModule from 'phaser';\nimport { ${camel}Definition } from '../../definition.js';\n\nexport function create${pascal}Game(\n  Phaser: typeof PhaserModule,\n  parent: HTMLElement,\n  context: GameContext,\n  _bridge: GameBridge,\n): GameController {\n  class ${pascal}Scene extends Phaser.Scene {\n    private readonly scope = new SceneScope();\n\n    constructor() {\n      super('${pascal}Scene');\n    }\n\n    create(): void {\n      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());\n      context.run.open();\n      context.run.ready();\n      context.run.start();\n      this.add.text(24, 24, '${pascal} — implemente o SPEC antes do jogo', {\n        color: '#fffaf0',\n        fontFamily: 'system-ui, sans-serif',\n        fontSize: '20px',\n      });\n    }\n  }\n\n  const game = new Phaser.Game({\n    type: Phaser.AUTO,\n    parent,\n    pixelArt: false,\n    antialias: true,\n    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },\n    scene: ${pascal}Scene,\n  });\n  let destroyPromise: Promise<void> | undefined;\n\n  return {\n    destroy(): Promise<void> {\n      if (destroyPromise) return destroyPromise;\n      destroyPromise = new Promise<void>((resolve, reject) => {\n        const complete = (): void => {\n          context.run.exit();\n          resolve();\n        };\n        game.events.once(Phaser.Core.Events.DESTROY, complete);\n        try {\n          game.destroy(true, false);\n        } catch (error) {\n          game.events.off(Phaser.Core.Events.DESTROY, complete);\n          reject(error);\n        }\n      });\n      return destroyPromise;\n    },\n  };\n}\n\nexport const ${camel}GameModule: GameModule<typeof PhaserModule, HTMLElement> = {\n  definition: ${camel}Definition,\n  create: create${pascal}Game,\n};\n`,
    },
    {
      relativePath: 'SPEC.md',
      contents: `# ${pascal} specification\n\n## Experience\n\n- **Photo rule:** define exactly which variant and which photos are needed.\n- **Win condition:** define the deterministic domain transition.\n- **Orientation:** support portrait and landscape through \`PhotoSurface\`; do not crop a person by default.\n\n## Acceptance matrix\n\n| ID | Requirement | Proof |\n| --- | --- | --- |\n| ${constant}-01 | Domain state is deterministic. | Unit test |\n| ${constant}-02 | Enter → play → exit owns one canvas and no leaked listeners. | Playwright |\n| ${constant}-03 | Portrait and landscape work on the mobile viewport matrix. | Screenshots |\n| ${constant}-04 | Every owned timer, tween, listener and texture is registered in \`SceneScope\`. | Runtime review + test |\n| ${constant}-05 | Child usability is explicit: main action is learnable in ≤5 seconds, has a ≥52px primary target and drag has a tap alternative when applicable. | SPEC review + Playwright |\n\n## Child usability\n\n- **Learnability:** explain the first action visually; do not rely on a paragraph tutorial.\n- **Touch:** record the smallest primary and secondary target in \`tuning.ts\`; main controls are at least 52 CSS px.\n- **Drag:** state the equivalent tap/tap action unless dragging is essential; record evidence-backed thresholds in \`tuning.ts\`.\n- **Wrong action:** describe feedback that teaches without punishment.\n- **Idle assist:** state when a non-solving hint appears; record its delay in \`tuning.ts\`.\n- **Pressure:** state whether time is visible or the run is relaxed.\n\n## Before coding\n\n1. Read the matching Phaser 4.2.1 skills in \`vendor/phaser-skills\`.\n2. Add domain tests before Phaser code.\n3. Register this module only in \`apps/play\`.\n`,
    },
    {
      relativePath: 'EXPERIENCE.md',
      contents: `# ${pascal} — experiência natalina\n\nUse \`docs/experience/christmas/ART_BIBLE.md\` antes de escolher uma arte ou um efeito. Este arquivo descreve a experiência deste jogo; ele não coloca regras em \`domain/\`.\n\n## Primeiros cinco segundos\n\n- **Foto protagonista:** explique como a foto escolhida aparece sem distorção.\n- **Primeira ação:** descreva uma ação que uma criança entende em até cinco segundos.\n- **Convite:** registre o texto curto, em português simples, e a resposta imediata ao toque.\n\n## Roteiro de resposta\n\n| Momento | Visual | Som / haptic | LOW e movimento reduzido |\n| --- | --- | --- | --- |\n| Tocar | Definir confirmação. | Definir ou justificar silêncio. | Manter confirmação sem animação repetida. |\n| Mover | Definir resposta durante a ação. | Definir resposta curta. | Manter alternativa de toque se houver arraste. |\n| Acertar | Definir reforço positivo. | Definir pista positiva. | Manter leitura e resultado. |\n| Erro | Ensinar sem punir. | Definir pista discreta. | Nunca depender de movimento. |\n| Dica | Mostrar próximo passo sem resolver. | Definir pista opcional. | Manter contraste estático. |\n| Vitória | Dar prioridade à foto completa. | Definir celebração curta. | Sem loop decorativo. |\n\n## Assets necessários\n\nListe somente papéis, não arquivos improvisados: cenário, moldura, controles, efeitos, sons e música. Antes de integrar, cada arquivo browser-deliverable precisa de proveniência e de uma entrada em \`assets/manifest.json\` conforme \`docs/assets/ASSET_MANIFEST_CONTRACT.md\`.\n`,
    },
  ];
}

export async function generateGame(
  command: NewGameCommand,
  root = workspaceRoot,
): Promise<readonly string[]> {
  const gamesRoot = resolve(root, 'packages', 'games');
  const target = resolve(gamesRoot, command.id);
  if (dirname(target) !== gamesRoot) {
    throw new Error('Game id resolves outside the games directory.');
  }
  const files = renderGameFiles(command.id);
  if (command.dryRun) return files.map((file) => join(target, file.relativePath));

  try {
    await access(target);
    throw new Error(`Refusing to overwrite an existing game: ${relative(root, target)}.`);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }

  for (const file of files) {
    const destination = join(target, file.relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.contents, { encoding: 'utf8', flag: 'wx' });
  }
  return files.map((file) => join(target, file.relativePath));
}

function toPascalCase(id: string): string {
  return id
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join('');
}

async function main(): Promise<void> {
  const command = parseNewGameCommand(process.argv.slice(2));
  const files = await generateGame(command);
  const label = command.dryRun ? 'Would create' : 'Created';
  console.log(`${label} game ${command.id}:`);
  for (const file of files) console.log(`- ${relative(workspaceRoot, file)}`);
}

if (process.argv[1]?.endsWith('index.ts')) {
  void main();
}
