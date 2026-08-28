interface StudioSignatureProps {
  compact?: boolean;
}

/** A quiet shell-level signature keeps customer support outside the game board. */
export function StudioSignature({ compact = false }: StudioSignatureProps): React.JSX.Element {
  return (
    <section
      className={`studio-signature ${compact ? 'compact' : ''}`}
      aria-label="Estúdio Evydência"
    >
      <p className="eyebrow">LEMBRANÇAS QUE VIRAM BRINCADEIRA</p>
      <strong>Estúdio de Fotos de Natal Evydência</strong>
      <nav aria-label="Canais do Estúdio Evydência" className="studio-links">
        <a href="https://wa.me/5548998483594" rel="noreferrer" target="_blank">
          WhatsApp
        </a>
        <a href="https://fotosdenatal.com/" rel="noreferrer" target="_blank">
          Site
        </a>
        <a href="https://www.instagram.com/estudioevydenciaa/" rel="noreferrer" target="_blank">
          Instagram
        </a>
      </nav>
    </section>
  );
}
