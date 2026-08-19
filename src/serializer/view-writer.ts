import type { ArchiModel, ArchiView } from '@cda/archi-semantic-core';
import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element } from '../infrastructure/xml-writer.js';
import type { XmaIdRegistry } from '../infrastructure/id-allocator.js';
import type { DiagnosticCollector } from '../diagnostics/diagnostics.js';
import type { ElementMappingEntry } from '../mapping/element-mapping.js';
import type { ResolvedRelationshipMapping } from './relationship-writer.js';
import { buildProfileValues } from './profile-values.js';
import { hasCompleteBounds } from '../geometry/geometry.js';

export interface ViewBuildResult {
  viewGraphicsXml: XmlElement[];
  refObjectsXml: XmlElement[];
  /** Ids of diagram objects that passed validation and should be drawn (element-backed nodes only). */
  validElementNodeObjectIds: Set<string>;
  /** Ids of Group diagram objects that passed validation and should be drawn. */
  validGroupObjectIds: Set<string>;
  /** Ids of notes that passed validation and should be drawn. */
  validNoteIds: Set<string>;
  /** Ids of DiagramModelReference objects that passed validation and should be drawn. */
  validViewReferenceObjectIds: Set<string>;
}

/**
 * Builds one `AllView`'s `ViewGraphics` (Notes/Groups) and `RefObjects`
 * (the three-layer view-reference indirection — see module docs on
 * `graphical-writer.ts`). Also validates every diagram object/note/connection
 * in the view, since geometry and view membership are model-wide
 * preservation guarantees, not just node drawing concerns. Nested diagram
 * objects (a `parentId` or non-empty `childrenIds`) are valid here — see
 * `graphical-writer.ts`'s recursive node building for how nesting is drawn.
 */
