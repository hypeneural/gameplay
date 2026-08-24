import { christmasTheme } from '@christmas-games/theme';

export function ThemeLab(): React.JSX.Element {
  return (
    <main className="shell theme-lab">
      <p className="eyebrow">DESENVOLVIMENTO</p>
      <h1>Mostruário do tema</h1>
      <div className="theme-samples">
        <button className="button" type="button">
          Começar
        </button>
        <button className="button secondary" type="button">
          Voltar
        </button>
        <div className="frame portrait">RETRATO</div>
        <div className="frame landscape">PAISAGEM</div>
        <div className="hud">00:42 · 12 movimentos</div>
        <div className="win">Vitória! ✦</div>
      </div>
      <p>
        Perfil normal: {christmasTheme.color.pine} · neve e brilho são ajustados por perfil de
        qualidade.
      </p>
    </main>
  );
}
