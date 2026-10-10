import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const opaqueKey = /^[A-Za-z0-9_-]{16,128}$/;
const targetWidth = 1200;
const targetHeight = 630;
const maxBytes = 300 * 1024;

export interface SocialCoverOptions {
  /** Local photo or already-processed private derivative, never a URL. */
  readonly sourceImagePath: string;
  /** Must be private and outside the Git checkout/webroot. */
  readonly privateOutputDirectory: string;
  /** Versioned, opaque and unique to this session/revision. */
  readonly derivativeKey: string;
  /** Separate authorization for social previews, not generic gallery access. */
  readonly socialPreviewConsent: 'granted' | 'revoked' | 'unknown';
}

export interface SocialCoverResult {
  readonly privateFilePath: string;
  readonly byteLength: number;
  readonly width: 1200;
  readonly height: 630;
  readonly mimeType: 'image/jpeg';
}

/**
 * Offline-only, opt-in private cover derivation; never run at request/crawl time.
 * Callers must also verify the CRM order, active session and media authorization.
 * No names, order IDs, geographic metadata or filesystem paths enter the JPEG.
 */
export async function generatePrivateSocialCover(
  options: SocialCoverOptions,
): Promise<SocialCoverResult> {
  if (options.socialPreviewConsent !== 'granted') {
    throw new Error('SOCIAL_PREVIEW_CONSENT_REQUIRED');
  }
  if (!opaqueKey.test(options.derivativeKey)) {
    throw new Error('SOCIAL_PREVIEW_OPAQUE_KEY_REQUIRED');
  }
  if (!options.sourceImagePath || !options.privateOutputDirectory) {
    throw new Error('SOCIAL_PREVIEW_PRIVATE_PATH_REQUIRED');
  }
  const input = resolve(options.sourceImagePath);
  const outputRoot = resolve(options.privateOutputDirectory);
  if (isWithinRepo(input) || isWithinRepo(outputRoot) || input === outputRoot) {
    throw new Error('SOCIAL_PREVIEW_PUBLIC_PATH_REJECTED');
  }
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });

  const background = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .toColorspace('srgb')
    .toBuffer();

  const decoration = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="shade"><stop offset="0" stop-color="#102f28" stop-opacity=".96"/>
        <stop offset=".48" stop-color="#102f28" stop-opacity=".73"/>
        <stop offset="1" stop-color="#102f28" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#shade)"/>
    <rect x="35" y="35" width="1130" height="560" rx="18" fill="none" stroke="#edca88" stroke-opacity=".9" stroke-width="3"/>
    <text x="92" y="136" font-family="sans-serif" font-size="30" fill="#f3d79b" letter-spacing="3">ESTÚDIO EVYDÊNCIA</text>
    <text x="92" y="296" font-family="serif" font-size="76" font-weight="bold" fill="#fff4dd">Nosso Natal</text>
    <text x="92" y="376" font-family="serif" font-size="76" font-weight="bold" fill="#fff4dd">em família</text>
    <text x="92" y="471" font-family="sans-serif" font-size="29" fill="#f8e8c8">Um álbum de memórias e brincadeiras</text>
    <text x="92" y="551" font-family="sans-serif" font-size="24" fill="#f4ce87">JOGOS.FOTOSDENATAL.COM</text>
  </svg>`);

  let encoded: Buffer | undefined;
  for (const quality of [82, 74, 66, 58, 50, 42, 34]) {
    const candidate = await sharp(background)
      .composite([{ input: decoration }])
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();
    if (candidate.byteLength <= maxBytes) {
      encoded = candidate;
      break;
    }
  }
  if (!encoded) throw new Error('SOCIAL_PREVIEW_BUDGET_EXCEEDED');

  const destination = join(outputRoot, `${options.derivativeKey}.jpg`);
  const temporary = `${destination}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporary, encoded, { mode: 0o600, flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return {
    privateFilePath: destination,
    byteLength: encoded.byteLength,
    width: 1200,
    height: 630,
    mimeType: 'image/jpeg',
  };
}

function isWithinRepo(path: string): boolean {
  const local = relative(repoRoot, path);
  return local === '' || (!local.startsWith('..') && !isAbsolute(local));
}
