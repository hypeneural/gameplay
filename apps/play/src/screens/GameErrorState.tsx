interface GameErrorStateProps {
  onBack(): void;
  onRetry(): void;
}

export function GameErrorState({ onBack, onRetry }: GameErrorStateProps): React.JSX.Element {
  return (
    <div className="game-error" role="alert">
      <p>Não foi possível abrir o jogo.</p>
      <div className="game-error-actions">
        <button className="button" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
        <button className="button secondary" type="button" onClick={onBack}>
          Voltar para a sessão
        </button>
      </div>
    </div>
  );
}
