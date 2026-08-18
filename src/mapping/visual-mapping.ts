import type { PresentationCategory } from './element-mapping.js';

/** RGB triple, each channel 0-255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Default fill color per presentation category — confirmed against both reference fixtures. */
export const CATEGORY_FILL_COLOR: Readonly<Record<PresentationCategory, Rgb>> = {
  Strategy: { r: 245, g: 222, b: 170 },
  Business: { r: 255, g: 255, b: 181 },
  Application: { r: 181, g: 255, b: 255 },
  Technology: { r: 201, g: 231, b: 183 },
  Physical: { r: 201, g: 231, b: 183 },
  Motivation: { r: 204, g: 204, b: 255 },
  ImplementationMigration: { r: 255, g: 224, b: 224 },
  Location: { r: 237, g: 207, b: 226 },
  Grouping: { r: 255, g: 255, b: 255 },
};

/** Default fill for a visual Note (`ArchiMate:ViewGraphic`, no `mm_symbolName`). */
export const NOTE_FILL_COLOR: Rgb = { r: 255, g: 255, b: 255 };

/** Default fill for a visual Group (`ArchiMate:ViewGraphic` with `mm_symbolName="group"`). */
export const GROUP_FILL_COLOR: Rgb = { r: 210, g: 215, b: 215 };

/** Default node/connection line color — constant across every semantic node in both fixtures. */
export const DEFAULT_LINE_COLOR: Rgb = { r: 92, g: 92, b: 92 };

export const DEFAULT_FONT_NAME = 'Segoe UI';
/** `mm_fontSize` unit — confirmed 180 for Archi's default 9pt font (20 units/pt); never overridden without evidence. */
export const DEFAULT_FONT_SIZE = 180;
export const DEFAULT_OPACITY = 255;

/** `2147483647` (int32 max) — the sentinel width/height Bizzdesign uses for an auto-sized canvas rect. */
export const CANVAS_EXTENT = 2147483647;

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

/** Parses an Archi `fillColor`/`lineColor` hex string (e.g. "#ff0000") into RGB, or `null` if not a recognized hex triple. */
export function parseArchiHexColor(value: string): Rgb | null {
  const match = HEX_COLOR_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const hex = match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}
