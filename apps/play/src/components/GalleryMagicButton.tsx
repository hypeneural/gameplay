import { useState } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';

/** Tiny, user-triggered celebration behind the hero bow. Never covers a photo. */
export function GalleryMagicButton({ active }: { active: boolean }): React.JSX.Element {
  const [burst, setBurst] = useState(0);

  return (
    <button
      className="gallery-magic-trigger"
      type="button"
      aria-label="Acender as luzinhas de Natal"
      disabled={!active}
      onClick={() => {
        playInterfaceTap('bells');
        setBurst((value) => value + 1);
      }}
    >
      <span className="gallery-magic-hit" aria-hidden="true" />
      {burst > 0 && active ? (
        <span key={burst} className="gallery-magic-burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <i
              key={index}
              style={{ transform: `rotate(${index * 45}deg)` }}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}
