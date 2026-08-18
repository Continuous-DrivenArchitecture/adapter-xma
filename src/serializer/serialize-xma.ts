import type { ArchiModel, ArchiView } from '@cda/archi-semantic-core';
import { renderXmlDocument, type XmlElement } from '../infrastructure/xml-writer.js';
import { XmaIdAllocator, XmaIdRegistry } from '../infrastructure/id-allocator.js';
import { DiagnosticCollector, type XmaDiagnostic } from '../diagnostics/diagnostics.js';
import { XmaSerializationError } from '../diagnostics/errors.js';
import { buildSemanticElements } from './semantic-writer.js';
import { buildSemanticRelationships } from './relationship-writer.js';
import { buildView, type ViewBuildResult } from './view-writer.js';
import { buildGraphicalModule } from './graphical-writer.js';
import { buildXmaDocument } from './document-writer.js';

export interface XmaSerializeOptions {
  /** BCP-47-ish language code applied to every `xml:lang` and the default `MM_Language`. Defaults to `'en'`. Never inferred from content. */
  language?: string;
  /** The root `MM_ModelPackage`'s display name. Defaults to a neutral, deterministic placeholder (no machine/user identity is ever fabricated). */
  packageName?: string;
  /** The model's display name (used for both the `ArchiMateMM_Model` and root component profile values). Defaults to `model.metadata.name`. */
  modelName?: string;
}

const DEFAULT_PACKAGE_NAME = 'CDA XMA Package';

interface PlanResult {
  diagnostics: XmaDiagnostic[];
  documentXml: XmlElement | null;
}

function planXmaDocument(model: ArchiModel, options?: XmaSerializeOptions): PlanResult {
  const diagnostics = new DiagnosticCollector();
  const language = options?.language ?? 'en';
  const modelName = options?.modelName ?? model.metadata.name;
  const packageName = options?.packageName ?? DEFAULT_PACKAGE_NAME;

  const allocator = new XmaIdAllocator();
  const ids = new XmaIdRegistry(allocator);
  const refIds = new XmaIdRegistry(allocator);

  const { schemeBuilds, mappedElements } = buildSemanticElements(model, ids, diagnostics, language);

  const elementIndex = new Map(model.elements.map((e) => [e.id, e]));
  const relationshipIndex = new Map(model.relationships.map((r) => [r.id, r]));
  const mappedRelationships = buildSemanticRelationships(
    model,
    ids,
    elementIndex,
    relationshipIndex,
    mappedElements,
    schemeBuilds,
    diagnostics,
  );

  let view: ArchiView | null = null;
  let viewResult: ViewBuildResult | null = null;
  let graphicalDiagramXml: XmlElement | null = null;

  if (model.views.length > 1) {
    diagnostics.error({
      code: 'unsupported-multiple-views',
      message: `Model has ${model.views.length} views; XMA v0.1 supports serializing exactly one view. Split the model or remove extra views before converting.`,
    });
  } else if (model.views.length === 1) {
    view = model.views[0];
    viewResult = buildView(model, view, ids, refIds, mappedElements, mappedRelationships, diagnostics, language);
    const graphicalResult = buildGraphicalModule(
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
    graphicalDiagramXml = graphicalResult.diagramXml;
  }

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
    view,
    viewResult,
    graphicalDiagramXml,
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
