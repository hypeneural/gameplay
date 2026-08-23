import type { Analytics, AnalyticsEvent } from '../contracts/index.js';

export const noOpAnalytics: Analytics = {
  track(_event: AnalyticsEvent): void {
    return undefined;
  },
};
