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
}

function hasNesting(parentId: string | null, childrenIds: readonly string[]): boolean {
  return parentId !== null || childrenIds.length > 0;
}

/**
 * Builds the `AllView`'s `ViewGraphics` (Notes/Groups) and `RefObjects`
 * (the three-layer view-reference indirection — see module docs on
 * `graphical-writer.ts`) for the single supported view. Also validates
 * every diagram object/note/connection in the view, since geometry and view
 * membership are model-wide preservation guarantees, not just node drawing
 * concerns.
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

  for (const obj of model.diagramObjects) {
    if (obj.viewId !== view.id) {
      continue;
    }
    if (hasNesting(obj.parentId, obj.childrenIds)) {
      diagnostics.error({
        code: 'unsupported-nested-diagram-object',
        message: `Diagram object "${obj.id}" is nested (has a parent or children) — nested diagram objects are not supported in XMA v0.1.`,
        entityId: obj.id,
        entityType: 'ArchiDiagramObject',
      });
      continue;
    }
    if (obj.referencedModelId !== null) {
      diagnostics.error({
        code: 'unsupported-diagram-model-reference',
        message: `Diagram object "${obj.id}" is a view-reference (DiagramModelReference) — not supported in XMA v0.1.`,
        entityId: obj.id,
        entityType: 'ArchiDiagramObject',
      });
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

  return { viewGraphicsXml, refObjectsXml, validElementNodeObjectIds, validGroupObjectIds, validNoteIds };
}
