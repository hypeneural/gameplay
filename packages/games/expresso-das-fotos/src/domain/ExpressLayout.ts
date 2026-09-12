import { createTouchHitArea, type GameViewport, type Rect } from '@christmas-games/platform';

import { EXPRESS_STATION_IDS, type ExpressStationId } from './ExpressTypes.js';

export interface ExpressLayout {
  readonly header: Rect;
  readonly mission: Rect;
  readonly railArea: Rect;
  readonly trainHome: Readonly<{ x: number; y: number }>;
  readonly memoryTree: Rect;
  readonly stations: Readonly<Record<ExpressStationId, Rect>>;
}

/**
 * Plans the portrait-first scene from semantic bounds. Station hit boxes are
 * always at least 64 CSS px, while the visual card may remain delicately sized.
 */
export function planExpressLayout(viewport: GameViewport): ExpressLayout {
  const portrait = viewport.height >= viewport.width;
  const horizontalPadding = Math.max(18, Math.round(viewport.width * 0.045));
  const usableWidth = viewport.width - horizontalPadding * 2;
  const headerHeight = portrait ? 58 : 46;
  const header = {
    x: horizontalPadding,
    y: viewport.safeTop,
    width: usableWidth,
    height: headerHeight,
  };
  const missionWidth = Math.min(portrait ? usableWidth * 0.72 : usableWidth * 0.36, 320);
  const missionHeight = portrait
    ? Math.min(168, Math.max(126, viewport.height * 0.2))
    : Math.min(164, Math.max(112, viewport.height * 0.46));
  const mission = {
    x: portrait ? (viewport.width - missionWidth) / 2 : horizontalPadding,
    y: header.y + header.height + (portrait ? 18 : 8),
    width: missionWidth,
    height: missionHeight,
  };
  const stationY = portrait
    ? Math.min(viewport.height * 0.52, mission.y + mission.height + 118)
    : mission.y + Math.min(mission.height + 64, viewport.height * 0.56);
  const stationVisualWidth = Math.max(72, Math.min(portrait ? 104 : 116, usableWidth * 0.26));
  const stationVisualHeight = portrait ? 114 : 102;
  const stationGap = Math.max(10, (usableWidth - stationVisualWidth * 3) / 2);
  const stations = Object.fromEntries(
    EXPRESS_STATION_IDS.map((stationId, index) => [
      stationId,
      createTouchHitArea(
        {
          x: horizontalPadding + index * (stationVisualWidth + stationGap),
          y: stationY - stationVisualHeight / 2,
          width: stationVisualWidth,
          height: stationVisualHeight,
        },
        { minSize: 64, padding: 4 },
      ),
    ]),
  ) as Record<ExpressStationId, Rect>;
  const firstStation = stations['station-left'];
  const lastStation = stations['station-right'];
  const railArea = {
    x: Math.max(0, firstStation.x - 18),
    y: Math.min(mission.y + mission.height + 14, stationY - 112),
    width:
      Math.min(viewport.width, lastStation.x + lastStation.width + 18) -
      Math.max(0, firstStation.x - 18),
    height: Math.max(116, viewport.height - viewport.safeBottom - stationY + 20),
  };
  const treeSize = portrait ? 84 : 74;
  const memoryTree = {
    x: viewport.width / 2 - treeSize / 2,
    y: viewport.height - viewport.safeBottom - treeSize - (portrait ? 14 : 8),
    width: treeSize,
    height: treeSize,
  };
  return {
    header,
    mission,
    railArea,
    trainHome: {
      x: viewport.width / 2,
      y: memoryTree.y + memoryTree.height * 0.58,
    },
    memoryTree,
    stations,
  };
}

export function findExpressStationAt(
  layout: ExpressLayout,
  x: number,
  y: number,
): ExpressStationId | undefined {
  return EXPRESS_STATION_IDS.find((stationId) => contains(layout.stations[stationId], x, y));
}

function contains(bounds: Rect, x: number, y: number): boolean {
  return (
    x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
  );
}
