import type { CSSProperties } from 'react';

const flakes = Array.from({ length: 14 }, (_, index) => ({
  x: (index * 37 + 13) % 97,
  size: index % 4 === 0 ? 4 : 2,
  duration: 10 + (index % 6) * 2,
  delay: -((index * 5) % 17),
}));

/** Pure CSS ambience, kept outside photo pixels and inactive in lightbox/LOW mode. */
export function GalleryAtmosphere({ active }: { active: boolean }): React.JSX.Element {
  return (
    <>
      <div className="gallery-edge-rail gallery-edge-rail--left" aria-hidden="true" />
      <div className="gallery-edge-rail gallery-edge-rail--right" aria-hidden="true" />
      {active ? (
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
