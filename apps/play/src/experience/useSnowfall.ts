import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { SnowfallSimulation } from './SnowfallSimulation.js';
import { ChristmasCordSimulation } from './ChristmasCordSimulation.js';

/** Owns every frame and observer; no React update occurs during animation. */
export function useSnowfall(
  ref: RefObject<HTMLDivElement | null>,
  calm: boolean,
  burst: number,
  rings: number,
): void {
  const simulation = useRef<SnowfallSimulation | null>(null);
  const cordSimulation = useRef<ChristmasCordSimulation | null>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || calm) return;
    const nodes = Array.from(host.querySelectorAll<HTMLElement>('i'));
    const field = new SnowfallSimulation(
      host.clientWidth,
      host.clientHeight,
      20260907,
      nodes.length,
    );
    simulation.current = field;
    const cord = new ChristmasCordSimulation();
    cordSimulation.current = cord;
    const atmosphere = host.parentElement;
    const wire = atmosphere?.querySelectorAll<SVGPathElement>('.christmas-wire path');
    const bulbs = atmosphere?.querySelectorAll<HTMLElement>('.christmas-bulb');
    const bell = atmosphere?.querySelector<SVGSVGElement>('.christmas-bell');
    const clapper = atmosphere?.querySelector<SVGGElement>('.christmas-bell-clapper');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    let frame: number | undefined;
    let previous: number | undefined;
    let disposed = false;
    const shell = host.closest('.christmas-shell');
    const paint = (): void => {
      for (const [index, particle] of field.particles.entries()) {
        const node = nodes[index];
        if (node) {
          const opacity = ((0.24 + particle.depth * 0.5) * particle.visibility).toFixed(3);
          if (node.style.opacity !== opacity) node.style.opacity = opacity;
          if (particle.visibility === 0) continue;
          node.style.transform = `translate3d(${particle.x.toFixed(1)}px,${particle.y.toFixed(1)}px,0) rotate(${particle.angle.toFixed(1)}deg)`;
        }
      }
      wire?.forEach((path, index) =>
        path.setAttribute(
          'd',
          `M0 ${5 - index} Q280 ${(5 - index + cord.sag).toFixed(2)} 560 ${5 - index}`,
        ),
      );
      bulbs?.forEach((bulb) => {
        const x = Number(bulb.dataset.position);
        bulb.style.transform = `translateY(${(2 * (cord.sag - 40) * x * (1 - x)).toFixed(2)}px) rotate(${(cord.angle * 0.07).toFixed(2)}deg)`;
      });
      if (bell)
        bell.style.transform = `translateY(${((cord.sag - 40) / 2).toFixed(2)}px) rotate(${cord.angle.toFixed(2)}deg)`;
      if (clapper) clapper.setAttribute('transform', `rotate(${cord.clapper.toFixed(2)} 20 24)`);
    };
    const tick = (time: number): void => {
      const dt = previous === undefined ? 0 : (time - previous) / 1000;
      field.step(dt);
      cord.step(dt);
      previous = time;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const update = (): void => {
      if (disposed) return;
      const enabled =
        !document.hidden && !reduced.matches && inView && !shell?.querySelector('dialog[open]');
      host.dataset.snowState = enabled ? 'running' : 'paused';
      host.parentElement?.setAttribute('data-still', String(!enabled));
      if (enabled && frame === undefined) frame = requestAnimationFrame(tick);
      else if (!enabled && frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
        previous = undefined;
      }
    };
    const resize = new ResizeObserver(() => {
      field.resize(host.clientWidth, host.clientHeight);
      paint();
    });
    resize.observe(host);
    const intersection =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => {
            inView = entry?.isIntersecting ?? true;
            update();
          })
        : undefined;
    intersection?.observe(host);
    const modal = new MutationObserver(update);
    if (shell)
      modal.observe(shell, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['open'],
      });
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    paint();
    update();
    return () => {
      disposed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      resize.disconnect();
      intersection?.disconnect();
      modal.disconnect();
      reduced.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      simulation.current = null;
      cordSimulation.current = null;
    };
  }, [calm, ref]);
  useEffect(() => {
    if (burst > 0) simulation.current?.snowMore(burst % 2 === 0 ? -1 : 1);
  }, [burst]);
  useEffect(() => {
    if (rings > 0) cordSimulation.current?.ring();
  }, [rings]);
}
