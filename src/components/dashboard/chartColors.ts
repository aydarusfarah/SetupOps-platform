import type { DeviceStatus, DeviceType } from '../../types';

/**
 * Chart series colours come from CSS custom properties (src/index.css), so
 * SVG fills switch with the light/dark theme without re-rendering.
 */
export const chartVar = (n: 1 | 2 | 3 | 4 | 5 | 6 | 7) => `var(--so-chart-${n})`;

export const STATUS_COLORS: Record<DeviceStatus, string> = {
  Eingang: chartVar(5),
  'In Arbeit': chartVar(1),
  Bereit: chartVar(2),
  Ausgegeben: chartVar(6),
  Defekt: chartVar(4),
  Entsorgt: chartVar(7),
};

export const TYPE_COLORS: Record<DeviceType, string> = {
  Laptop: chartVar(1),
  Desktop: chartVar(6),
  Monitor: chartVar(2),
  Sonstiges: chartVar(5),
};

export const AXIS_TICK = { fontSize: 11, fill: 'var(--so-fg-subtle)' } as const;
export const GRID_STROKE = 'var(--so-line-subtle)';
