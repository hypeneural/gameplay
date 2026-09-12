import { useRef, useState } from 'react';

/** Corner snow is a small toy; the middle remains free for the Christmas bell. */
export function MagicPhotoWinter({
  calm,
  onSnow,
}: {
  calm: boolean;
  onSnow(): void;
}): React.JSX.Element {
  const [fall, setFall] = useState({ count: 0, side: 0 });
  const last = useRef(-1000);
  return (
    <div className="magic-cover-winter" data-still={calm}>
      <div className="magic-cover-icicles" aria-hidden="true" />
      {[0, 1].map((side) => (
        <button
          key={side}
          type="button"
          className="magic-snow-touch"
          data-side={side}
          aria-label={side ? 'Soltar neve da borda direita' : 'Soltar neve da borda esquerda'}
          onClick={() => {
            const now = performance.now();
            if (now - last.current < 500) return;
            last.current = now;
            onSnow();
            setFall((previous) => ({ count: previous.count + 1, side }));
          }}
        />
      ))}
      {fall.count > 0 && !calm ? (
        <span
          key={fall.count}
          className="magic-snow-powder"
          data-side={fall.side}
          aria-hidden="true"
        >
          {Array.from({ length: 16 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${i * 17}ms`,
                width: 3 + (i % 5),
                height: 3 + (i % 5),
              }}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
