import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

const flakes = Array.from({ length: 14 }, (_, index) => ({
  x: (index * 37 + 13) % 97,
  size: index % 4 === 0 ? 4 : 2,
  duration: 10 + (index % 6) * 2,
  delay: -((index * 5) % 17),
}));

const railLights = [
  { y: '9%', x: '52%', duration: '3.7s', delay: '-0.6s' },
  { y: '23%', x: '38%', duration: '4.9s', delay: '-2.1s' },
  { y: '39%', x: '58%', duration: '3.3s', delay: '-1.4s' },
  { y: '56%', x: '42%', duration: '5.3s', delay: '-3.2s' },
  { y: '73%', x: '55%', duration: '4.1s', delay: '-0.9s' },
  { y: '88%', x: '44%', duration: '4.6s', delay: '-2.7s' },
] as const;

/** Pure CSS ambience, kept outside photo pixels and inactive in lightbox/LOW mode. */
export function GalleryAtmosphere({
  active,
  magicPulse = false,
}: {
  active: boolean;
  magicPulse?: boolean;
}): React.JSX.Element {
  const [visible, setVisible] = useState(() => !document.hidden);
  const ambientActive = active && visible;

  useEffect(() => {
    const updateVisibility = (): void => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return (
    <>
      <div
        className="gallery-edge-rail gallery-edge-rail--left"
        data-ambient-active={ambientActive}
        data-magic-pulse={magicPulse && ambientActive}
        aria-hidden="true"
      >
        {railLights.map((light, index) => (
          <i
            key={index}
            className="gallery-edge-light"
            style={
              {
                '--light-x': light.x,
                '--light-y': light.y,
                '--light-duration': light.duration,
                '--light-delay': light.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div
        className="gallery-edge-rail gallery-edge-rail--right"
        data-ambient-active={ambientActive}
        data-magic-pulse={magicPulse && ambientActive}
        aria-hidden="true"
      >
        {railLights.map((light, index) => (
          <i
            key={index}
            className="gallery-edge-light"
            style={
              {
                '--light-x': light.x,
                '--light-y': light.y,
                '--light-duration': light.duration,
                '--light-delay': `${-1.5 - index * 0.7}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {ambientActive ? (
        <div className="gallery-atmosphere-snow" aria-hidden="true">
          {flakes.map((flake, index) => (
            <i
              key={index}
              style={
                {
                  '--snow-x': flake.x + '%',
                  '--snow-size': flake.size + 'px',
                  '--snow-duration': flake.duration + 's',
                  '--snow-delay': flake.delay + 's',
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
