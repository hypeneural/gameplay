const gameIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const experienceRequirementsVersion = 1 as const;

const experienceNextActions = [
  'escolher-outra-foto',
  'repetir-brincadeira',
  'voltar-para-sessao',
] as const;

const experienceAssetRoles = [
  'foto-protagonista',
  'cenario',
  'moldura-da-foto',
  'acao-principal',
  'feedback-de-selecao',
  'feedback-de-dica',
  'feedback-de-acerto',
  'feedback-de-vitoria',
  'som-de-toque',
  'som-de-acerto',
  'som-de-vitoria',
] as const;

const requiredExperienceAssetRoles = [
  'foto-protagonista',
  'acao-principal',
  'feedback-de-dica',
  'feedback-de-acerto',
  'feedback-de-vitoria',
  'som-de-toque',
  'som-de-acerto',
  'som-de-vitoria',
] as const;

type ExperienceNextAction = (typeof experienceNextActions)[number];
type ExperienceAssetRole = (typeof experienceAssetRoles)[number];

export interface ExperienceRequirements {
  version: typeof experienceRequirementsVersion;
  gameId: string;
  fantasy: string;
  playerVerbs: readonly string[];
  interactionStates: readonly string[];
  targetSessionSeconds: number;
  victory: {
    nextAction: ExperienceNextAction;
    photoPriority: 'alta';
  };
  assetRoles: readonly ExperienceAssetRole[];
  quality: {
    low: 'sem-efeitos-decorativos';
    reducedMotion: 'sem-movimento-continuo';
  };
}

export function createExperienceRequirementsTemplate(gameId: string): ExperienceRequirements {
  assertGameId(gameId);
  return {
    version: experienceRequirementsVersion,
    gameId,
    fantasy: 'brincadeira-natalina-com-foto',
    playerVerbs: ['tocar', 'escolher'],
    interactionStates: [
      'parado',
      'pressionado',
      'selecionado',
      'em-movimento',
      'acertou',
      'tente-de-novo',
      'dica',
      'concluido',
    ],
    targetSessionSeconds: 120,
    victory: {
      nextAction: 'escolher-outra-foto',
      photoPriority: 'alta',
    },
    assetRoles: [...experienceAssetRoles],
    quality: {
      low: 'sem-efeitos-decorativos',
      reducedMotion: 'sem-movimento-continuo',
    },
  };
}

export function renderExperienceRequirementsFile(gameId: string): string {
  return JSON.stringify(createExperienceRequirementsTemplate(gameId), null, 2) + '\n';
}

export function parseExperienceRequirements(
  input: unknown,
  expectedGameId?: string,
): ExperienceRequirements {
  const value = object(input, 'requisitos de experiência');
  const version = integer(value.version, 'requisitos de experiência.version');
  if (version !== experienceRequirementsVersion) {
    throw new Error(
      'requisitos de experiência.version deve ser ' + experienceRequirementsVersion + '.',
    );
  }

  const gameId = text(value.gameId, 'requisitos de experiência.gameId');
  assertGameId(gameId);
  if (expectedGameId && gameId !== expectedGameId) {
    throw new Error('requisitos de experiência.gameId não corresponde ao jogo.');
  }

  const playerVerbs = textList(value.playerVerbs, 'requisitos de experiência.playerVerbs');
  const interactionStates = textList(
    value.interactionStates,
    'requisitos de experiência.interactionStates',
  );
  for (const state of ['parado', 'concluido']) {
    if (!interactionStates.includes(state)) {
      throw new Error('requisitos de experiência.interactionStates deve incluir ' + state + '.');
    }
  }

  const victory = object(value.victory, 'requisitos de experiência.victory');
  const nextAction = oneOf(
    victory.nextAction,
    experienceNextActions,
    'requisitos de experiência.victory.nextAction',
  );
  const photoPriority = oneOf(
    victory.photoPriority,
    ['alta'] as const,
    'requisitos de experiência.victory.photoPriority',
  );

  const assetRoles = textList(value.assetRoles, 'requisitos de experiência.assetRoles').map(
    (role) =>
      oneOf(
        role,
        experienceAssetRoles,
        'requisitos de experiência.assetRoles',
      ) as ExperienceAssetRole,
  );
  for (const role of requiredExperienceAssetRoles) {
    if (!assetRoles.includes(role)) {
      throw new Error('requisitos de experiência.assetRoles deve incluir ' + role + '.');
    }
  }

  const quality = object(value.quality, 'requisitos de experiência.quality');
  return {
    version: experienceRequirementsVersion,
    gameId,
    fantasy: text(value.fantasy, 'requisitos de experiência.fantasy'),
    playerVerbs,
    interactionStates,
    targetSessionSeconds: positiveInteger(
      value.targetSessionSeconds,
      'requisitos de experiência.targetSessionSeconds',
    ),
    victory: { nextAction, photoPriority },
    assetRoles,
    quality: {
      low: oneOf(
        quality.low,
        ['sem-efeitos-decorativos'] as const,
        'requisitos de experiência.quality.low',
      ),
      reducedMotion: oneOf(
        quality.reducedMotion,
        ['sem-movimento-continuo'] as const,
        'requisitos de experiência.quality.reducedMotion',
      ),
    },
  };
}

function assertGameId(gameId: string): void {
  if (!gameIdPattern.test(gameId)) {
    throw new Error('gameId deve usar kebab-case em minúsculas.');
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' deve ser um objeto.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(label + ' deve ser um texto preenchido.');
  }
  return value;
}

function textList(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(label + ' deve ser uma lista preenchida.');
  }
  const list = value.map((item, index) => text(item, label + '[' + index + ']'));
  if (new Set(list).size !== list.length) {
    throw new Error(label + ' não pode repetir valores.');
  }
  return list;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(label + ' deve ser um número inteiro.');
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  const result = integer(value, label);
  if (result < 1) throw new Error(label + ' deve ser positivo.');
  return result;
}

function oneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new Error(label + ' deve ser um de: ' + values.join(', ') + '.');
  }
  return value as T[number];
}
