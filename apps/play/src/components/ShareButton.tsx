import { useState } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import {
  createBrowserShareAdapter,
  createCurrentSharePayload,
  shareLink,
  type ShareResult,
} from '../sharing/shareLink.js';

const resultMessage: Record<ShareResult, string> = {
  shared: 'Pronto para enviar!',
  cancelled: 'Tudo bem, você pode compartilhar depois.',
  copied: 'Link copiado!',
  'manual-copy': 'Copie o link abaixo para compartilhar.',
};

interface ShareButtonProps {
  className?: string;
}

/** React owns browser sharing so Phaser never receives a URL or navigator API. */
export function ShareButton({ className }: ShareButtonProps): React.JSX.Element {
  const [result, setResult] = useState<ShareResult>();
  const payload = createCurrentSharePayload(window.location);

  const handleShare = async (): Promise<void> => {
    playInterfaceTap();
    const nextResult = await shareLink(payload, createBrowserShareAdapter(navigator));
    setResult(nextResult);
  };

  return (
    <div className={`share-control ${className ?? ''}`.trim()}>
      <button
        className="button secondary share-button"
        data-testid="share-link"
        type="button"
        onClick={() => void handleShare()}
      >
        <span aria-hidden="true">↗</span>
        Compartilhar
      </button>
      {result ? (
        <p aria-live="polite" className="share-result" data-testid="share-result">
          {resultMessage[result]}
          {result === 'manual-copy' ? (
            <span className="share-manual-url">{payload.url}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
