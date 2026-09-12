export function SnowGlobeButton({
  burst,
  onSnow,
}: {
  burst: number;
  onSnow(): void;
}): React.JSX.Element {
  return (
    <button
      className="snow-globe-button crystal-control"
      type="button"
      onClick={onSnow}
      aria-label="Agitar o globo e fazer nevar"
      data-testid="make-snow"
      data-burst={burst}
    >
      <span
        className={`snow-globe ${burst > 0 ? 'snow-globe--shaken' : ''}`}
        key={burst}
        aria-hidden="true"
      >
        <span className="snow-globe-glass">
          <i />
          <b>✦</b>
          <em>· · ·</em>
        </span>
        <span className="snow-globe-foot" />
      </span>
      <span>Fazer nevar</span>
      <span className="magic-announcement" role="status">
        {burst > 0 ? 'Uma magia de Natal para você!' : ''}
      </span>
    </button>
  );
}
