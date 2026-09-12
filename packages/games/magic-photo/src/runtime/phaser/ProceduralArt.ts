import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';

export const artKey = (name: string): string => `magic-photo-${name}`;

/** Small code-native brushes, light fields and pooled particle textures. */
export function createProceduralArt(scene: Phaser.Scene, scope: SceneScope): void {
  const texture = (
    name: string,
    width: number,
    height: number,
    draw: (c: CanvasRenderingContext2D) => void,
  ): void => {
    const key = artKey(name);
    const target = scene.textures.createCanvas(key, width, height)!;
    draw(target.context);
    target.refresh();
    scope.texture(scene.textures, key);
  };
  for (const [name, color] of [
    ['shadow', '1,8,18'],
    ['mist', '181,223,246'],
    ['powder', '239,249,255'],
  ] as const) {
    const size = name === 'powder' ? 32 : 256;
    texture(name, size, size, (c) => {
      const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, `rgba(${color},0.9)`);
      g.addColorStop(0.35, `rgba(${color},0.45)`);
      g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
    });
  }
  texture('glow', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 2, 128, 128, 128);
    g.addColorStop(0, '#fff2bce0');
    g.addColorStop(0.25, '#ffc96770');
    g.addColorStop(1, '#eda33b00');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
  texture('spark', 32, 32, (c) => {
    c.fillStyle = '#ffda89';
    drawStar(c, 16, 16, 15, 4);
    c.fillStyle = '#fffbea';
    drawStar(c, 16, 16, 8, 4);
  });
  for (const filled of [false, true]) {
    texture(filled ? 'star-filled' : 'star-empty', 72, 72, (c) => {
      const g = c.createLinearGradient(12, 8, 57, 65);
      g.addColorStop(0, filled ? '#fff4bd' : '#315d72');
      g.addColorStop(0.38, filled ? '#ffda76' : '#183747');
      g.addColorStop(0.7, filled ? '#cd8d2b' : '#102837');
      g.addColorStop(1, filled ? '#ffe5a1' : '#274a5a');
      c.fillStyle = g;
      c.shadowColor = '#020918';
      c.shadowBlur = 4;
      c.shadowOffsetY = 3;
      drawStar(c, 36, 35, 30, 5);
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
      c.strokeStyle = filled ? '#fff2bd' : '#b2dae9';
      c.lineWidth = 2.8;
      c.stroke();
      if (filled) {
        c.fillStyle = '#fff7d888';
        drawStar(c, 34, 31, 16, 5);
      }
    });
  }
  texture('snow', 32, 32, (c) => {
    c.strokeStyle = '#effbff';
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.translate(16, 16);
      c.rotate((i * Math.PI) / 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -13);
      c.moveTo(-4, -7);
      c.lineTo(0, -10);
      c.lineTo(4, -7);
      c.stroke();
      c.restore();
    }
  });
  texture('shard', 32, 40, (c) => {
    c.fillStyle = '#c5eeffb8';
    c.strokeStyle = '#f0fcff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(4, 8);
    c.lineTo(25, 2);
    c.lineTo(29, 25);
    c.lineTo(10, 37);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(4, 8);
    c.lineTo(29, 25);
    c.stroke();
  });
  texture('brush', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 44, 64, 64, 64);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#ffffff00');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  texture('hand', 80, 100, (c) => {
    c.shadowColor = '#06111d';
    c.shadowBlur = 5;
    c.fillStyle = '#fff2d4';
    c.strokeStyle = '#a9844b';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(23, 56);
    c.lineTo(23, 16);
    c.quadraticCurveTo(32, 2, 40, 16);
    c.lineTo(40, 39);
    c.bezierCurveTo(53, 30, 70, 48, 66, 65);
    c.lineTo(59, 89);
    c.lineTo(29, 89);
    c.lineTo(9, 62);
    c.quadraticCurveTo(6, 50, 17, 53);
    c.closePath();
    c.fill();
    c.stroke();
  });
  texture('hat', 100, 90, (c) => {
    c.fillStyle = '#bd2542';
    c.beginPath();
    c.moveTo(12, 67);
    c.quadraticCurveTo(25, -9, 80, 17);
    c.lineTo(70, 34);
    c.quadraticCurveTo(45, 6, 70, 67);
    c.fill();
    c.fillStyle = '#fff4df';
    c.beginPath();
    c.roundRect(8, 60, 69, 22, 9);
    c.fill();
    c.beginPath();
    c.arc(78, 25, 13, 0, Math.PI * 2);
    c.fill();
  });
}

function drawStar(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  points: number,
): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 ? radius * 0.27 : radius;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
}
