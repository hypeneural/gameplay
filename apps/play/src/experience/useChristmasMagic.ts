import { useRef, useState } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';

export function useChristmasMagic(): { snowBurst: number; makeSnow(): void } {
  const [snowBurst, setSnowBurst] = useState(0);
  const last = useRef(-Infinity);
  return {
    snowBurst,
    makeSnow: () => {
      const now = performance.now();
      if (now - last.current < 450) return;
      last.current = now;
      playInterfaceTap('snow');
      setSnowBurst((value) => value + 1);
    },
  };
}
