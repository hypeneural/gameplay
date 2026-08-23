module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'game-domain-no-runtime',
      severity: 'error',
      from: { path: '^packages/games/[^/]+/src/domain' },
      to: {
        path: '^(apps/|packages/games/[^/]+/src/runtime|packages/theme/src/(phaser|react)|node_modules/(phaser|react))',
      },
    },
    {
      name: 'game-to-game-isolation',
      severity: 'error',
      from: { path: '^packages/games/(puzzle-swap|memory|tic-tac-toe)/src' },
      to: { path: '^packages/games/(puzzle-swap|memory|tic-tac-toe)/src' },
    },
    {
      name: 'platform-does-not-import-games',
      severity: 'error',
      from: { path: '^packages/platform/src' },
      to: { path: '^packages/games/' },
    },
    {
      name: 'theme-does-not-import-games',
      severity: 'error',
      from: { path: '^packages/theme/src' },
      to: { path: '^packages/games/' },
    },
    {
      name: 'media-not-in-browser-graph',
      severity: 'error',
      from: { path: '^apps/' },
      to: { path: '^tools/media-pipeline/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)dist/' },
    tsConfig: { fileName: 'tsconfig.json' },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+', theme: { graph: { splines: 'ortho' } } },
    },
  },
};
