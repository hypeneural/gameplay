import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';

export const estilingueArtKey = (name: string): string => `estilingue-art-${name}`;

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

function drawConcentricBullseye(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  // Outer white ring
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(cx, cy, radius, 0, Math.PI * 2);
  c.fill();

  // Red ring 1
  c.fillStyle = '#c0392b';
  c.beginPath();
  c.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
  c.fill();

  // White ring 2
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  c.fill();

  // Center red bullseye
  c.fillStyle = '#c0392b';
  c.beginPath();
  c.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
  c.fill();
}

export function createEstilingueProceduralArt(scene: Phaser.Scene, scope: SceneScope): void {
  const createTexture = (
    name: string,
    width: number,
    height: number,
    draw: (c: CanvasRenderingContext2D) => void,
  ): void => {
    const key = estilingueArtKey(name);
    if (scene.textures.exists(key)) return;
    const target = scene.textures.createCanvas(key, width, height);
    if (!target) return;
    draw(target.context);
    target.refresh();
    scope.texture(scene.textures, key);
  };

  // 1. Soft Snow Particle (32x32)
  createTexture('snow-particle', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.4, 'rgba(240, 250, 255, 0.75)');
    g.addColorStop(0.8, 'rgba(215, 240, 255, 0.25)');
    g.addColorStop(1, 'rgba(200, 230, 255, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(16, 16, 16, 0, Math.PI * 2);
    c.fill();
  });

  // 2. Star Sparkle (36x36)
  createTexture('sparkle', 36, 36, (c) => {
    c.fillStyle = '#f6d365';
    drawStar(c, 18, 18, 4, 16, 4);
    c.fillStyle = '#ffffff';
    drawStar(c, 18, 18, 4, 8, 2);
  });

  // 3. Shaded Spherical Snowball (48x48)
  createTexture('snowball', 48, 48, (c) => {
    const cx = 24;
    const cy = 24;
    const r = 22;

    // Drop shadow inside sphere
    const g = c.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.65, '#e6f3fa');
    g.addColorStop(0.88, '#bdd7e8');
    g.addColorStop(1, '#97b8cc');

    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();

    // Specular highlight glint
    const glint = c.createRadialGradient(cx - 8, cy - 8, 0, cx - 8, cy - 8, 7);
    glint.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = glint;
    c.beginPath();
    c.arc(cx - 8, cy - 8, 7, 0, Math.PI * 2);
    c.fill();
  });

  // 4. Wood Square Target (72x72)
  createTexture('target-wood-square', 72, 72, (c) => {
    // Wood plank background with rounded corners
    c.fillStyle = '#8b5a2b';
    c.beginPath();
    c.roundRect(8, 8, 56, 56, 8);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = '#5a3d1c';
    c.stroke();

    // Bullseye
    drawConcentricBullseye(c, 36, 36, 22);

    // Top golden star
    c.fillStyle = '#ffd700';
    drawStar(c, 36, 12, 5, 8, 4);
  });

  // 5. Gingerbread Target (72x72)
  createTexture('target-gingerbread', 72, 72, (c) => {
    // Gingerbread biscuit color
    c.fillStyle = '#b5651d';
    // Head
    c.beginPath();
    c.arc(36, 20, 14, 0, Math.PI * 2);
    c.fill();
    // Body
    c.beginPath();
    c.roundRect(22, 28, 28, 36, 10);
    c.fill();
    // Arms
    c.beginPath();
    c.roundRect(8, 28, 56, 12, 6);
    c.fill();

    // Bullseye on belly
    drawConcentricBullseye(c, 36, 44, 15);

    // Icing eyes & smile
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(31, 17, 2, 0, Math.PI * 2);
    c.arc(41, 17, 2, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(36, 22, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();
  });

  // 6. Gold Star Target (72x72)
  createTexture('target-gold-star', 72, 72, (c) => {
    c.fillStyle = '#f1c40f';
    drawStar(c, 36, 36, 5, 34, 18);
    c.lineWidth = 2;
    c.strokeStyle = '#d4ac0d';
    c.stroke();

    // Bullseye in star center
    drawConcentricBullseye(c, 36, 36, 14);
  });

  // 7. Round Bauble Target (72x72)
  createTexture('target-round-bauble', 72, 72, (c) => {
    // Top brass hook
    c.fillStyle = '#ffd700';
    c.fillRect(32, 4, 8, 8);

    // Bauble circle
    const g = c.createRadialGradient(28, 28, 4, 36, 40, 30);
    g.addColorStop(0, '#e74c3c');
    g.addColorStop(1, '#922b21');
    c.fillStyle = g;
    c.beginPath();
    c.arc(36, 40, 28, 0, Math.PI * 2);
    c.fill();

    // Bullseye
    drawConcentricBullseye(c, 36, 40, 18);
  });

  // 8. Slingshot Fork Fallback (120x140)
  createTexture('slingshot-fork', 120, 140, (c) => {
    const cx = 60;
    // Base stem
    c.fillStyle = '#5c3a21';
    c.beginPath();
    c.roundRect(cx - 16, 70, 32, 65, 8);
    c.fill();

    // Left arm
    c.beginPath();
    c.moveTo(cx - 14, 80);
    c.quadraticCurveTo(cx - 35, 60, cx - 35, 15);
    c.lineTo(cx - 20, 15);
    c.quadraticCurveTo(cx - 20, 55, cx, 80);
    c.closePath();
    c.fill();

    // Right arm
    c.beginPath();
    c.moveTo(cx + 14, 80);
    c.quadraticCurveTo(cx + 35, 60, cx + 35, 15);
    c.lineTo(cx + 20, 15);
    c.quadraticCurveTo(cx + 20, 55, cx, 80);
    c.closePath();
    c.fill();

    // Brass tips
    c.fillStyle = '#d4af37';
    c.fillRect(cx - 38, 10, 20, 8);
    c.fillRect(cx + 18, 10, 20, 8);
  });
}
