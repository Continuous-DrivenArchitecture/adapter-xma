import type { ArchiModel } from '@cda/archi-semantic-core';
import { renderXmlDocument, type XmlElement } from '../infrastructure/xml-writer.js';
import { XmaIdAllocator, XmaIdRegistry } from '../infrastructure/id-allocator.js';
import { DiagnosticCollector, type XmaDiagnostic } from '../diagnostics/diagnostics.js';
import { XmaSerializationError } from '../diagnostics/errors.js';
import { buildSemanticElements } from './semantic-writer.js';
import { buildSemanticRelationships } from './relationship-writer.js';
import { buildView } from './view-writer.js';
import { buildGraphicalModule } from './graphical-writer.js';
import { buildXmaDocument, type BuiltView } from './document-writer.js';

export interface XmaSerializeOptions {
  /** BCP-47-ish language code applied to every `xml:lang` and the default `MM_Language`. Defaults to `'en'`. Never inferred from content. */
  language?: string;
  /** The root `MM_ModelPackage`'s display name. Defaults to a neutral, deterministic placeholder (no machine/user identity is ever fabricated). */
  packageName?: string;
  /** The model's display name (used for both the `ArchiMateMM_Model` and root component profile values). Defaults to `model.metadata.name`. */
  modelName?: string;
}

const DEFAULT_PACKAGE_NAME = 'CDA XMA Package';

const REQUIRED_MODEL_ARRAY_FIELDS = [
  'elements',
  'relationships',
  'views',
  'diagramObjects',
  'diagramConnections',
  'notes',
  'folders',
] as const;

/**
 * `ArchiModel`'s shape is only enforced by TypeScript at compile time. A
 * caller passing `null`/`undefined`, or an object missing a collection,
 * would otherwise hit the first `.map()`/`.filter()` deep inside a writer
 * and get a raw `Cannot read properties of undefined` — not an actionable
 * error for a public library API. This is a caller-contract violation, not
 * a "construct XMA can't represent" diagnostic, so it throws directly
 * instead of going through `DiagnosticCollector`/`XmaSerializationError`.
 */
function assertValidModelShape(model: ArchiModel): void {
  if (typeof model !== 'object' || model === null) {
    throw new TypeError(`serializeXma: expected an ArchiModel object, got ${model === null ? 'null' : typeof model}.`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null) {
    throw new TypeError('serializeXma: model.metadata is missing or invalid — expected an ArchiModel.');
  }
  for (const field of REQUIRED_MODEL_ARRAY_FIELDS) {
    if (!Array.isArray(model[field])) {
      throw new TypeError(`serializeXma: model.${field} is missing or not an array — expected an ArchiModel.`);
    }
  }
}

interface PlanResult {
  diagnostics: XmaDiagnostic[];
  documentXml: XmlElement | null;
}

function planXmaDocument(model: ArchiModel, options?: XmaSerializeOptions): PlanResult {
  assertValidModelShape(model);
  const diagnostics = new DiagnosticCollector();
  const language = options?.language ?? 'en';
  const modelName = options?.modelName ?? model.metadata.name;
  const packageName = options?.packageName ?? DEFAULT_PACKAGE_NAME;

  const allocator = new XmaIdAllocator();
  const ids = new XmaIdRegistry(allocator);

  const { schemeBuilds, mappedElements, rootConnectorsXml } = buildSemanticElements(model, ids, diagnostics, language);

  const elementIndex = new Map(model.elements.map((e) => [e.id, e]));
  const relationshipIndex = new Map(model.relationships.map((r) => [r.id, r]));
  const { mappedRelationships, rootRelationsXml } = buildSemanticRelationships(
    model,
    ids,
    elementIndex,
    relationshipIndex,
    mappedElements,
    schemeBuilds,
    diagnostics,
  );

  const builtViews: BuiltView[] = model.views.map((view) => {
    // A fresh RefObjects registry per view — confirmed against the sabsa
    // fixture (38 views): each `AllView`'s `RefObjects` is self-contained,
    // so an element referenced from multiple views gets its own ref id in
    // each one (840 total Ref elements for 735 distinct semantic targets in
    // sabsa.xma, never a ref id reused across two views). A shared registry
    // would leave every view after the first missing Ref entries for
    // elements first seen in an earlier view.
    const refIds = new XmaIdRegistry(allocator);
    const viewResult = buildView(model, view, ids, refIds, mappedElements, mappedRelationships, diagnostics, language);
    const { diagramXml } = buildGraphicalModule(
      model,
      view,
      ids,
      refIds,
      allocator,
      mappedElements,
      mappedRelationships,
      viewResult,
      diagnostics,
    );
    return { view, viewResult, graphicalDiagramXml: diagramXml };
  });

  if (diagnostics.hasErrors) {
    return { diagnostics: diagnostics.all, documentXml: null };
  }

  const documentXml = buildXmaDocument({
    modelName,
    packageName,
    language,
    ids,
    schemeBuilds,
    folders: model.folders,
    views: builtViews,
    rootConnectorsXml,
    rootRelationsXml,
  });

  return { diagnostics: diagnostics.all, documentXml };
}

/**
 * Serializes an `ArchiModel` (from `@cda/archi-semantic-core`) into an XMA
 * document string.
 *
 * Strict by default: if any construct in the model would be silently lost
 * (an unsupported element/relationship type, a second view, incomplete
 * geometry, ...) this throws `XmaSerializationError` carrying the full
 * structured diagnostic list, rather than producing an approximate or
 * partial XMA document. Use `inspectXmaSupport` to preview what would be
 * unsupported without throwing.
 */
export function serializeXma(model: ArchiModel, options?: XmaSerializeOptions): string {
  const { diagnostics, documentXml } = planXmaDocument(model, options);
  if (documentXml === null) {
    throw new XmaSerializationError(diagnostics);
  }
  return renderXmlDocument(documentXml);
}

/**
 * Non-mutating diagnostic pass: reports every construct in `model` that
 * `serializeXma` would refuse to convert, without throwing and without
 * requiring the model to be fully convertible.
 */
export function inspectXmaSupport(model: ArchiModel, options?: XmaSerializeOptions): XmaDiagnostic[] {
  return planXmaDocument(model, options).diagnostics;
}
