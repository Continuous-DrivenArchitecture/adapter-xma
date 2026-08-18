import type { PresentationCategory } from './element-mapping.js';

/**
 * Semantic scheme container metadata, keyed by presentation category.
 *
 * Confirmed against both reference fixtures: every root-level scheme's `nm`
 * profile value is copied verbatim from the ArchiMate model's own top-level
 * folder of the matching `type` (e.g. `BusinessScheme`'s `nm` is folder
 * "Business"'s `name`) — this is content preservation, not invented
 * translation. `Technology`/`Physical` are the one exception: both nest
 * under a single "Technology & Physical" `AbstractFolder` (see
 * {@link TECHNOLOGY_PHYSICAL_FOLDER}) which itself carries that folder's
 * name, so the two schemes it wraps carry no `nm` of their own — confirmed
 * absent in the catalogue fixture.
 */
export interface SchemeInfo {
  tag: string;
  /** `ArchiFolder.type` this scheme's own `nm` is sourced from, or `null` when nested (see {@link TECHNOLOGY_PHYSICAL_FOLDER}). */
  folderType: string | null;
  /** Fallback label when the source model has no folder of `folderType` (Archi's own default folder name). */
  defaultLabel: string | null;
}

const STRATEGY: SchemeInfo = { tag: 'StrategyScheme', folderType: 'strategy', defaultLabel: 'Strategy' };
const BUSINESS: SchemeInfo = { tag: 'BusinessScheme', folderType: 'business', defaultLabel: 'Business' };
const APPLICATION: SchemeInfo = { tag: 'ApplicationScheme', folderType: 'application', defaultLabel: 'Application' };
const TECHNOLOGY: SchemeInfo = { tag: 'TechnologyScheme', folderType: null, defaultLabel: null };
const PHYSICAL: SchemeInfo = { tag: 'PhysicalScheme', folderType: null, defaultLabel: null };
const MOTIVATION: SchemeInfo = { tag: 'MotivationScheme', folderType: 'motivation', defaultLabel: 'Motivation' };
const IMPLEMENTATION_MIGRATION: SchemeInfo = {
  tag: 'IMScheme',
  folderType: 'implementation_migration',
  defaultLabel: 'Implementation & Migration',
};
const COMPOSITE: SchemeInfo = { tag: 'CompositeScheme', folderType: 'other', defaultLabel: 'Other' };

export const SCHEME_BY_CATEGORY: Readonly<Record<PresentationCategory, SchemeInfo>> = {
  Strategy: STRATEGY,
  Business: BUSINESS,
  Application: APPLICATION,
  Technology: TECHNOLOGY,
  Physical: PHYSICAL,
  Motivation: MOTIVATION,
  ImplementationMigration: IMPLEMENTATION_MIGRATION,
  Location: COMPOSITE,
  Grouping: COMPOSITE,
};

/**
 * The `AbstractFolder` wrapping `TechnologyScheme`/`PhysicalScheme` — the one
 * confirmed case of a scheme container nested under a folder rather than
 * sitting directly in the root `AbstractSchemes` collection (see the doc
 * block on {@link SchemeInfo}).
 */
export const TECHNOLOGY_PHYSICAL_FOLDER = {
  archiFolderType: 'technology',
  defaultLabel: 'Technology & Physical',
} as const;

/** The `AbstractFolder` wrapping the view's `AllView` — confirmed present in both reference fixtures. */
export const VIEWS_FOLDER = {
  archiFolderType: 'diagrams',
  defaultLabel: 'Views',
} as const;
