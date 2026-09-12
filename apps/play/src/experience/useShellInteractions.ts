import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Gesture animations have one owner and are cancelled on pause, hide or exit. */
export function useShellInteractions(): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Map<Element, Animation>();
    const stop = (): void => {
      for (const animation of active.values()) animation.cancel();
      active.clear();
    };
    const limited = (): boolean =>
      document.hidden || motion.matches || root.dataset.calm === 'true';
    const animate = (element: Element, frames: Keyframe[], duration: number): void => {
      active.get(element)?.cancel();
      const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.22,.8,.32,1)' });
      active.set(element, animation);
      const release = (): void => {
        if (active.get(element) === animation) active.delete(element);
      };
      animation.onfinish = release;
      animation.oncancel = release;
    };
    const respond = (event: MouseEvent): void => {
      if (limited() || !(event.target instanceof Element)) return;
      const button = event.target.closest('button, a');
      if (!button || !root.contains(button) || button.matches(':disabled')) return;
      const icon = button.querySelector('.shell-glyph');
      if (icon)
        animate(
          icon,
          [
            { transform: 'translateY(1px) scale(.82) rotate(-8deg)' },
            { transform: 'translateY(-2px) scale(1.13) rotate(5deg)', offset: 0.5 },
            { transform: 'translateY(0) scale(1) rotate(0)' },
          ],
          420,
        );
      if (button.classList.contains('crystal-control'))
        animate(button, [{ filter: 'brightness(1.3)' }, { filter: 'brightness(1)' }], 360);
    };
    const pause = (): void => {
      if (limited()) stop();
    };
    const observer = new MutationObserver(pause);
    observer.observe(root, { attributes: true, attributeFilter: ['data-calm'] });
    root.addEventListener('click', respond);
    document.addEventListener('visibilitychange', pause);
    motion.addEventListener('change', pause);
    return () => {
      stop();
      observer.disconnect();
      root.removeEventListener('click', respond);
      document.removeEventListener('visibilitychange', pause);
      motion.removeEventListener('change', pause);
    };
  }, []);
  return ref;
}