export function buildView(
  model: ArchiModel,
  view: ArchiView,
  ids: XmaIdRegistry,
  refIds: XmaIdRegistry,
  mappedElements: ReadonlyMap<string, ElementMappingEntry>,
  mappedRelationships: ReadonlyMap<string, ResolvedRelationshipMapping>,
  diagnostics: DiagnosticCollector,
  language: string,
): ViewBuildResult {
  const viewGraphicsXml: XmlElement[] = [];
  const refObjectsXml: XmlElement[] = [];
  const validElementNodeObjectIds = new Set<string>();
  const validGroupObjectIds = new Set<string>();
  const validNoteIds = new Set<string>();
  const validViewReferenceObjectIds = new Set<string>();
  const viewIds = new Set(model.views.map((v) => v.id));

  for (const obj of model.diagramObjects) {
    if (obj.viewId !== view.id) {
      continue;
    }
    if (obj.referencedModelId !== null) {
      // Corrected finding: an earlier version of this comment claimed "no
      // trace whatsoever" of a DiagramModelReference in the real XMA export,
      // based on grepping for Archi's own string id — which can never match
      // anything, since XMA never reuses Archi's ids (see id-allocator.ts).
      // That verification method was broken, not the underlying claim.
      // Re-verified directly against agile-manifesto.xma: both
      // DiagramModelReference objects there ARE drawn, as an
      // `mm_concept="AllView"`/`mm_graphicType="3"` node whose
      // `mm_semanticObject` resolves — via an `ArchiMate:AllViewRef`, the
      // same Ref-layer indirection used for every other element/relationship
      // — to the *referenced view's own* `ArchiMate:AllView` id (no new
      // semantic concept is minted for the reference itself). See
      // `graphical-writer.ts`'s `buildViewReferenceNode`.
      //
      // This only resolves when the reference targets another `ArchiView` in
      // *this* model. `referencedModelId` can also point at a Sketch/Canvas
      // view (per `archi-semantic-core`'s docs on the field) — archi-mate has
      // no XMA representation at all, so that case remains genuinely
      // unsupported.
      if (!hasCompleteBounds(obj.bounds)) {
        diagnostics.error({
          code: 'missing-bounds',
          message: `Diagram object "${obj.id}" has incomplete geometry (x/y/width/height) and cannot be positioned in XMA.`,
          entityId: obj.id,
          entityType: 'ArchiDiagramObject',
        });
        continue;
      }
      if (!viewIds.has(obj.referencedModelId)) {
        diagnostics.warning({
          code: 'unsupported-diagram-model-reference',
          message: `Diagram object "${obj.id}" references a view/model ("${obj.referencedModelId}") not among this model's own ArchiMate views (e.g. a Sketch/Canvas) — not representable in XMA and was omitted.`,
          entityId: obj.id,
          entityType: 'ArchiDiagramObject',
        });
        continue;
      }
      if (!refIds.has(obj.referencedModelId)) {
        const refId = refIds.idFor(obj.referencedModelId);
        refObjectsXml.push(
          element('ArchiMate:AllViewRef', [
            ['id', String(refId)],
            ['to', String(ids.idFor(obj.referencedModelId))],
          ]),
        );
      }
      validViewReferenceObjectIds.add(obj.id);
      continue;
    }

    if (obj.archimateElementId === null) {
      if (obj.xsiType !== 'archimate:Group') {
        diagnostics.error({
          code: 'unsupported-diagram-object',
          message: `Diagram object "${obj.id}" (${obj.xsiType}) has no backing semantic element and is not a recognized Group — not supported in XMA v0.1.`,
          entityId: obj.id,
          entityType: 'ArchiDiagramObject',
        });
        continue;
      }
      if (!hasCompleteBounds(obj.bounds)) {
        diagnostics.error({
          code: 'missing-bounds',
          message: `Group "${obj.id}" has incomplete geometry (x/y/width/height) and cannot be positioned in XMA.`,
          entityId: obj.id,
          entityType: 'ArchiDiagramObject',
        });
        continue;
      }
      const groupXmaId = ids.idFor(obj.id);
      viewGraphicsXml.push(
        element('ArchiMate:ViewGraphic', [['id', String(groupXmaId)]], [
          buildProfileValues(language, obj.name ?? '', obj.documentation),
        ]),
      );
      validGroupObjectIds.add(obj.id);
      continue;
    }

    // Element-backed diagram object.
    if (!hasCompleteBounds(obj.bounds)) {
      diagnostics.error({
        code: 'missing-bounds',
        message: `Diagram object "${obj.id}" has incomplete geometry (x/y/width/height) and cannot be positioned in XMA.`,
        entityId: obj.id,
        entityType: 'ArchiDiagramObject',
      });
      continue;
    }
    const mapping = mappedElements.get(obj.archimateElementId);
    if (!mapping) {
      // The backing element already produced an unsupported-element-type diagnostic.
      continue;
    }
    if (!refIds.has(obj.archimateElementId)) {
      const refId = refIds.idFor(obj.archimateElementId);
      refObjectsXml.push(
        element(`ArchiMate:${mapping.xmaType}Ref`, [
          ['id', String(refId)],
          ['to', String(ids.idFor(obj.archimateElementId))],
        ]),
      );
    }
    validElementNodeObjectIds.add(obj.id);
  }

  for (const note of model.notes) {
    if (note.viewId !== view.id) {
      continue;
    }
    if (note.parentId !== null) {
      // Unlike nested ArchiDiagramObjects (supported — see graphical-writer.ts's
      // buildNodeTree), a nested Note has no fixture evidence: only one instance
      // exists across all four fixtures, not enough to confirm its representation.
      diagnostics.error({
        code: 'unsupported-nested-diagram-object',
        message: `Note "${note.id}" is nested inside another diagram object — not supported in XMA v0.1.`,
        entityId: note.id,
        entityType: 'ArchiNote',
      });
      continue;
    }
    if (!hasCompleteBounds(note.bounds)) {
      diagnostics.error({
        code: 'missing-bounds',
        message: `Note "${note.id}" has incomplete geometry (x/y/width/height) and cannot be positioned in XMA.`,
        entityId: note.id,
        entityType: 'ArchiNote',
      });
      continue;
    }
    const noteXmaId = ids.idFor(note.id);
    viewGraphicsXml.push(
      element('ArchiMate:ViewGraphic', [['id', String(noteXmaId)]], [buildProfileValues(language, note.content ?? '')]),
    );
    validNoteIds.add(note.id);
  }

  for (const connection of model.diagramConnections) {
    if (connection.viewId !== view.id) {
      continue;
    }
    if (connection.archimateRelationshipId === null) {
      diagnostics.error({
        code: 'unsupported-connection-no-relationship',
        message: `Connection "${connection.id}" has no underlying semantic relationship (a purely visual connector) — not supported in XMA v0.1.`,
        entityId: connection.id,
        entityType: 'ArchiDiagramConnection',
      });
      continue;
    }
    const mapping = mappedRelationships.get(connection.archimateRelationshipId);
    if (!mapping) {
      // The underlying relationship already produced its own diagnostic.
      continue;
    }
    if (!refIds.has(connection.archimateRelationshipId)) {
      const refId = refIds.idFor(connection.archimateRelationshipId);
      refObjectsXml.push(
        element(`ArchiMate:${mapping.xmaType}Ref`, [
          ['id', String(refId)],
          ['to', String(ids.idFor(connection.archimateRelationshipId))],
        ]),
      );
    }
  }

  return { viewGraphicsXml, refObjectsXml, validElementNodeObjectIds, validGroupObjectIds, validNoteIds, validViewReferenceObjectIds };
}
