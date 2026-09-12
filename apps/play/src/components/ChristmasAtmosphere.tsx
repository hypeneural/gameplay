import { useRef, useState } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { SnowfallSimulation } from '../experience/SnowfallSimulation.js';
import { useSnowfall } from '../experience/useSnowfall.js';

const profiles = new SnowfallSimulation(1, 1, 20260907, 132).particles;
const lightColors = ['ruby', 'amber', 'emerald', 'sapphire'] as const;

/** Physical snow and practical lights stay behind the opaque photo surfaces. */
export function ChristmasAtmosphere({
  calm,
  snowBurst = 0,
}: {
  calm: boolean;
  snowBurst?: number;
}): React.JSX.Element {
  const snowRef = useRef<HTMLDivElement>(null);
  const lastRing = useRef(-Infinity);
  const [rings, setRings] = useState(0);
  useSnowfall(snowRef, calm, snowBurst, rings);
  return (
    <div className="christmas-atmosphere" data-still={calm}>
      <div className="christmas-night" aria-hidden="true" />
      <div
        className="christmas-snow"
        ref={snowRef}
        aria-hidden="true"
        data-snow-state={calm ? 'reduced' : 'ready'}
      >
        {!calm
          ? profiles.map((flake, index) => (
              <i
                key={index}
                className={index % 12 === 0 ? 'snow-crystal' : index % 12 === 6 ? 'snow-bokeh' : ''}
                style={{
                  width: flake.size,
                  height: flake.size,
                  opacity: (0.24 + flake.depth * 0.5) * flake.visibility,
                }}
              />
            ))
          : null}
      </div>
      <div className="christmas-cord" aria-hidden="true">
        <svg className="christmas-wire" viewBox="0 0 560 50" preserveAspectRatio="none">
          <path d="M0 5 Q280 45 560 5" fill="none" stroke="#071911" strokeWidth="3" />
          <path d="M0 4 Q280 44 560 4" fill="none" stroke="#50654a" strokeWidth="1" />
        </svg>
        {Array.from({ length: 14 }, (_, index) => {
          const x = (index + 0.5) / 14;
          return index === 6 || index === 7 ? (
            <span key={index} className="christmas-light-gap" />
          ) : (
            <span
              className="christmas-bulb"
              key={index}
              data-color={lightColors[index % lightColors.length]}
              data-position={x}
              style={{ top: 10 + 80 * x * (1 - x), animationDelay: `${-(index % 5) * 1.3}s` }}
            >
              <b className="christmas-filament" />
              <span className="christmas-glass-reflection" />
              <i />
              {rings > 0 ? (
                <em
                  key={rings}
                  className="christmas-light-wave"
                  style={{ animationDelay: `${Math.abs(index - 6.5) * 65}ms` }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      <button
        className="christmas-bell-button"
        type="button"
        aria-label="Tocar o sino de Natal"
        data-testid="ring-christmas-bell"
        data-rings={rings}
        onClick={() => {
          const now = performance.now();
          if (now - lastRing.current < 350) return;
          lastRing.current = now;
          playInterfaceTap('bells');
          setRings((value) => value + 1);
        }}
      >
        <svg
          className="christmas-bell"
          width="30"
          height="38"
          viewBox="0 0 40 48"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="shell-bell-gold">
              <stop stopColor="#794213" />
              <stop offset=".32" stopColor="#f8d994" />
              <stop offset=".48" stopColor="#fff5c8" />
              <stop offset=".65" stopColor="#d9a344" />
              <stop offset="1" stopColor="#885017" />
            </linearGradient>
          </defs>
          <path d="M20 3V13" stroke="#405337" strokeWidth="3" />
          <path
            d="M20 10C8 7 7 15 16 16M20 10C32 7 33 15 24 16"
            fill="#982e42"
            stroke="#d8827d"
            strokeWidth="1"
          />
          <path
            d="M20 13C8 13 11 28 5 32Q20 41 35 32C29 28 32 13 20 13Z"
            fill="url(#shell-bell-gold)"
            stroke="#d7a353"
          />
          <ellipse cx="20" cy="33" rx="14" ry="4" fill="#704016" stroke="#edcd85" />
          <g className="christmas-bell-clapper">
            <path d="M20 25V35" stroke="#8f6028" strokeWidth="2" />
            <circle cx="20" cy="36" r="4" fill="#dfb469" />
            <circle cx="19" cy="35" r="1.2" fill="#ffe9ba" />
          </g>
          <path d="M15 17Q12 23 12 28" fill="none" stroke="#fff3c5" strokeWidth="2" opacity=".7" />
        </svg>
        <span className="magic-announcement" role="status">
          {rings > 0 ? 'As luzinhas de Natal acenderam!' : ''}
        </span>
      </button>
    </div>
  );
}
