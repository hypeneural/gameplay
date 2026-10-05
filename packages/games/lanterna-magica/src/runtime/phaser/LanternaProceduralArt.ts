import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';

export const lanternaArtKey = (name: string): string => `lanterna-art-${name}`;

function drawStar(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  c.beginPath();
  c.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    c.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    c.lineTo(x, y);
    rot += step;
  }
  c.lineTo(cx, cy - outerRadius);
  c.closePath();
  c.fill();
}

export function createLanternaProceduralArt(scene: Phaser.Scene, scope: SceneScope): void {
  const createTexture = (
    name: string,
    width: number,
    height: number,
    draw: (c: CanvasRenderingContext2D) => void,
  ): void => {
    const key = lanternaArtKey(name);
    if (scene.textures.exists(key)) return;
    const target = scene.textures.createCanvas(key, width, height);
    if (!target) return;
    draw(target.context);
    target.refresh();
    scope.texture(scene.textures, key);
  };

  // 1. Soft Light Beam Particle (32x32)
  createTexture('light-particle', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
    g.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
    g.addColorStop(0.7, 'rgba(255, 180, 0, 0.15)');
    g.addColorStop(1, 'rgba(255, 140, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(16, 16, 16, 0, Math.PI * 2);
    c.fill();
  });

  // 2. Star Sparkle Collectible (48x48)
  createTexture('star-bonus', 48, 48, (c) => {
    const cx = 24;
    const cy = 24;
    const g = c.createRadialGradient(cx, cy, 4, cx, cy, 24);
    g.addColorStop(0, 'rgba(255, 235, 120, 0.85)');
    g.addColorStop(0.55, 'rgba(255, 190, 40, 0.35)');
    g.addColorStop(1, 'rgba(255, 160, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 24, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#ffdf00';
    drawStar(c, cx, cy, 5, 18, 8);
    c.strokeStyle = '#d4af37';
    c.lineWidth = 1.8;
    c.stroke();

    c.fillStyle = 'rgba(255, 255, 255, 0.45)';
    c.beginPath();
    c.moveTo(cx, cy - 18);
    c.lineTo(cx, cy);
    c.lineTo(cx + 8, cy + 3);
    c.closePath();
    c.fill();

    c.fillStyle = '#ffffff';
    drawStar(c, cx, cy, 4, 7, 2.5);
  });

  // 3. Star Collected Active (48x48)
  createTexture('star-bonus-active', 48, 48, (c) => {
    const cx = 24;
    const cy = 24;
    const g = c.createRadialGradient(cx, cy, 2, cx, cy, 24);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.35, 'rgba(255, 235, 120, 0.85)');
    g.addColorStop(0.75, 'rgba(255, 180, 20, 0.35)');
    g.addColorStop(1, 'rgba(255, 120, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 24, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#ffffff';
    drawStar(c, cx, cy, 5, 20, 9);
  });

  // 4. Directional Drop Shadow with Soft Penumbra (104x72)
  createTexture('directional-shadow', 104, 72, (c) => {
    const cx = 52;
    const cy = 36;
    const g = c.createRadialGradient(cx, cy, 14, cx, cy, 48);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.60)');
    g.addColorStop(0.4, 'rgba(0, 0, 0, 0.38)');
    g.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, cy, 48, 30, 0, 0, Math.PI * 2);
    c.fill();
  });

  // 5. Contact Ambient Occlusion Footprint (84x84)
  createTexture('contact-ao', 84, 84, (c) => {
    const cx = 42;
    const cy = 42;
    const g = c.createRadialGradient(cx, cy, 26, cx, cy, 41);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
    g.addColorStop(0.5, 'rgba(0, 0, 0, 0.38)');
    g.addColorStop(0.85, 'rgba(0, 0, 0, 0.10)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 41, 0, Math.PI * 2);
    c.fill();
  });

  // 6. Victorian Brass Oil Lamp Emitter Housing (76x76)
  createTexture('lamp-emitter', 76, 76, (c) => {
    const cx = 38;
    const cy = 38;

    const baseGrad = c.createRadialGradient(cx - 5, cy - 5, 8, cx, cy, 35);
    baseGrad.addColorStop(0, '#fff2a8');
    baseGrad.addColorStop(0.35, '#d4af37');
    baseGrad.addColorStop(0.75, '#8c5e1e');
    baseGrad.addColorStop(1, '#422808');
    c.fillStyle = baseGrad;
    c.beginPath();
    c.arc(cx, cy, 35, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#2b1703';
    c.lineWidth = 2.5;
    c.stroke();

    c.strokeStyle = '#ffd700';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(cx, cy, 28, 0, Math.PI * 2);
    c.stroke();

    c.fillStyle = '#ffe57f';
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const rx = cx + Math.cos(angle) * 31;
      const ry = cy + Math.sin(angle) * 31;
      c.beginPath();
      c.arc(rx, ry, 1.8, 0, Math.PI * 2);
      c.fill();
    }

    const collarGrad = c.createRadialGradient(cx, cy, 4, cx, cy, 20);
    collarGrad.addColorStop(0, '#2d1b0d');
    collarGrad.addColorStop(0.7, '#1b0f07');
    collarGrad.addColorStop(1, '#53370e');
    c.fillStyle = collarGrad;
    c.beginPath();
    c.arc(cx, cy, 20, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#d4af37';
    c.lineWidth = 1.5;
    c.stroke();

    // Heavy brass nozzle collimator on the right rim
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.moveTo(cx + 28, cy - 8);
    c.lineTo(cx + 38, cy);
    c.lineTo(cx + 28, cy + 8);
    c.closePath();
    c.fill();
    c.strokeStyle = '#5a3d10';
    c.lineWidth = 1.2;
    c.stroke();

    c.fillStyle = '#ffffff';
    c.fillRect(cx + 34, cy - 2, 3, 4);
  });

  // 7. Dynamic Kerosene/Living Flame Core (36x36)
  createTexture('lamp-flame', 36, 36, (c) => {
    const cx = 18;
    const cy = 18;

    const aura = c.createRadialGradient(cx, cy, 2, cx, cy, 17);
    aura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    aura.addColorStop(0.25, 'rgba(255, 240, 120, 0.85)');
    aura.addColorStop(0.65, 'rgba(255, 140, 10, 0.45)');
    aura.addColorStop(1, 'rgba(200, 50, 0, 0)');
    c.fillStyle = aura;
    c.beginPath();
    c.arc(cx, cy, 17, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(cx, cy + 2, 6, 0, Math.PI);
    c.quadraticCurveTo(cx - 6, cy - 2, cx, cy - 10);
    c.quadraticCurveTo(cx + 6, cy - 2, cx + 6, cy + 2);
    c.fill();
  });

  // 8. Victorian Knurled Brass Rotary Mirror Dial with Realistic Glass Blade (80x80)
  createTexture('mirror-dial', 80, 80, (c) => {
    const cx = 40;
    const cy = 40;

    // Outer knurled brass gear/dial ring
    const brassGrad = c.createRadialGradient(cx - 6, cy - 6, 8, cx, cy, 39);
    brassGrad.addColorStop(0, '#fff4b8');
    brassGrad.addColorStop(0.35, '#d4af37');
    brassGrad.addColorStop(0.72, '#997a15');
    brassGrad.addColorStop(1, '#443204');
    c.fillStyle = brassGrad;
    c.beginPath();
    c.arc(cx, cy, 39, 0, Math.PI * 2);
    c.fill();

    // 24 milled knurled notches along the perimeter
    c.strokeStyle = '#2b1c02';
    c.lineWidth = 2.2;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      const x1 = cx + Math.cos(angle) * 33;
      const y1 = cy + Math.sin(angle) * 33;
      const x2 = cx + Math.cos(angle) * 38;
      const y2 = cy + Math.sin(angle) * 38;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    }

    // Inner bronze bezel
    c.fillStyle = '#8c6b12';
    c.beginPath();
    c.arc(cx, cy, 31, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffe57f';
    c.lineWidth = 1;
    c.stroke();

    // 4 vintage fastening screws at cardinal points
    c.fillStyle = '#543f09';
    const screwDist = 28;
    const cardinal = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    for (const ang of cardinal) {
      const sx = cx + Math.cos(ang) * screwDist;
      const sy = cy + Math.sin(ang) * screwDist;
      c.beginPath();
      c.arc(sx, sy, 1.8, 0, Math.PI * 2);
      c.fill();
    }

    // Central Silver Mirror Surface with Beveled Edge
    const mirrorGrad = c.createLinearGradient(cx - 24, cy - 24, cx + 24, cy + 24);
    mirrorGrad.addColorStop(0, '#ebf3fa');
    mirrorGrad.addColorStop(0.35, '#ffffff');
    mirrorGrad.addColorStop(0.65, '#c8dbe8');
    mirrorGrad.addColorStop(1, '#8eaec4');
    c.fillStyle = mirrorGrad;
    c.beginPath();
    c.arc(cx, cy, 24, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#4a677d';
    c.lineWidth = 1.8;
    c.stroke();

    // Specular highlight crescent across top of mirror
    c.fillStyle = 'rgba(255, 255, 255, 0.55)';
    c.beginPath();
    c.ellipse(cx - 7, cy - 10, 15, 6, -Math.PI / 6, 0, Math.PI * 2);
    c.fill();

    // Physical Silvered Mirror Blade (horizontal along X axis)
    c.fillStyle = '#3a270a';
    c.fillRect(cx - 26, cy - 4, 52, 8);
    const bladeGrad = c.createLinearGradient(cx - 24, cy - 2, cx + 24, cy + 2);
    bladeGrad.addColorStop(0, '#d6e5f3');
    bladeGrad.addColorStop(0.4, '#ffffff');
    bladeGrad.addColorStop(0.8, '#a2c1d8');
    c.fillStyle = bladeGrad;
    c.fillRect(cx - 24, cy - 2.5, 48, 5);
    c.strokeStyle = '#ffd700';
    c.lineWidth = 1;
    c.strokeRect(cx - 24, cy - 2.5, 48, 5);
    c.fillStyle = '#ffffff';
    c.fillRect(cx - 22, cy - 0.75, 44, 1.5);

    // Indicator orientation arrow on the rim
    c.fillStyle = '#ffdf00';
    c.beginPath();
    c.moveTo(cx, cy - 38);
    c.lineTo(cx - 5.5, cy - 30);
    c.lineTo(cx + 5.5, cy - 30);
    c.closePath();
    c.fill();
    c.strokeStyle = '#3d2b02';
    c.lineWidth = 1.2;
    c.stroke();
  });

  // 9. Projector Target Lens Apparatus with Convex Glass & Fresnel Crescent (88x88)
  createTexture('projector-lens', 88, 88, (c) => {
    const cx = 44;
    const cy = 44;

    const housingGrad = c.createRadialGradient(cx - 6, cy - 6, 8, cx, cy, 42);
    housingGrad.addColorStop(0, '#fff4b8');
    housingGrad.addColorStop(0.35, '#c99738');
    housingGrad.addColorStop(0.78, '#855b17');
    housingGrad.addColorStop(1, '#3b2203');
    c.fillStyle = housingGrad;
    c.beginPath();
    c.arc(cx, cy, 42, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#241401';
    c.lineWidth = 2.2;
    c.stroke();

    c.fillStyle = '#ffd700';
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const bx = cx + Math.cos(angle) * 36;
      const by = cy + Math.sin(angle) * 36;
      c.beginPath();
      c.arc(bx, by, 2.5, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#4e330a';
      c.lineWidth = 0.8;
      c.stroke();
    }

    c.strokeStyle = '#5a3d10';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(cx, cy, 31, 0, Math.PI * 2);
    c.stroke();

    const glassGrad = c.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 27);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    glassGrad.addColorStop(0.3, 'rgba(200, 235, 255, 0.75)');
    glassGrad.addColorStop(0.65, 'rgba(70, 135, 185, 0.55)');
    glassGrad.addColorStop(1, 'rgba(12, 35, 65, 0.90)');
    c.fillStyle = glassGrad;
    c.beginPath();
    c.arc(cx, cy, 27, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#2e5b7a';
    c.lineWidth = 1.5;
    c.stroke();

    c.fillStyle = 'rgba(255, 255, 255, 0.65)';
    c.beginPath();
    c.ellipse(cx - 9, cy - 9, 14, 6.5, -Math.PI / 4, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = 'rgba(255, 255, 255, 0.25)';
    c.beginPath();
    c.ellipse(cx + 8, cy + 8, 8, 3.5, -Math.PI / 4, 0, Math.PI * 2);
    c.fill();
  });

  // 10. Shutter Flare / Active Lens Glow (64x64)
  createTexture('lens-glow', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.25, 'rgba(255, 235, 140, 0.9)');
    g.addColorStop(0.65, 'rgba(255, 175, 20, 0.45)');
    g.addColorStop(1, 'rgba(255, 120, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(32, 32, 32, 0, Math.PI * 2);
    c.fill();
  });

  // 11. Specular Impact Flare (4-point diamond star) (40x40)
  createTexture('specular-flare', 40, 40, (c) => {
    const cx = 20;
    const cy = 20;
    const g = c.createRadialGradient(cx, cy, 1, cx, cy, 18);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(255, 230, 120, 0.85)');
    g.addColorStop(0.7, 'rgba(255, 170, 20, 0.3)');
    g.addColorStop(1, 'rgba(255, 140, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 18, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(cx, cy - 18);
    c.quadraticCurveTo(cx, cy, cx + 18, cy);
    c.quadraticCurveTo(cx, cy, cx, cy + 18);
    c.quadraticCurveTo(cx, cy, cx - 18, cy);
    c.quadraticCurveTo(cx, cy, cx, cy - 18);
    c.fill();

    c.fillStyle = '#fff4a3';
    c.beginPath();
    c.arc(cx, cy, 3.5, 0, Math.PI * 2);
    c.fill();
  });

  // 12. Table Surface Caustic Light Pool (64x64)
  createTexture('table-caustic', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 170, 30, 0.35)');
    g.addColorStop(0.5, 'rgba(255, 140, 10, 0.15)');
    g.addColorStop(0.8, 'rgba(200, 90, 0, 0.05)');
    g.addColorStop(1, 'rgba(150, 60, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(32, 32, 32, 0, Math.PI * 2);
    c.fill();
  });

  // 13. Atmospheric Bokeh Mote for Tyndall Scattering (32x32)
  createTexture('bokeh-mote', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 2, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
    g.addColorStop(0.35, 'rgba(255, 225, 130, 0.8)');
    g.addColorStop(0.7, 'rgba(255, 180, 40, 0.3)');
    g.addColorStop(1, 'rgba(255, 150, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(16, 16, 16, 0, Math.PI * 2);
    c.fill();
  });

  // -------------------------------------------------------------
  // CHRISTMAS THEMATIC ATMOSPHERIC ASSETS
  // -------------------------------------------------------------

  const drawFairyBulb = (
    c: CanvasRenderingContext2D,
    outerColor: string,
    midColor: string,
    innerColor: string,
  ): void => {
    const cx = 12;
    // Brass mount socket with knurled threads
    c.fillStyle = '#4a350c';
    c.fillRect(cx - 3.5, 0.5, 7, 5.5);
    c.fillStyle = '#d4af37';
    c.fillRect(cx - 3, 1.5, 6, 1.2);
    c.fillRect(cx - 3, 3.2, 6, 1.2);

    // Glass bulb teardrop
    const grad = c.createRadialGradient(cx - 1, 12, 1, cx, 14, 10);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1, outerColor);
    c.fillStyle = grad;

    c.beginPath();
    c.moveTo(cx - 3, 6);
    c.bezierCurveTo(cx - 8, 9, cx - 8, 17, cx, 22);
    c.bezierCurveTo(cx + 8, 17, cx + 8, 9, cx + 3, 6);
    c.closePath();
    c.fill();

    // Internal coiled tungsten filament
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(cx - 1.5, 6);
    c.lineTo(cx - 1.2, 11);
    c.lineTo(cx, 13.5);
    c.lineTo(cx + 1.2, 11);
    c.lineTo(cx + 1.5, 6);
    c.stroke();

    // Incandescent filament hotspot glow
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(cx, 13.5, 1.4, 0, Math.PI * 2);
    c.fill();

    // Specular glint
    c.fillStyle = 'rgba(255, 255, 255, 0.85)';
    c.beginPath();
    c.ellipse(cx - 2.5, 11, 3.8, 1.6, -Math.PI / 4, 0, Math.PI * 2);
    c.fill();
  };

  // 14. Fairy Light - Solar Gold (24x24)
  createTexture('fairy-light-gold', 24, 24, (c) => {
    drawFairyBulb(c, '#b8860b', '#ffd700', '#fffbe6');
  });

  // 15. Fairy Light - Christmas Ruby (24x24)
  createTexture('fairy-light-red', 24, 24, (c) => {
    drawFairyBulb(c, '#8b0000', '#e62436', '#ffe6e8');
  });

  // 16. Fairy Light - Emerald Pine (24x24)
  createTexture('fairy-light-green', 24, 24, (c) => {
    drawFairyBulb(c, '#0b6623', '#2ecc71', '#e8fdf0');
  });

  // 17. Fairy Light Glow Halo (48x48)
  createTexture('fairy-light-glow', 48, 48, (c) => {
    const g = c.createRadialGradient(24, 24, 2, 24, 24, 24);
    g.addColorStop(0, 'rgba(255, 240, 180, 0.85)');
    g.addColorStop(0.35, 'rgba(255, 215, 80, 0.45)');
    g.addColorStop(0.7, 'rgba(255, 170, 30, 0.15)');
    g.addColorStop(1, 'rgba(255, 140, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(24, 24, 24, 0, Math.PI * 2);
    c.fill();
  });

  // 18. Christmas Holly Sprig with Lustrous Red Berries (48x48)
  createTexture('christmas-holly', 48, 48, (c) => {
    const cx = 24;
    const cy = 24;

    // 3 Holly Leaves (rotated 120 deg apart)
    const drawHollyLeaf = (angle: number): void => {
      c.save();
      c.translate(cx, cy);
      c.rotate(angle);

      const leafGrad = c.createLinearGradient(-6, -18, 6, 0);
      leafGrad.addColorStop(0, '#104d22');
      leafGrad.addColorStop(0.5, '#1b6932');
      leafGrad.addColorStop(1, '#0c3d18');
      c.fillStyle = leafGrad;
      c.strokeStyle = '#27ae60';
      c.lineWidth = 0.8;

      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(-7, -4, -6, -8);
      c.quadraticCurveTo(-9, -11, -5, -15);
      c.quadraticCurveTo(-4, -18, 0, -22);
      c.quadraticCurveTo(4, -18, 5, -15);
      c.quadraticCurveTo(9, -11, 6, -8);
      c.quadraticCurveTo(7, -4, 0, 0);
      c.closePath();
      c.fill();
      c.stroke();

      // Leaf midrib vein
      c.strokeStyle = '#52be80';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -19);
      c.stroke();

      c.restore();
    };

    drawHollyLeaf(0);
    drawHollyLeaf((Math.PI * 2) / 3);
    drawHollyLeaf((Math.PI * 4) / 3);

    // 3 Ruby Red Holly Berries in center
    const berries = [
      { x: cx - 3.5, y: cy - 2 },
      { x: cx + 3.5, y: cy - 2 },
      { x: cx, y: cy + 3.5 },
    ];

    for (const b of berries) {
      const bGrad = c.createRadialGradient(b.x - 1, b.y - 1, 0.5, b.x, b.y, 4.5);
      bGrad.addColorStop(0, '#ff6b6b');
      bGrad.addColorStop(0.4, '#c9182b');
      bGrad.addColorStop(0.85, '#780914');
      bGrad.addColorStop(1, '#4a040b');
      c.fillStyle = bGrad;
      c.beginPath();
      c.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
      c.fill();

      // Specular highlight glint
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(b.x - 1.2, b.y - 1.2, 1.1, 0, Math.PI * 2);
      c.fill();
    }
  });

  // 19. Pine Needle Garland Sprig (64x32)
  createTexture('pine-garland', 64, 32, (c) => {
    // Woody twig
    c.strokeStyle = '#4a2c0f';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(4, 16);
    c.quadraticCurveTo(32, 14, 60, 16);
    c.stroke();

    // Dense pine needles fanning outward
    for (let x = 8; x <= 56; x += 3.5) {
      const len = 10 + Math.sin(x * 0.3) * 3;
      // Top needle
      c.strokeStyle = x % 7 === 0 ? '#27ae60' : '#145a27';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x, 15);
      c.lineTo(x + (x < 32 ? -4 : 4), 15 - len);
      c.stroke();

      // Bottom needle
      c.strokeStyle = x % 5 === 0 ? '#1e7e34' : '#0e421c';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x, 17);
      c.lineTo(x + (x < 32 ? -3 : 3), 17 + len);
      c.stroke();
    }
  });

  // 20. Delicate Winter Snowflake (24x24)
  createTexture('snowflake', 24, 24, (c) => {
    const cx = 12;
    const cy = 12;
    c.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    c.lineWidth = 1.4;
    c.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Main arm
      const x2 = cx + cos * 9.5;
      const y2 = cy + sin * 9.5;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(x2, y2);
      c.stroke();

      // Outer V-branch
      const bx1 = cx + cos * 6.5;
      const by1 = cy + sin * 6.5;
      const perpX = -sin * 2.8;
      const perpY = cos * 2.8;
      c.beginPath();
      c.moveTo(bx1 + perpX, by1 + perpY);
      c.lineTo(bx1, by1);
      c.lineTo(bx1 - perpX, by1 - perpY);
      c.stroke();
    }

    // Core bead
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(cx, cy, 1.6, 0, Math.PI * 2);
    c.fill();
  });

  // 21. Velvet Crimson Ribbon Bow with Gold Trim (64x40)
  createTexture('ribbon-bow', 64, 40, (c) => {
    const cx = 32;
    const cy = 18;

    // Left Loop
    const leftGrad = c.createRadialGradient(cx - 16, cy, 3, cx - 16, cy, 16);
    leftGrad.addColorStop(0, '#e62436');
    leftGrad.addColorStop(0.7, '#a81322');
    leftGrad.addColorStop(1, '#540810');
    c.fillStyle = leftGrad;
    c.beginPath();
    c.moveTo(cx, cy);
    c.bezierCurveTo(cx - 10, cy - 14, cx - 28, cy - 12, cx - 28, cy);
    c.bezierCurveTo(cx - 28, cy + 12, cx - 10, cy + 10, cx, cy);
    c.fill();
    c.strokeStyle = '#ffd700';
    c.lineWidth = 1.2;
    c.stroke();

    // Right Loop
    const rightGrad = c.createRadialGradient(cx + 16, cy, 3, cx + 16, cy, 16);
    rightGrad.addColorStop(0, '#e62436');
    rightGrad.addColorStop(0.7, '#a81322');
    rightGrad.addColorStop(1, '#540810');
    c.fillStyle = rightGrad;
    c.beginPath();
    c.moveTo(cx, cy);
    c.bezierCurveTo(cx + 10, cy - 14, cx + 28, cy - 12, cx + 28, cy);
    c.bezierCurveTo(cx + 28, cy + 12, cx + 10, cy + 10, cx, cy);
    c.fill();
    c.strokeStyle = '#ffd700';
    c.lineWidth = 1.2;
    c.stroke();

    // Dangling Ribbon Tails
    c.fillStyle = '#94101e';
    c.beginPath();
    c.moveTo(cx - 4, cy + 2);
    c.lineTo(cx - 18, cy + 20);
    c.lineTo(cx - 12, cy + 21);
    c.lineTo(cx - 2, cy + 6);
    c.closePath();
    c.fill();

    c.beginPath();
    c.moveTo(cx + 4, cy + 2);
    c.lineTo(cx + 18, cy + 20);
    c.lineTo(cx + 12, cy + 21);
    c.lineTo(cx + 2, cy + 6);
    c.closePath();
    c.fill();

    // Central Knot
    const knotGrad = c.createRadialGradient(cx, cy, 1, cx, cy, 6);
    knotGrad.addColorStop(0, '#ff4d5e');
    knotGrad.addColorStop(0.6, '#b81424');
    knotGrad.addColorStop(1, '#660b14');
    c.fillStyle = knotGrad;
    c.beginPath();
    c.ellipse(cx, cy, 6.5, 5.5, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffd700';
    c.lineWidth = 1.2;
    c.stroke();
  });

  // 22. Fireplace Hearth Ambient Glow (96x96)
  createTexture('fireplace-glow', 96, 96, (c) => {
    const g = c.createRadialGradient(48, 48, 4, 48, 48, 48);
    g.addColorStop(0, 'rgba(255, 120, 20, 0.35)');
    g.addColorStop(0.4, 'rgba(220, 75, 10, 0.18)');
    g.addColorStop(0.75, 'rgba(160, 40, 0, 0.05)');
    g.addColorStop(1, 'rgba(100, 20, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(48, 48, 48, 0, Math.PI * 2);
    c.fill();
  });

  // -------------------------------------------------------------
  // PHOTON OVERCHARGE & CONFETTI CELEBRATION ASSETS
  // -------------------------------------------------------------

  const drawFoilRibbon = (
    c: CanvasRenderingContext2D,
    baseDark: string,
    baseMid: string,
    highlight: string,
    strokeColor: string,
  ): void => {
    // 22x11 metallic ribbon with specular slash
    const g = c.createLinearGradient(0, 0, 22, 11);
    g.addColorStop(0, baseDark);
    g.addColorStop(0.35, baseMid);
    g.addColorStop(0.5, highlight);
    g.addColorStop(0.65, baseMid);
    g.addColorStop(1, baseDark);
    c.fillStyle = g;
    c.fillRect(0, 0, 22, 11);

    // Specular diagonal sheen line
    c.fillStyle = 'rgba(255, 255, 255, 0.45)';
    c.beginPath();
    c.moveTo(8, 0);
    c.lineTo(14, 0);
    c.lineTo(10, 11);
    c.lineTo(4, 11);
    c.closePath();
    c.fill();

    // Crisp micro-bevel edge highlight
    c.strokeStyle = strokeColor;
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, 21, 10);
  };

  // 23. Confetti Metallic Gold Foil (22x11)
  createTexture('confetti-gold', 22, 11, (c) => {
    drawFoilRibbon(c, '#b8860b', '#ffd700', '#ffffff', 'rgba(255, 245, 180, 0.9)');
  });

  // 24. Confetti Ruby Crimson Foil (22x11)
  createTexture('confetti-red', 22, 11, (c) => {
    drawFoilRibbon(c, '#7a0515', '#e62436', '#ffb3b8', 'rgba(255, 190, 195, 0.9)');
  });

  // 25. Confetti Emerald Pine Foil (22x11)
  createTexture('confetti-green', 22, 11, (c) => {
    drawFoilRibbon(c, '#094d1c', '#20bf6b', '#c2fcd9', 'rgba(180, 255, 205, 0.9)');
  });

  // 25b. Confetti Silver Chrome Foil (22x11)
  createTexture('confetti-silver', 22, 11, (c) => {
    drawFoilRibbon(c, '#636e72', '#dfe6e9', '#ffffff', 'rgba(255, 255, 255, 0.95)');
  });

  // 25c. Confetti Sapphire Royal Blue Foil (22x11)
  createTexture('confetti-sapphire', 22, 11, (c) => {
    drawFoilRibbon(c, '#0c2461', '#1e90ff', '#dff9fb', 'rgba(180, 225, 255, 0.9)');
  });

  // 26. Confetti Gold Star Sequin (18x18)
  createTexture('confetti-star', 18, 18, (c) => {
    c.fillStyle = '#ffea75';
    drawStar(c, 9, 9, 5, 8, 3.5);
    c.strokeStyle = '#fff6b0';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(9, 9, 2, 0, Math.PI * 2);
    c.fill();
  });

  // 26b. Confetti Diamond Crystal (16x16)
  createTexture('confetti-diamond', 16, 16, (c) => {
    const cx = 8;
    const cy = 8;
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.moveTo(cx, 1);
    c.lineTo(15, cy);
    c.lineTo(cx, 15);
    c.lineTo(1, cy);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255, 255, 255, 0.85)';
    c.beginPath();
    c.moveTo(cx, 1);
    c.lineTo(cx, 15);
    c.lineTo(1, cy);
    c.closePath();
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.stroke();
  });

  // 26c. Confetti Round Sequin Disc (14x14)
  createTexture('confetti-disc', 14, 14, (c) => {
    const cx = 7;
    const cy = 7;
    const g = c.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#ffd700');
    g.addColorStop(0.85, '#cc8800');
    g.addColorStop(1, '#885500');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 6.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    c.lineWidth = 0.8;
    c.stroke();
  });

  // 26d. Soft Screen-Wide Radiance Bloom (128x128)
  createTexture('godray-bloom-soft', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 250, 220, 0.5)');
    g.addColorStop(0.25, 'rgba(255, 230, 140, 0.28)');
    g.addColorStop(0.6, 'rgba(255, 195, 60, 0.1)');
    g.addColorStop(1, 'rgba(255, 160, 20, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(64, 64, 64, 0, Math.PI * 2);
    c.fill();
  });

  // 27. Luminous Shockwave Blast Ring (96x96)
  createTexture('shockwave-ring', 96, 96, (c) => {
    const cx = 48;
    const cy = 48;
    // Outer radial flare gradient
    const g = c.createRadialGradient(cx, cy, 28, cx, cy, 46);
    g.addColorStop(0, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.4, 'rgba(255, 245, 180, 0.95)');
    g.addColorStop(0.7, 'rgba(255, 215, 0, 0.6)');
    g.addColorStop(1, 'rgba(255, 180, 0, 0)');
    c.strokeStyle = g;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(cx, cy, 38, 0, Math.PI * 2);
    c.stroke();

    // Sharp incandescent inner ring
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, 38, 0, Math.PI * 2);
    c.stroke();
  });

  // 28. Overcharge Electrical Photon Arc (32x32)
  createTexture('overcharge-arc', 32, 32, (c) => {
    c.strokeStyle = 'rgba(255, 255, 200, 0.9)';
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(4, 16);
    c.quadraticCurveTo(12, 6, 16, 18);
    c.quadraticCurveTo(20, 28, 28, 14);
    c.stroke();

    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(4, 16);
    c.quadraticCurveTo(12, 6, 16, 18);
    c.quadraticCurveTo(20, 28, 28, 14);
    c.stroke();
  });

  // 29. Victorian Polished Mahogany Wood Tabletop Planks (256x256)
  createTexture('tabletop-wood-planks', 256, 256, (c) => {
    // Deep warm mahogany base
    c.fillStyle = '#1c0e08';
    c.fillRect(0, 0, 256, 256);

    // 4 vertical planks (width 64 each)
    for (let p = 0; p < 4; p++) {
      const px = p * 64;
      const plankGrad = c.createLinearGradient(px, 0, px + 64, 0);
      plankGrad.addColorStop(0, '#2b150c');
      plankGrad.addColorStop(0.2, '#381c10');
      plankGrad.addColorStop(0.6, '#31170d');
      plankGrad.addColorStop(0.95, '#220e06');
      plankGrad.addColorStop(1, '#160904');
      c.fillStyle = plankGrad;
      c.fillRect(px, 0, 64, 256);

      // Organic longitudinal grain lines
      c.strokeStyle = 'rgba(74, 38, 20, 0.35)';
      c.lineWidth = 1;
      for (let g = 0; g < 14; g++) {
        const gx = px + 4 + g * 4.2;
        c.beginPath();
        c.moveTo(gx, 0);
        c.bezierCurveTo(gx + ((g % 3) - 1) * 6, 80, gx - (g % 2) * 5, 170, gx, 256);
        c.stroke();
      }

      // Soft wax polish specular highlight strip down the center of each plank
      const sheen = c.createLinearGradient(px + 16, 0, px + 48, 0);
      sheen.addColorStop(0, 'rgba(255, 220, 160, 0)');
      sheen.addColorStop(0.5, 'rgba(255, 235, 190, 0.055)');
      sheen.addColorStop(1, 'rgba(255, 220, 160, 0)');
      c.fillStyle = sheen;
      c.fillRect(px + 12, 0, 40, 256);

      // Plank seam shadow and highlight bevel
      c.fillStyle = '#0f0603';
      c.fillRect(px, 0, 1.5, 256);
      c.fillStyle = 'rgba(92, 48, 26, 0.5)';
      c.fillRect(px + 1.5, 0, 1, 256);
    }
  });

  // 30. Fireplace Glowing Ember Particle (16x16)
  createTexture('fireplace-ember', 16, 16, (c) => {
    const cx = 8;
    const cy = 8;
    const g = c.createRadialGradient(cx, cy, 1, cx, cy, 8);
    g.addColorStop(0, 'rgba(255, 255, 200, 1)');
    g.addColorStop(0.35, 'rgba(255, 160, 30, 0.85)');
    g.addColorStop(0.7, 'rgba(220, 40, 10, 0.4)');
    g.addColorStop(1, 'rgba(150, 20, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 8, 0, Math.PI * 2);
    c.fill();
  });

  // 31. Crystal Hint Sparkle (32x32)
  createTexture('crystal-hint-spark', 32, 32, (c) => {
    const cx = 16;
    const cy = 16;
    const g = c.createRadialGradient(cx, cy, 2, cx, cy, 16);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(255, 235, 120, 0.9)');
    g.addColorStop(0.65, 'rgba(255, 180, 30, 0.35)');
    g.addColorStop(1, 'rgba(255, 140, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, 16, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(cx, 2);
    c.quadraticCurveTo(cx, cy, cx + 14, cy);
    c.quadraticCurveTo(cx, cy, cx, cy + 14);
    c.quadraticCurveTo(cx, cy, cx - 14, cy);
    c.quadraticCurveTo(cx, cy, cx, 2);
    c.fill();
  });

  // 32. Mirror Fine-Tune Clockwise Button (+15 deg) (36x36)
  createTexture('mirror-btn-cw', 36, 36, (c) => {
    const cx = 18;
    const cy = 18;
    // Dark mahogany/brass glass circle
    c.fillStyle = '#1c0e08';
    c.beginPath();
    c.arc(cx, cy, 17, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#d4af37';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = '#fff2a8';
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(cx, cy, 15, 0, Math.PI * 2);
    c.stroke();

    // Curved clockwise arrow
    c.strokeStyle = '#ffd700';
    c.lineWidth = 2.2;
    c.beginPath();
    c.arc(cx, cy, 10, -Math.PI * 0.7, Math.PI * 0.4);
    c.stroke();
    // Arrowhead
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.moveTo(cx + 8, cy + 10);
    c.lineTo(cx + 12, cy + 4);
    c.lineTo(cx + 4, cy + 6);
    c.closePath();
    c.fill();
  });

  // 33. Mirror Fine-Tune Counter-Clockwise Button (-15 deg) (36x36)
  createTexture('mirror-btn-ccw', 36, 36, (c) => {
    const cx = 18;
    const cy = 18;
    c.fillStyle = '#1c0e08';
    c.beginPath();
    c.arc(cx, cy, 17, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#d4af37';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = '#fff2a8';
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(cx, cy, 15, 0, Math.PI * 2);
    c.stroke();

    // Curved counter-clockwise arrow
    c.strokeStyle = '#ffd700';
    c.lineWidth = 2.2;
    c.beginPath();
    c.arc(cx, cy, 10, -Math.PI * 0.4, Math.PI * 0.7, true);
    c.stroke();
    // Arrowhead
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.moveTo(cx - 8, cy + 10);
    c.lineTo(cx - 12, cy + 4);
    c.lineTo(cx - 4, cy + 6);
    c.closePath();
    c.fill();
  });
}
