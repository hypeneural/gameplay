import { useState } from 'react';
import type { CSSProperties } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';

/** Tiny, user-triggered celebration behind the hero bow. Never covers a photo. */
export function GalleryMagicButton({
  active,
  onCelebrate,
}: {
  active: boolean;
  onCelebrate?(activeBurst: boolean): void;
}): React.JSX.Element {
  const [burst, setBurst] = useState(0);

  return (
    <button
      className="gallery-magic-trigger"
      type="button"
      aria-label="Acender as luzinhas de Natal"
      disabled={!active}
      onClick={() => {
        playInterfaceTap('bells');
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setBurst((value) => value + 1);
          onCelebrate?.(true);
        }
      }}
    >
      <span className="gallery-magic-hit" aria-hidden="true" />
      {burst > 0 && active ? (
        <span
          key={burst}
          className="gallery-magic-burst"
          aria-hidden="true"
          onAnimationEnd={() => {
            setBurst(0);
            onCelebrate?.(false);
          }}
        >
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} style={{ '--burst-angle': `${index * 45}deg` } as CSSProperties} />
          ))}
        </span>
      ) : null}
    </button>
  );
}
