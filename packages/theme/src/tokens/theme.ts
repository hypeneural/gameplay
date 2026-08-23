export const christmasTheme = {
  color: {
    pine: '#103e35',
    pineDark: '#082821',
    cranberry: '#8f1d35',
    cranberryLight: '#b93350',
    gold: '#f8dfa0',
    goldDark: '#b98a2d',
    snow: '#fffaf0',
    ink: '#1d211f',
    success: '#55b58a',
  },
  radius: { card: 20, button: 14 },
  shadow: '0 12px 32px rgba(8, 40, 33, 0.26)',
} as const;

export const themeCssVariables = `
  :root {
    --cg-pine: ${christmasTheme.color.pine};
    --cg-pine-dark: ${christmasTheme.color.pineDark};
    --cg-cranberry: ${christmasTheme.color.cranberry};
    --cg-cranberry-light: ${christmasTheme.color.cranberryLight};
    --cg-gold: ${christmasTheme.color.gold};
    --cg-gold-dark: ${christmasTheme.color.goldDark};
    --cg-snow: ${christmasTheme.color.snow};
    --cg-ink: ${christmasTheme.color.ink};
    --cg-success: ${christmasTheme.color.success};
    --cg-radius-card: ${christmasTheme.radius.card}px;
    --cg-radius-button: ${christmasTheme.radius.button}px;
    --cg-shadow: ${christmasTheme.shadow};
  }
`;
