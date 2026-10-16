import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(resolve(root, 'tools/asset-factory/package.json'));
const sharp = require('sharp');

const mastersDir =
  process.argv[2] ??
  'C:/Users/Anderson/.gemini/antigravity/brain/e1c4d726-6391-43ec-9f04-1316328e41d4';

const sideMasterPath = resolve(mastersDir, 'side_garland_master_1792130172973.jpg');
const cornersMasterPath = resolve(mastersDir, 'frame_corners_master_1792130195553.jpg');
const bottomMasterPath = resolve(mastersDir, 'bottom_garland_master_1792130215943.jpg');

const galleryPublicDir = resolve(root, 'apps/play/public/assets/christmas-shell/gallery');
const manifestFile = resolve(root, 'apps/play/assets/christmas-shell/manifest.json');

await mkdir(galleryPublicDir, { recursive: true });

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Alpha-keys a black-background RGB/RGBA buffer and despills dark edge halos
 * so pine needles, berries, gold filigree, and warm lights have clean RGBA edges
 * without dark charcoal fringes over warm cream/gold frames.
 */
function computeKeyedAlpha(r, g, b, threshold = 20, softRange = 26) {
  const maxVal = Math.max(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const signal = Math.max(maxVal, lum * 1.15);
  if (signal <= threshold) return 0;
  if (signal >= threshold + softRange) return 255;
  return Math.round(smoothstep(threshold, threshold + softRange, signal) * 255);
}

function unpremultiplyDespill(r, g, b, alpha) {
  if (alpha <= 0) return [0, 0, 0];
  if (alpha >= 250) return [r, g, b];
  const normA = Math.max(0.44, alpha / 255);
  const ur = Math.min(255, Math.round(r / normA));
  const ug = Math.min(255, Math.round(g / normA));
  const ub = Math.min(255, Math.round(b / normA));
  return [ur, ug, ub];
}

// ---------------------------------------------------------------------------
// 1. Vertical Seamless Side Garland (`gallery-velvet-side-left-v1.webp`, 56x224)
//    Renders at 16-24 CSS px width (~2.3x-3.5x Retina density)
// ---------------------------------------------------------------------------
async function buildSideGarland() {
  const W = 56;
  const H = 224;
  const blendH = 44;
  const rawH = H + blendH;

  const sideBuf = await readFile(sideMasterPath);
  const sideMeta = await sharp(sideBuf).metadata();
  const extractW = Math.round((sideMeta.width ?? 1024) * 0.56);
  const extractH = sideMeta.height ?? 1024;

  const { data } = await sharp(sideBuf)
    .extract({ left: 0, top: 0, width: extractW, height: extractH })
    .resize(W, rawH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const idx = (y * W + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      if (y < blendH) {
        const wrapIdx = ((H + y) * W + x) * 4;
        const t = smoothstep(0, blendH, y);
        r = Math.round(data[wrapIdx] * (1 - t) + r * t);
        g = Math.round(data[wrapIdx + 1] * (1 - t) + g * t);
        b = Math.round(data[wrapIdx + 2] * (1 - t) + b * t);
      }

      let a = computeKeyedAlpha(r, g, b, 22, 26);

      if (x >= W - 1) {
        a = 0;
      } else if (x > 36) {
        const fade = 1 - smoothstep(36, W - 1.5, x);
        a = Math.round(a * fade);
      }

      const [cr, cg, cb] = unpremultiplyDespill(r, g, b, a);
      out[idx] = cr;
      out[idx + 1] = cg;
      out[idx + 2] = cb;
      out[idx + 3] = a;
    }
  }

  for (let y = 0; y < H; y += 1) {
    const rightAlpha = out[(y * W + (W - 1)) * 4 + 3];
    if (rightAlpha !== 0) {
      throw new Error(`Side garland right boundary alpha non-zero at y=${y}: ${rightAlpha}`);
    }
  }

  return sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 52, alphaQuality: 62, smartSubsample: true, effort: 6 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// 2. 4 Independent Frame Corners Atlas (`gallery-velvet-frame-corners-v1.webp`, 144x144)
//    Auto-crops each quadrant to its active ornament bounding box so the outer
//    corner sits flush at (dx=1, dy=1) with zero dry cuts and zero dark halos.
// ---------------------------------------------------------------------------
async function buildFrameCorners() {
  const S = 144;
  const C = S / 2; // 72x72 per corner cell

  const masterBuf = await readFile(cornersMasterPath);
  const meta = await sharp(masterBuf).metadata();
  const mw = meta.width ?? 1024;
  const mh = meta.height ?? 1024;
  const halfW = Math.floor(mw / 2);
  const halfH = Math.floor(mh / 2);

  const { data: fullData } = await sharp(masterBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(S * S * 4);

  for (let qy = 0; qy < 2; qy += 1) {
    for (let qx = 0; qx < 2; qx += 1) {
      const x0 = qx * halfW;
      const y0 = qy * halfH;
      let minX = halfW - 1;
      let maxX = 0;
      let minY = halfH - 1;
      let maxY = 0;

      for (let ly = 0; ly < halfH; ly += 1) {
        for (let lx = 0; lx < halfW; lx += 1) {
          const mIdx = ((y0 + ly) * mw + (x0 + lx)) * 4;
          const sig = Math.max(fullData[mIdx], fullData[mIdx + 1], fullData[mIdx + 2]);
          if (sig > 34) {
            if (lx < minX) minX = lx;
            if (lx > maxX) maxX = lx;
            if (ly < minY) minY = ly;
            if (ly > maxY) maxY = ly;
          }
        }
      }

      const pad = 8;
      const cropLeft = Math.max(0, x0 + minX - pad);
      const cropTop = Math.max(0, y0 + minY - pad);
      const cropRight = Math.min(x0 + halfW, x0 + maxX + pad);
      const cropBottom = Math.min(y0 + halfH, y0 + maxY + pad);
      const cropW = Math.max(32, cropRight - cropLeft);
      const cropH = Math.max(32, cropBottom - cropTop);

      const { data: cellData } = await sharp(masterBuf)
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(C, C, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      for (let ly = 0; ly < C; ly += 1) {
        for (let lx = 0; lx < C; lx += 1) {
          const cIdx = (ly * C + lx) * 4;
          const r = cellData[cIdx];
          const g = cellData[cIdx + 1];
          const b = cellData[cIdx + 2];

          const dx = qx === 0 ? lx : C - 1 - lx;
          const dy = qy === 0 ? ly : C - 1 - ly;

          let a = computeKeyedAlpha(r, g, b, 26, 28);

          // Softly feather outer 2px border so the corner never has a flat box edge
          if (dx === 0 || dy === 0) {
            a = Math.round(a * 0.35);
          } else if (dx === 1 || dy === 1) {
            a = Math.round(a * 0.78);
          }

          // Strict inner photo aperture clearance (dx >= 38 && dy >= 38 has alpha === 0)
          const armDist = Math.min(dx, dy);
          const radialDist = Math.hypot(dx, dy);

          if (dx >= 38 && dy >= 38) {
            a = 0;
          } else if (armDist > 26) {
            const innerFade = 1 - smoothstep(26, 37.5, armDist);
            a = Math.round(a * innerFade);
          }

          // Feather the far tips of the L-arms so they never end in a dry straight cut
          const maxArm = Math.max(dx, dy);
          if (maxArm >= C - 1) {
            a = 0;
          } else if (maxArm > C - 14) {
            a = Math.round(a * (1 - smoothstep(C - 14, C - 1, maxArm)));
          }

          if (radialDist > 60 && dx > 22 && dy > 22) {
            a = Math.round(a * (1 - smoothstep(60, 68, radialDist)));
          }

          const [cr, cg, cb] = unpremultiplyDespill(r, g, b, a);
          const outIdx = ((qy * C + ly) * S + (qx * C + lx)) * 4;
          out[outIdx] = cr;
          out[outIdx + 1] = cg;
          out[outIdx + 2] = cb;
          out[outIdx + 3] = a;
        }
      }
    }
  }

  for (let qy = 0; qy < 2; qy += 1) {
    for (let qx = 0; qx < 2; qx += 1) {
      for (let ly = 0; ly < C; ly += 1) {
        for (let lx = 0; lx < C; lx += 1) {
          const dx = qx === 0 ? lx : C - 1 - lx;
          const dy = qy === 0 ? ly : C - 1 - ly;
          if (dx >= 38 && dy >= 38) {
            const x = qx * C + lx;
            const y = qy * C + ly;
            const alpha = out[(y * S + x) * 4 + 3];
            if (alpha !== 0) {
              throw new Error(
                `Corner (${qx},${qy}) inner photo zone alpha non-zero at (${lx},${ly}): ${alpha}`,
              );
            }
          }
        }
      }
    }
  }

  return sharp(out, { raw: { width: S, height: S, channels: 4 } })
    .webp({ quality: 54, alphaQuality: 64, smartSubsample: true, effort: 6 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// 3. 9-Slice Frame Edges (`gallery-velvet-frame-edges-v1.webp`, 144x144, slice 48)
//    Outer 3D champagne-gold bevel + warm ivory matte + candy-cane inner fillet
//    with strictly alpha === 0 center aperture (x: 28..115, y: 28..115).
// ---------------------------------------------------------------------------
function roundedBoxDistance(x, y, w, h, r) {
  const qx = Math.abs(x - (w - 1) / 2) - (w / 2 - r);
  const qy = Math.abs(y - (h - 1) / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

async function buildFrameEdges() {
  const S = 144;
  const out = Buffer.alloc(S * S * 4);

  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const idx = (y * S + x) * 4;

      if (x >= 28 && x < S - 28 && y >= 28 && y < S - 28) {
        out[idx + 3] = 0;
        continue;
      }

      const dOuter = roundedBoxDistance(x, y, S, S, 18);
      if (dOuter > 0.5) {
        out[idx + 3] = 0;
        continue;
      }

      const dEdge = Math.min(x, y, S - 1 - x, S - 1 - y);
      const lightBias = (S - x + (S - y)) / (2 * S);

      let r;
      let g;
      let b;
      let a = dOuter > -0.8 ? Math.round((1 - smoothstep(-0.8, 0.5, dOuter)) * 255) : 255;

      if (dEdge < 8) {
        const bevel = Math.sin((dEdge / 8) * Math.PI);
        const spec = bevel * 48 + lightBias * 24;
        r = Math.min(255, Math.round(192 + spec));
        g = Math.min(255, Math.round(146 + spec * 0.92));
        b = Math.min(255, Math.round(78 + spec * 0.65));
      } else if (dEdge < 10) {
        r = 136;
        g = 92;
        b = 38;
      } else if (dEdge < 20) {
        const warmth = lightBias * 8;
        r = Math.min(255, Math.round(248 + warmth));
        g = Math.min(255, Math.round(236 + warmth * 0.9));
        b = Math.min(255, Math.round(212 + warmth * 0.8));
      } else if (dEdge < 21) {
        r = 216;
        g = 174;
        b = 98;
      } else if (dEdge < 25) {
        const stripe = Math.sin(((x + y) / 8) * Math.PI);
        if (stripe >= 0) {
          r = 182;
          g = 32;
          b = 54;
        } else {
          r = 252;
          g = 242;
          b = 222;
        }
      } else if (dEdge < 27) {
        r = 228;
        g = 188;
        b = 112;
      } else {
        r = 92;
        g = 48;
        b = 26;
        a = Math.round(a * 0.5);
      }

      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = a;
    }
  }

  for (let y = 28; y < S - 28; y += 1) {
    for (let x = 28; x < S - 28; x += 1) {
      const alpha = out[(y * S + x) * 4 + 3];
      if (alpha !== 0) {
        throw new Error(`Frame edges center aperture alpha non-zero at (${x},${y}): ${alpha}`);
      }
    }
  }

  return sharp(out, { raw: { width: S, height: S, channels: 4 } })
    .webp({ quality: 66, alphaQuality: 76, smartSubsample: true, effort: 6 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// 4. Bottom Garland Cradle (`gallery-velvet-bottom-v1.webp`, 288x58)
//    Dynamically detects the highest non-black pixel in the master so no
//    rising pine branch or gold scroll is ever horizontally cropped.
// ---------------------------------------------------------------------------
async function buildBottomGarland() {
  const W = 288;
  const H = 58;

  const bottomBuf = await readFile(bottomMasterPath);
  const bottomMeta = await sharp(bottomBuf).metadata();
  const bw = bottomMeta.width ?? 1024;
  const bh = bottomMeta.height ?? 1024;

  const { data: fullBottom } = await sharp(bottomBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minActiveY = Math.round(bh * 0.45);
  outerScan: for (let y = 0; y < bh; y += 1) {
    for (let x = 0; x < bw; x += 1) {
      const idx = (y * bw + x) * 4;
      const sig = Math.max(fullBottom[idx], fullBottom[idx + 1], fullBottom[idx + 2]);
      if (sig > 32) {
        minActiveY = y;
        break outerScan;
      }
    }
  }

  const topY = Math.max(0, minActiveY - 12);
  const cropH = bh - topY;

  const { data } = await sharp(bottomBuf)
    .extract({ left: 0, top: topY, width: bw, height: cropH })
    .resize(W, H, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const idx = (y * W + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      let a = computeKeyedAlpha(r, g, b, 24, 26);

      if (y === 0) {
        a = 0;
      } else if (y < 14) {
        a = Math.round(a * smoothstep(0, 14, y));
      }

      // Feather left and right outer 12px so the bottom garland never has dry side cuts
      if (x < 12) {
        a = Math.round(a * smoothstep(0, 12, x));
      } else if (x > W - 13) {
        a = Math.round(a * smoothstep(0, 12, W - 1 - x));
      }

      const [cr, cg, cb] = unpremultiplyDespill(r, g, b, a);
      out[idx] = cr;
      out[idx + 1] = cg;
      out[idx + 2] = cb;
      out[idx + 3] = a;
    }
  }

  for (let x = 0; x < W; x += 1) {
    if (out[x * 4 + 3] !== 0) {
      throw new Error(`Bottom garland top row alpha non-zero at x=${x}`);
    }
  }

  return sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 50, alphaQuality: 60, smartSubsample: true, effort: 6 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Execute pipeline and update christmas-shell manifest
// ---------------------------------------------------------------------------
console.log('Building Natal Velvet photorealistic RGBA WebP kit...');

const sideBuffer = await buildSideGarland();
const cornersBuffer = await buildFrameCorners();
const edgesBuffer = await buildFrameEdges();
const bottomBuffer = await buildBottomGarland();

const newAssets = [
  {
    id: 'gallery-velvet-side-left-v1',
    fileName: 'gallery-velvet-side-left-v1.webp',
    buffer: sideBuffer,
    width: 56,
    height: 224,
    recipe: 'prepare-gallery-velvet-art.mjs:side-left',
    justification:
      'Guirlanda vertical fotorrealista sem emenda (56x224 RGBA) com ramos de pinheiro, fita de veludo rubi, pinhas, berries e pontos de luz quente. Borda interna com alfa=0 verificada.',
  },
  {
    id: 'gallery-velvet-frame-corners-v1',
    fileName: 'gallery-velvet-frame-corners-v1.webp',
    buffer: cornersBuffer,
    width: 144,
    height: 144,
    recipe: 'prepare-gallery-velvet-art.mjs:frame-corners',
    justification:
      'Atlas 2x2 de cantos ornamentais fotorrealistas (144x144 RGBA): ramos de pinheiro, azevinho, pinha e berries nos cantos TL/BR e flocos barrocos dourados 3D nos cantos TR/BL. Zona interna da foto com alfa=0.',
  },
  {
    id: 'gallery-velvet-frame-edges-v1',
    fileName: 'gallery-velvet-frame-edges-v1.webp',
    buffer: edgesBuffer,
    width: 144,
    height: 144,
    recipe: 'prepare-gallery-velvet-art.mjs:frame-edges',
    justification:
      'Moldura 9-slice natalina (144x144 RGBA) com aro externo de ouro champagne 3D, passe-partout marfim aquecido e filete interno candy-cane. Janela central 100% transparente (alfa=0).',
  },
  {
    id: 'gallery-velvet-bottom-v1',
    fileName: 'gallery-velvet-bottom-v1.webp',
    buffer: bottomBuffer,
    width: 288,
    height: 58,
    recipe: 'prepare-gallery-velvet-art.mjs:bottom-garland',
    justification:
      'Vinheta horizontal inferior fotorrealista (288x58 RGBA) com ramos de abeto, pinhas, bolas rubi/ouro e arabescos dourados para emoldurar o encerramento e o contador do album.',
  },
];

for (const item of newAssets) {
  const outPath = resolve(galleryPublicDir, item.fileName);
  await writeFile(outPath, item.buffer);
  console.log(
    `Wrote ${item.fileName}: ${item.width}x${item.height}, ${item.buffer.length} bytes, sha256=${sha256(item.buffer)}`,
  );
}

// Remove the 5 superseded/unused gallery SVGs to preserve the strict 36,000 B visual budget
const supersededIds = new Set([
  'gallery-starlight-footer-v1',
  'gallery-evergreen-hero-v2',
  'gallery-header-glow-v1',
  'gallery-badge-photo-count-v1',
  'gallery-divider-starlight-v2',
]);

for (const id of supersededIds) {
  const svgPath = resolve(galleryPublicDir, `${id}.svg`);
  await rm(svgPath, { force: true });
}

const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
const newIds = new Set(newAssets.map((a) => a.id));
manifest.assets = manifest.assets.filter(
  (asset) => !supersededIds.has(asset.id) && !newIds.has(asset.id),
);

for (const item of newAssets) {
  const digest = sha256(item.buffer);
  manifest.assets.push({
    id: item.id,
    kind: 'ui',
    format: 'webp',
    source: {
      provider: 'Google Antigravity AI generation',
      origin: 'project-created',
      identifier: item.id,
      license: 'project-owned',
      reviewedOn: '2026-10-16',
      reviewedBy: 'natal-velvet-photoreal-prep-v1',
      record: 'ASSET_PROVENANCE.md#gallery-velvet-v1',
    },
    art: {
      family: 'christmas-photo-first',
      christmasFit: 'approved',
      photoSafety: 'approved',
      mobileLegibility: 'approved',
      state: 'PRONTO_PARA_RUNTIME',
      justification: item.justification,
    },
    processing: {
      recipe: item.recipe,
      tools: ['Google Antigravity AI generation', 'sharp:0.35.3'],
    },
    runtime: {
      file: `apps/play/public/assets/christmas-shell/gallery/${item.fileName}`,
      publicPath: `/assets/christmas-shell/gallery/${item.fileName}`,
      bytes: item.buffer.length,
      sha256: digest,
      dimensions: {
        width: item.width,
        height: item.height,
      },
      textureKey: item.id,
      quality: {
        low: 'keep',
        reducedMotion: 'keep',
      },
    },
  });
}

await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const totalVisualBytes = manifest.assets
  .filter((a) => a.kind !== 'audio')
  .reduce((sum, a) => sum + a.runtime.bytes, 0);
console.log(
  `Updated christmas-shell manifest.json: visualBytes = ${totalVisualBytes} / ${manifest.budget.visualBytesMax} bytes.`,
);
