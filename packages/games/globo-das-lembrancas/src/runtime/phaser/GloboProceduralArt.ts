import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';

export const globoArtKey = (name: string): string => `globo-art-${name}`;

/**
 * Procedural Canvas 2D sprites, faceted crystals and particle textures.
 * Zero network bytes, crisp vector rendering, clean lifecycle disposal via SceneScope.
 */
export function createGloboProceduralArt(scene: Phaser.Scene, scope: SceneScope): void {
  const createTexture = (
    name: string,
    width: number,
    height: number,
    draw: (c: CanvasRenderingContext2D) => void,
  ): void => {
    const key = globoArtKey(name);
    if (scene.textures.exists(key)) return;
    const target = scene.textures.createCanvas(key, width, height)!;
    draw(target.context);
    target.refresh();
    scope.texture(scene.textures, key);
  };

  // 1. Soft snow bokeh particle (36x36)
  createTexture('snow-powder', 36, 36, (c) => {
    const g = c.createRadialGradient(18, 18, 0, 18, 18, 18);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.35, 'rgba(235, 248, 255, 0.85)');
    g.addColorStop(0.7, 'rgba(210, 240, 255, 0.3)');
    g.addColorStop(1, 'rgba(200, 235, 255, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(18, 18, 18, 0, Math.PI * 2);
    c.fill();
  });

  // 2. Star sparkle particle (36x36 with 4-point golden glint)
  createTexture('star-sparkle', 36, 36, (c) => {
    c.fillStyle = '#ffeaa7';
    drawStar(c, 18, 18, 16, 4, 0.22);
    c.fillStyle = '#ffffff';
    drawStar(c, 18, 18, 8, 4, 0.28);
  });

  // 3. Steam wipe brush (128x128 soft radial falloff)
  createTexture('steam-brush', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 15, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.55, 'rgba(255, 255, 255, 0.8)');
    g.addColorStop(0.85, 'rgba(255, 255, 255, 0.2)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });

  // 4. Realistic Brass Winding Key (96x96, centered on 48,48)
  createTexture('brass-key', 96, 96, (c) => {
    const cx = 48;
    const cy = 48;

    // Drop shadow behind key
    c.shadowColor = 'rgba(10, 5, 2, 0.65)';
    c.shadowBlur = 8;
    c.shadowOffsetY = 4;

    // Metal gradients
    const brassGrad = c.createLinearGradient(12, 12, 84, 84);
    brassGrad.addColorStop(0, '#fff3bc');
    brassGrad.addColorStop(0.2, '#f5ce62');
    brassGrad.addColorStop(0.5, '#c88c22');
    brassGrad.addColorStop(0.8, '#875608');
    brassGrad.addColorStop(1, '#ffd76a');

    c.fillStyle = brassGrad;
    c.strokeStyle = '#5a3804';
    c.lineWidth = 2.5;

    // Center hub & shaft
    c.beginPath();
    c.arc(cx, cy, 14, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Bottom shaft insertion pin
    c.fillRect(cx - 5, cy + 8, 10, 32);
    c.strokeRect(cx - 5, cy + 8, 10, 32);

    // Left butterfly bow (ornate ear)
    c.beginPath();
    c.moveTo(cx - 10, cy);
    c.bezierCurveTo(cx - 18, cy - 26, cx - 44, cy - 24, cx - 44, cy - 4);
    c.bezierCurveTo(cx - 44, cy + 18, cx - 18, cy + 16, cx - 10, cy + 6);
    c.closePath();
    c.fill();
    c.stroke();

    // Right butterfly bow (ornate ear)
    c.beginPath();
    c.moveTo(cx + 10, cy);
    c.bezierCurveTo(cx + 18, cy - 26, cx + 44, cy - 24, cx + 44, cy - 4);
    c.bezierCurveTo(cx + 44, cy + 18, cx + 18, cy + 16, cx + 10, cy + 6);
    c.closePath();
    c.fill();
    c.stroke();

    // Inner wing cutouts (wood showing through)
    c.shadowColor = 'transparent';
    c.fillStyle = '#1c0e08';
    c.beginPath();
    c.ellipse(cx - 26, cy - 3, 9, 11, -0.15, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 26, cy - 3, 9, 11, 0.15, 0, Math.PI * 2);
    c.fill();

    // Decorative center jewel/rivet in hub
    const rivet = c.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 8);
    rivet.addColorStop(0, '#ffffff');
    rivet.addColorStop(0.35, '#fde68a');
    rivet.addColorStop(0.75, '#b47814');
    rivet.addColorStop(1, '#5c3a05');
    c.fillStyle = rivet;
    c.beginPath();
    c.arc(cx, cy, 7, 0, Math.PI * 2);
    c.fill();

    // High specular edge highlights
    c.strokeStyle = 'rgba(255, 255, 240, 0.9)';
    c.lineWidth = 1.8;
    c.beginPath();
    c.arc(cx - 26, cy - 8, 12, Math.PI * 1.05, Math.PI * 1.7);
    c.stroke();
    c.beginPath();
    c.arc(cx + 26, cy - 8, 12, Math.PI * 1.3, Math.PI * 1.95);
    c.stroke();
  });

  // 4b. Key Escutcheon Plate (48x80) - Solid brass collar mounted onto the mahogany wood
  createTexture('key-escutcheon-plate', 48, 80, (c) => {
    const cx = 24;
    const cy = 40;

    // Contact drop shadow onto mahogany
    c.shadowColor = 'rgba(0, 0, 0, 0.75)';
    c.shadowBlur = 6;
    c.shadowOffsetX = -2;
    c.shadowOffsetY = 3;

    // Brass oval plate
    const brassGrad = c.createLinearGradient(0, 0, 48, 80);
    brassGrad.addColorStop(0, '#fef08a');
    brassGrad.addColorStop(0.25, '#d97706');
    brassGrad.addColorStop(0.6, '#92400e');
    brassGrad.addColorStop(0.85, '#78350f');
    brassGrad.addColorStop(1, '#b45309');

    c.fillStyle = brassGrad;
    c.beginPath();
    c.ellipse(cx, cy, 18, 34, 0, 0, Math.PI * 2);
    c.fill();

    // Outer embossed bevel
    c.shadowColor = 'transparent';
    c.strokeStyle = '#fef9c3';
    c.lineWidth = 1.8;
    c.stroke();

    // Dark axle insertion hole (where shaft enters wood mechanism)
    c.fillStyle = '#100602';
    c.beginPath();
    c.arc(cx, cy, 9, 0, Math.PI * 2);
    c.fill();

    // Golden inner bushing ring
    c.strokeStyle = '#f59e0b';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(cx, cy, 9, 0, Math.PI * 2);
    c.stroke();

    // Antique mounting screws (top and bottom)
    for (const screwY of [cy - 22, cy + 22]) {
      c.fillStyle = '#78350f';
      c.beginPath();
      c.arc(cx, screwY, 3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(cx - 2, screwY - 1);
      c.lineTo(cx + 2, screwY + 1);
      c.stroke();
    }
  });

  // 5. Gem Socket Bezel (64x64) - Carved gold socket on the mahogany base
  createTexture('gem-socket', 64, 64, (c) => {
    const cx = 32;
    const cy = 32;
    // Outer shadow
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 6;
    c.shadowOffsetY = 3;

    // Gold rim
    const rimGrad = c.createLinearGradient(10, 10, 54, 54);
    rimGrad.addColorStop(0, '#ffe894');
    rimGrad.addColorStop(0.5, '#c99225');
    rimGrad.addColorStop(1, '#5c3e06');
    c.fillStyle = rimGrad;
    c.beginPath();
    c.arc(cx, cy, 26, 0, Math.PI * 2);
    c.fill();

    // Dark well inside
    c.shadowColor = 'transparent';
    c.fillStyle = '#140a05';
    c.beginPath();
    c.arc(cx, cy, 21, 0, Math.PI * 2);
    c.fill();

    // Inner gold bevel
    c.strokeStyle = '#dfb14a';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(cx, cy, 20.5, 0, Math.PI * 2);
    c.stroke();
  });

  // 6. Faceted Gem Crystals (64x64 each)
  const gemConfigs = [
    { name: 'gem-ruby', base: '#c91432', light: '#ff4d6d', dark: '#6b0515', glint: '#ffccd5' },
    { name: 'gem-emerald', base: '#109353', light: '#34d399', dark: '#044222', glint: '#a7f3d0' },
    { name: 'gem-sapphire', base: '#1d63d8', light: '#60a5fa', dark: '#0b2b6b', glint: '#bfdbfe' },
    { name: 'gem-topaz', base: '#e69500', light: '#fcd34d', dark: '#784400', glint: '#fef08a' },
  ];

  for (const g of gemConfigs) {
    createTexture(g.name, 64, 64, (c) => {
      drawFacetedGem(c, 32, 32, 20, g.base, g.light, g.dark, g.glint);
    });

    // Intense glowing halo for each lit crystal
    createTexture(`${g.name}-halo`, 160, 160, (c) => {
      const grad = c.createRadialGradient(80, 80, 10, 80, 80, 78);
      grad.addColorStop(0, hexToRgba(g.light, 0.95));
      grad.addColorStop(0.28, hexToRgba(g.base, 0.65));
      grad.addColorStop(0.65, hexToRgba(g.base, 0.18));
      grad.addColorStop(1, hexToRgba(g.dark, 0));
      c.fillStyle = grad;
      c.fillRect(0, 0, 160, 160);
    });
  }

  // 7. Light Beam (64x256) - Ascending ray of Christmas magic
  createTexture('light-beam', 64, 256, (c) => {
    const grad = c.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(255, 235, 160, 0.8)');
    grad.addColorStop(0.4, 'rgba(255, 215, 110, 0.45)');
    grad.addColorStop(0.8, 'rgba(255, 245, 200, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = grad;

    // Soft trapezoid beam
    c.beginPath();
    c.moveTo(18, 256);
    c.lineTo(46, 256);
    c.lineTo(58, 0);
    c.lineTo(6, 0);
    c.closePath();
    c.fill();
  });

  // 8. Refraction shockwave ring (128x128)
  createTexture('refraction-ring', 128, 128, (c) => {
    c.strokeStyle = 'rgba(230, 250, 255, 0.9)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(64, 64, 56, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(64, 64, 50, 0, Math.PI * 2);
    c.stroke();
  });

  // 9. Hint Glow Finger/Wand Pointer (48x48)
  createTexture('hint-pulse', 48, 48, (c) => {
    const g = c.createRadialGradient(24, 24, 4, 24, 24, 24);
    g.addColorStop(0, 'rgba(255, 245, 180, 0.95)');
    g.addColorStop(0.4, 'rgba(245, 190, 60, 0.6)');
    g.addColorStop(1, 'rgba(245, 190, 60, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(24, 24, 24, 0, Math.PI * 2);
    c.fill();
  });
}

function drawFacetedGem(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  base: string,
  light: string,
  dark: string,
  glint: string,
): void {
  // 1. Facet base
  const oct: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 8;
    oct.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }

  // Base fill
  c.fillStyle = dark;
  c.beginPath();
  c.moveTo(oct[0]!.x, oct[0]!.y);
  for (let i = 1; i < 8; i++) c.lineTo(oct[i]!.x, oct[i]!.y);
  c.closePath();
  c.fill();

  // 2. Facet cuts around outer rim
  const innerR = r * 0.58;
  const innerOct: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 8;
    innerOct.push({ x: cx + Math.cos(a) * innerR, y: cy + Math.sin(a) * innerR });
  }

  // Upper facets (light)
  c.fillStyle = light;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(oct[i]!.x, oct[i]!.y);
    c.lineTo(oct[(i + 1) % 8]!.x, oct[(i + 1) % 8]!.y);
    c.lineTo(innerOct[(i + 1) % 8]!.x, innerOct[(i + 1) % 8]!.y);
    c.lineTo(innerOct[i]!.x, innerOct[i]!.y);
    c.closePath();
    c.fill();
  }

  // Lower facets (rich base)
  c.fillStyle = base;
  for (let i = 4; i < 8; i++) {
    c.beginPath();
    c.moveTo(oct[i]!.x, oct[i]!.y);
    c.lineTo(oct[(i + 1) % 8]!.x, oct[(i + 1) % 8]!.y);
    c.lineTo(innerOct[(i + 1) % 8]!.x, innerOct[(i + 1) % 8]!.y);
    c.lineTo(innerOct[i]!.x, innerOct[i]!.y);
    c.closePath();
    c.fill();
  }

  // 3. Central table facet
  const tableGrad = c.createLinearGradient(cx - innerR, cy - innerR, cx + innerR, cy + innerR);
  tableGrad.addColorStop(0, light);
  tableGrad.addColorStop(0.5, base);
  tableGrad.addColorStop(1, dark);
  c.fillStyle = tableGrad;
  c.beginPath();
  c.moveTo(innerOct[0]!.x, innerOct[0]!.y);
  for (let i = 1; i < 8; i++) c.lineTo(innerOct[i]!.x, innerOct[i]!.y);
  c.closePath();
  c.fill();

  // 4. Brilliant facet wireframe
  c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(innerOct[0]!.x, innerOct[0]!.y);
  for (let i = 1; i < 8; i++) c.lineTo(innerOct[i]!.x, innerOct[i]!.y);
  c.closePath();
  c.stroke();

  // 5. Specular glint on upper left
  c.fillStyle = glint;
  c.beginPath();
  c.arc(cx - r * 0.35, cy - r * 0.35, r * 0.18, 0, Math.PI * 2);
  c.fill();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawStar(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  points: number,
  inset = 0.28,
): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 ? radius * inset : radius;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
}
