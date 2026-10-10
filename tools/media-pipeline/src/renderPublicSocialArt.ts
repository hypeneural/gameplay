import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../../../', import.meta.url);
export const genericSocialSvgSource = fileURLToPath(
  new URL('assets-src/catalog-social/evydencia-christmas-v2-template.svg', root),
);
export const genericSocialWebpOutput = fileURLToPath(
  new URL('apps/catalog-server/public/social/evydencia-christmas-v2.webp', root),
);
export const genericSocialJpegOutput = fileURLToPath(
  new URL('apps/catalog-server/public/social/evydencia-christmas-v2.jpg', root),
);

/** Studio-owned synthetic preview only. Never import customer media into this function. */
export async function buildGenericSocialPreview(
  svgSource = genericSocialSvgSource,
  outputPath = genericSocialWebpOutput,
  jpegOutputPath = outputPath.replace(/\.webp$/, '.jpg'),
): Promise<{
  bytes: number;
  sha256: string;
  jpegBytes: number;
  jpegSha256: string;
  width: number;
  height: number;
}> {
  await mkdir(dirname(outputPath), { recursive: true });
  const source = await readFile(svgSource);
  const output = await sharp(source, { density: 96 })
    .resize(1200, 630, { fit: 'fill' })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  const jpeg = await sharp(source, { density: 96 })
    .resize(1200, 630, { fit: 'fill' })
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer();
  const metadataJpeg = await sharp(jpeg).metadata();
  const metadata = await sharp(output).metadata();
  if (
    output.byteLength > 300 * 1024 ||
    jpeg.byteLength > 300 * 1024 ||
    metadata.width !== 1200 ||
    metadata.height !== 630 ||
    metadataJpeg.width !== 1200 ||
    metadataJpeg.height !== 630
  ) {
    throw new Error('GENERIC_OG_FORMAT_OR_BUDGET_INVALID');
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, output, { mode: 0o644 });
  await writeFile(jpegOutputPath, jpeg, { mode: 0o644 });
  return {
    bytes: output.length,
    sha256: createHash('sha256').update(output).digest('hex'),
    jpegBytes: jpeg.length,
    jpegSha256: createHash('sha256').update(jpeg).digest('hex'),
    width: 1200,
    height: 630,
  };
}

const invoked = process.argv[1]?.replaceAll('\\', '/') ?? '';
if (invoked.endsWith('/renderPublicSocialArt.ts')) {
  buildGenericSocialPreview().then(
    (result) => process.stdout.write(`PUBLIC_SOCIAL_ART_READY ${JSON.stringify(result)}\n`),
    () => {
      process.stderr.write('PUBLIC_SOCIAL_ART_BUILD_FAILED\n');
      process.exitCode = 1;
    },
  );
}
