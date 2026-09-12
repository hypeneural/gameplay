import type { Random } from '@christmas-games/platform';

export function selectRudolphPhotos(
  ids: readonly string[],
  anchor: string,
  random: Random,
): string[] {
  const unique = [...new Set(ids)];
  if (unique.length < 3 || !unique.includes(anchor))
    throw new Error('Rudolph needs three authorized memories and an anchor.');
  const rest = unique.filter((id) => id !== anchor);
  for (let index = rest.length - 1; index > 0; index--) {
    const other = random.int(0, index);
    [rest[index], rest[other]] = [rest[other]!, rest[index]!];
  }
  return [anchor, ...rest.slice(0, 7)];
}
