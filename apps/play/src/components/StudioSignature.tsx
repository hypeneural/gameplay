import { playInterfaceTap } from '../audio/playInterfaceTap.js';

interface StudioSignatureProps {
  compact?: boolean;
}

/** A quiet shell-level signature keeps customer support outside the game board. */
export function StudioSignature({ compact = false }: StudioSignatureProps): React.JSX.Element {
  if (compact)
    return (
      <p className="studio-signature compact">
        Com carinho, <strong>Estúdio Evydência</strong>
      </p>
    );
  return (
    <section
      className={`studio-signature ${compact ? 'compact' : ''}`}
      aria-label="Estúdio Evydência"
    >
      <p className="eyebrow">LEMBRANÇAS QUE VIRAM BRINCADEIRA</p>
      <strong>
        Faça suas fotos de Natal
        <br />
        no Estúdio Evydência
      </strong>
      <nav
        aria-label="Canais do Estúdio Evydência"
        className="studio-links"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a'))
            playInterfaceTap('open');
        }}
      >
        <a href="https://wa.me/5548998483594" rel="noreferrer" target="_blank">
          WhatsApp
        </a>
        <a href="https://fotosdenatal.com/" rel="noreferrer" target="_blank">
          Conheça nosso Natal
        </a>
        <a href="https://www.instagram.com/estudioevydenciaa/" rel="noreferrer" target="_blank">
          @estudioevydenciaa
        </a>
      </nav>
    </section>
  );
}
