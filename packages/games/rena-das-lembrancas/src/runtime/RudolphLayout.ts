export function rudolphLayout(width: number, height: number) {
  const landscape = width > height * 1.25;
  const fieldX = landscape ? width * 0.34 : 0;
  const fieldWidth = width - fieldX;
  const hero = landscape
    ? { x: width * 0.17, y: height * 0.46, width: width * 0.31, height: height * 0.55 }
    : { x: width / 2, y: 234, width: width * 0.8, height: 168 };
  const ground = height - 76;
  const catchY = ground - 96;
  const spawnY = landscape ? 132 : 350;
  return {
    width,
    height,
    fieldX,
    fieldWidth,
    hero,
    ground,
    catchY,
    spawnY: Math.min(spawnY, catchY - 80),
    frameMax: height < 650 ? 130 : 156,
    final: landscape
      ? { x: width * 0.255, y: height / 2 + 26, width: width * 0.44, height: height - 112 }
      : {
          x: width / 2,
          y: 132 + Math.max(100, height - 398) / 2,
          width: Math.min(width - 36, 500),
          height: Math.max(100, height - 398),
        },
  };
}

export type RudolphLayout = ReturnType<typeof rudolphLayout>;
