import { useId } from 'react';

type ShellIconName =
  | 'back'
  | 'next'
  | 'volume'
  | 'muted'
  | 'magic'
  | 'calm'
  | 'photos'
  | 'close'
  | 'share'
  | 'play'
  | 'heart'
  | 'zoom-in'
  | 'zoom-out'
  | 'gamepad';

/** Small material icons share a stable silhouette and never depend on emoji fonts. */
export function ShellIcon({ name }: { name: ShellIconName }): React.JSX.Element {
  const gold = useId();
  return (
    <svg
      className={`shell-glyph shell-glyph--${name}`}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2=".65" y2="1">
          <stop stopColor="#fffef0" />
          <stop offset=".45" stopColor="#ffe8ab" />
          <stop offset="1" stopColor="#dba956" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {name === 'back' ? <path d="M18 7 9 16l9 9M10 16h15" /> : null}
        {name === 'next' ? <path d="m14 7 9 9-9 9M22 16H7" /> : null}
        {name === 'volume' || name === 'muted' ? (
          <>
            <path d="M5 12v8h5l7 6V6l-7 6Z" fill={`url(#${gold})`} strokeWidth="1" />
            {name === 'volume' ? (
              <g className="glyph-sound-waves">
                <path d="M21 11c3 2 3 8 0 10M25 7c5 5 5 13 0 18" />
              </g>
            ) : (
              <path d="m22 12 7 8m0-8-7 8" />
            )}
          </>
        ) : null}
        {name === 'magic' ? (
          <>
            <path
              className="glyph-main-star"
              d="m16 5 3.4 7.6L27 16l-7.6 3.4L16 27l-3.4-7.6L5 16l7.6-3.4Z"
              fill={`url(#${gold})`}
              strokeWidth=".6"
            />
            <path
              className="glyph-tiny-star"
              d="M26 3v6M23 6h6M6 24v5M3.5 26.5h5"
              strokeWidth="1.4"
            />
          </>
        ) : null}
        {name === 'calm' ? (
          <>
            <path d="M11 8v16M21 8v16" strokeWidth="4" />
            <path d="M6 5h20" opacity=".4" />
          </>
        ) : null}
        {name === 'photos' ? (
          <>
            <path d="m7 6 18-2 2 20-18 2Z" opacity=".6" />
            <rect x="4" y="9" width="21" height="20" rx="3" fill="#245953" />
            <path d="m6 25 6-7 5 5 3-3 3 5" />
            <circle cx="19" cy="15" r="1.5" fill={`url(#${gold})`} />
          </>
        ) : null}
        {name === 'close' ? <path d="m9 9 14 14M23 9 9 23" /> : null}
        {name === 'zoom-in' || name === 'zoom-out' ? (
          <>
            <circle cx="13" cy="13" r="8" />
            <path d="m19 19 8 8M9 13h8" />
            {name === 'zoom-in' ? <path d="M13 9v8" /> : null}
          </>
        ) : null}
        {name === 'gamepad' ? (
          <>
            <path d="M9 10h14c3 0 4 2 5 7l1 6c.3 3-3 4-5 2l-5-4h-6l-5 4c-2 2-5 1-5-2l1-6c1-5 2-7 5-7Z" />
            <path d="M9 16h8m-4-4v8" strokeWidth="1.9" />
            <circle cx="22" cy="14" r="1.5" fill={`url(#${gold})`} stroke="none" />
            <circle cx="25" cy="18" r="1.5" fill={`url(#${gold})`} stroke="none" />
          </>
        ) : null}
        {name === 'share' ? (
          <>
            <path d="M16 21V4m-6 6 6-6 6 6M9 15H5v13h22V15h-4" />
          </>
        ) : null}
        {name === 'play' ? <path d="m11 7 14 9-14 9Z" fill={`url(#${gold})`} /> : null}
        {name === 'heart' ? <path d="M16 27 5 16C-1 7 10 2 16 10 22 2 33 7 27 16Z" /> : null}
      </g>
    </svg>
  );
}
