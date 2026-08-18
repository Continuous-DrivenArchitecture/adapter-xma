import type {
  ArchiModel,
  ArchiView,
  ArchiDiagramObject,
  ArchiNote,
  ArchiStyle,
} from '@cda/archi-semantic-core';
import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element, textElement } from '../infrastructure/xml-writer.js';
import { XmaIdRegistry, type XmaIdAllocator } from '../infrastructure/id-allocator.js';
import type { DiagnosticCollector } from '../diagnostics/diagnostics.js';
import type { ElementMappingEntry } from '../mapping/element-mapping.js';
import type { ResolvedRelationshipMapping } from './relationship-writer.js';
import { CATEGORY_FILL_COLOR, DEFAULT_FONT_NAME, DEFAULT_FONT_SIZE, DEFAULT_LINE_COLOR, DEFAULT_OPACITY, GROUP_FILL_COLOR, NOTE_FILL_COLOR, CANVAS_EXTENT, parseArchiHexColor, type Rgb } from '../mapping/visual-mapping.js';
import { scaleRect, scalePoint, hasCompleteBounds, type Rect } from '../geometry/geometry.js';
import { resolveBendpoint } from '../geometry/bendpoints.js';
import type { ViewBuildResult } from './view-writer.js';

export interface GraphicalModuleResult {
  diagramXml: XmlElement;
}

function colorElement(name: string | null, rgb: Rgb | null, id: number): XmlElement {
  const attrs: Array<[string, string]> = [['id', String(id)]];
  if (name !== null) {
    attrs.push(['name', name]);
  }
  // Only regular styled colors carry r/g/b; a bare default (e.g. relationship line color) omits them — confirmed shape.
  if (rgb) {
    attrs.push(['mm_r', String(rgb.r)], ['mm_g', String(rgb.g)], ['mm_b', String(rgb.b)]);
  }
  return element('MM_Diagram:MM_Color', attrs);
}

function rectElement(id: number, rect: Rect): XmlElement {
  const scaled = scaleRect(rect);
  return element('MM_Rect', [
    ['name', 'mm_rect'],
    ['x', String(scaled.x)],
    ['y', String(scaled.y)],
    ['w', String(scaled.width)],
    ['h', String(scaled.height)],
  ]);
}

interface ResolvedVisuals {
  fill: Rgb;
  line: Rgb;
  fontName: string;
  fillOpacity: number;
}

/**
 * Resolves a node's effective fill/line/font, applying explicit Archi
 * styling only where mechanically lossless (a direct hex RGB copy, or a
 * verbatim font-name substitution into the same structural slot) — per
 * v0.1 policy, everything else explicit (font size, bold/italic, line
 * width, font color) is diagnosed as an unsupported style override rather
 * than guessed.
 */
function resolveNodeVisuals(
  style: ArchiStyle | null,
  defaultFill: Rgb,
  diagnostics: DiagnosticCollector,
  entityId: string,
  entityType: string,
): ResolvedVisuals {
  let fill = defaultFill;
  let line = DEFAULT_LINE_COLOR;
  let fontName = DEFAULT_FONT_NAME;
  let fillOpacity = DEFAULT_OPACITY;

  if (style) {
    if (style.fillColor !== null) {
      const parsed = parseArchiHexColor(style.fillColor);
      if (parsed) {
        fill = parsed;
      } else {
        diagnostics.warning({
          code: 'unsupported-style-fill-color',
          message: `Fill color "${style.fillColor}" is not a recognized hex color and was not applied.`,
          entityId,
          entityType,
        });
      }
    }
    if (style.lineColor !== null) {
      const parsed = parseArchiHexColor(style.lineColor);
      if (parsed) {
        line = parsed;
      } else {
        diagnostics.warning({
          code: 'unsupported-style-line-color',
          message: `Line color "${style.lineColor}" is not a recognized hex color and was not applied.`,
          entityId,
          entityType,
        });
      }
    }
    if (style.fontName !== null) {
      fontName = style.fontName;
    }
    if (style.alpha !== null) {
      fillOpacity = style.alpha;
    }
    if (style.fontColor !== null) {
      diagnostics.warning({
        code: 'unsupported-style-font-color',
        message: 'Explicit font color has no confirmed XMA representation and was not applied.',
        entityId,
        entityType,
      });
    }
    if (style.fontSize !== null) {
      diagnostics.warning({
        code: 'unsupported-style-font-size',
        message: 'Explicit font size has no confirmed XMA scaling formula and was not applied (default used).',
        entityId,
        entityType,
      });
    }
    if (style.fontStyle !== null && (style.fontStyle.bold || style.fontStyle.italic)) {
      diagnostics.warning({
        code: 'unsupported-style-font-style',
        message: 'Explicit bold/italic font style has no confirmed XMA representation and was not applied.',
        entityId,
        entityType,
      });
    }
    if (style.lineWidth !== null) {
      diagnostics.warning({
        code: 'unsupported-style-line-width',
        message: 'Explicit line width has no confirmed XMA representation and was not applied.',
        entityId,
        entityType,
      });
    }
  }

  return { fill, line, fontName, fillOpacity };
}

function buildLabelDecoration(id: number, fontName: string, extraAttrs: Array<[string, string]> = []): XmlElement {
  return element(
    'MM_Diagram:MM_Decoration',
    [['id', String(id)], ['mm_fontSize', String(DEFAULT_FONT_SIZE)], ['mm_graphicType', '2'], ['mm_concept', 'label'], ...extraAttrs],
    [textElement('mm_font', fontName)],
  );
}

function buildIconDecoration(id: number): XmlElement {
  return element('MM_Diagram:MM_Decoration', [
    ['id', String(id)],
    ['mm_graphicType', '2'],
    ['mm_concept', 'icon'],
  ]);
}

/**
 * Builds a fully-styled `MM_Node` for an element-backed diagram object, a
 * Group, or a Note/ViewGraphic. `nestedChildrenXml` are already-built child
 * `MM_Node`s (from nested diagram objects) — confirmed to nest as siblings
 * of the icon/label `MM_Decoration`s inside the same `MM_Graphics`, after
 * them, in both fixtures. Their `MM_Rect` bounds are used as-is (the same
 * ×3 scale as every other node) — confirmed to already be relative to the
 * parent in both Archi and XMA, so no offset math is needed.
 */
function buildStyledNode(
  ids: XmaIdRegistry,
  nodeXmaId: number,
  concept: string,
  semanticObject: number,
  hasIcon: boolean,
  visuals: ResolvedVisuals,
  bounds: Rect,
  symbolName: string | null,
  labelExtraAttrs: Array<[string, string]> = [],
  nestedChildrenXml: XmlElement[] = [],
): XmlElement {
  const graphicsChildren: XmlElement[] = [];
  if (hasIcon) {
    graphicsChildren.push(buildIconDecoration(ids.fresh()));
  }
  graphicsChildren.push(buildLabelDecoration(ids.fresh(), visuals.fontName, labelExtraAttrs));
  graphicsChildren.push(...nestedChildrenXml);

  const attrs: Array<[string, string]> = [
    ['id', String(nodeXmaId)],
    ['mm_graphicType', '5'],
    ['mm_concept', concept],
  ];
  if (symbolName) {
    attrs.push(['mm_symbolName', symbolName]);
  }
  attrs.push(
    ['mm_lineOpacity', String(DEFAULT_OPACITY)],
    ['mm_fillOpacity', String(visuals.fillOpacity)],
    ['mm_semanticObject', String(semanticObject)],
  );

  return element('MM_Diagram:MM_Node', attrs, [
    element('MM_Diagram:MM_Graphics', [['name', 'mm_graphics'], ['id', String(ids.fresh())]], graphicsChildren),
    colorElement('mm_lineColor', visuals.line, ids.fresh()),
    element(
      'MM_Diagram:MM_Colors',
      [['name', 'mm_fillColors'], ['id', String(ids.fresh())]],
      [colorElement(null, visuals.fill, ids.fresh())],
    ),
    rectElement(ids.fresh(), bounds),
  ]);
}

const JUNCTION_XMA_TYPES = new Set(['Junction', 'OrJunction']);

/**
 * Builds a `Junction`/`OrJunction` node — confirmed structurally different
 * from every other element node: `mm_graphicType="3"` (not `"5"`), and no
 * `MM_Color`/`MM_Colors` at all (a Junction carries no fill/line styling in
 * either fixture). Fabricating a color here would contradict that evidence,
 * not fill a gap in it.
 */
function buildJunctionNode(ids: XmaIdRegistry, nodeXmaId: number, concept: string, semanticObject: number, bounds: Rect): XmlElement {
  return element(
    'MM_Diagram:MM_Node',
    [
      ['id', String(nodeXmaId)],
      ['mm_graphicType', '3'],
      ['mm_concept', concept],
      ['mm_lineOpacity', String(DEFAULT_OPACITY)],
      ['mm_fillOpacity', String(DEFAULT_OPACITY)],
      ['mm_semanticObject', String(semanticObject)],
    ],
    [
      element('MM_Diagram:MM_Graphics', [['name', 'mm_graphics'], ['id', String(ids.fresh())]], [
        buildLabelDecoration(ids.fresh(), DEFAULT_FONT_NAME),
      ]),
      rectElement(ids.fresh(), bounds),
    ],
  );
}

/**
 * Builds the `GraphicalModule`'s `MM_Diagram` for one view: a Canvas node
 * wrapping one `MM_Node` per drawable diagram object/group/note (nested
 * diagram objects recursively nested inside their parent's `MM_Node`, via
 * `buildNodeTree` — see `tests/fixtures/README.md`, "Nested diagram
 * objects"), and one `MM_DirectedRel` per drawable connection.
 *
 * `mm_fromx`/`mm_fromy`/`mm_tox`/`mm_toy` (manual connector anchor
 * metadata) are deliberately omitted — exactly one fixture exhibited them,
 * which is not enough evidence to derive a general formula or confirm
 * they're mandatory for import (see project docs, "unresolved
 * reverse-engineering limitations"). If a future fixture proves them
 * required, add that behavior here, isolated from the rest of this
 * function.
 */
export function buildGraphicalModule(
  model: ArchiModel,
  view: ArchiView,
  ids: XmaIdRegistry,
  refIds: XmaIdRegistry,
  allocator: XmaIdAllocator,
  mappedElements: ReadonlyMap<string, ElementMappingEntry>,
  mappedRelationships: ReadonlyMap<string, ResolvedRelationshipMapping>,
  viewResult: ViewBuildResult,
  diagnostics: DiagnosticCollector,
): GraphicalModuleResult {
  const diagramObjectById = new Map<string, ArchiDiagramObject>(model.diagramObjects.map((o) => [o.id, o]));
  const noteById = new Map<string, ArchiNote>(model.notes.map((n) => [n.id, n]));
  const nodeIds = new XmaIdRegistry(allocator);

  const canvasChildren: XmlElement[] = [];

  /**
   * Builds one diagram object's node, recursively building and nesting its
   * children first (bottom-up) — confirmed structure: a child `MM_Node`
   * nests as a sibling of its parent's icon/label decorations, inside the
   * same `MM_Graphics`, up to 3 levels deep in the sabsa fixture. Applies
   * equally to element-backed objects and Groups (both confirmed to nest
   * children this way). Returns `null` for an object this pass can't draw
   * (already diagnosed elsewhere).
   */
  function buildNodeTree(objId: string): XmlElement | null {
    const obj = diagramObjectById.get(objId);
    if (!obj) return null;

    const nestedChildrenXml = obj.childrenIds
      .map((childId) => buildNodeTree(childId))
      .filter((xml): xml is XmlElement => xml !== null);

    if (viewResult.validElementNodeObjectIds.has(objId) && obj.archimateElementId) {
      const mapping = mappedElements.get(obj.archimateElementId)!;
      const refId = refIds.get(obj.archimateElementId)!;
      const nodeXmaId = nodeIds.idFor(obj.id);
      if (JUNCTION_XMA_TYPES.has(mapping.xmaType)) {
        return buildJunctionNode(ids, nodeXmaId, mapping.xmaType, refId, obj.bounds as Rect);
      }
      const visuals = resolveNodeVisuals(obj.style, CATEGORY_FILL_COLOR[mapping.category], diagnostics, obj.id, 'ArchiDiagramObject');
      return buildStyledNode(
        ids,
        nodeXmaId,
        mapping.xmaType,
        refId,
        mapping.hasIcon,
        visuals,
        obj.bounds as Rect,
        null,
        [],
        nestedChildrenXml,
      );
    }

    if (viewResult.validGroupObjectIds.has(objId)) {
      const groupSemanticId = ids.get(obj.id)!;
      const visuals = resolveNodeVisuals(obj.style, GROUP_FILL_COLOR, diagnostics, obj.id, 'ArchiDiagramObject');
      const nodeXmaId = nodeIds.idFor(obj.id);
      return buildStyledNode(
        ids,
        nodeXmaId,
        'ViewGraphic',
        groupSemanticId,
        false,
        visuals,
        obj.bounds as Rect,
        'group',
        [['mm_frameStrategy', '12']],
        nestedChildrenXml,
      );
    }

    return null;
  }

  for (const objId of view.diagramObjectIds) {
    const nodeXml = buildNodeTree(objId);
    if (nodeXml) canvasChildren.push(nodeXml);
  }

  for (const noteId of view.noteIds) {
    if (!viewResult.validNoteIds.has(noteId)) continue;
    const note = noteById.get(noteId);
    if (!note) continue;
    const noteSemanticId = ids.get(note.id)!;
    const visuals = resolveNodeVisuals(note.style, NOTE_FILL_COLOR, diagnostics, note.id, 'ArchiNote');
    const nodeXmaId = nodeIds.idFor(note.id);
    canvasChildren.push(
      buildStyledNode(ids, nodeXmaId, 'ViewGraphic', noteSemanticId, false, visuals, note.bounds as Rect, null),
    );
  }

  const connectionById = new Map(model.diagramConnections.map((c) => [c.id, c]));
  for (const connId of view.diagramConnectionIds) {
    const connection = connectionById.get(connId);
    if (!connection || connection.viewId !== view.id) continue;
    const relId = connection.archimateRelationshipId;
    if (!relId) continue; // already diagnosed by view-writer
    const mapping = mappedRelationships.get(relId);
    if (!mapping) continue; // already diagnosed by relationship-writer

    const sourceNodeXmaId = nodeIds.get(connection.sourceId);
    const targetNodeXmaId = nodeIds.get(connection.targetId);
    if (sourceNodeXmaId === undefined || targetNodeXmaId === undefined) {
      diagnostics.error({
        code: 'unsupported-connection-invalid-endpoint',
        message: `Connection "${connection.id}" has a source/target diagram object that was not drawable.`,
        entityId: connection.id,
        entityType: 'ArchiDiagramConnection',
      });
      continue;
    }

    const sourceObj = diagramObjectById.get(connection.sourceId);
    const targetObj = diagramObjectById.get(connection.targetId);
    const points: XmlElement[] = [];
    if (connection.bendpoints.length > 0 && sourceObj && targetObj && hasCompleteBounds(sourceObj.bounds) && hasCompleteBounds(targetObj.bounds)) {
      for (const bp of connection.bendpoints) {
        const resolution = resolveBendpoint(bp, sourceObj.bounds, targetObj.bounds);
        if (!resolution) {
          diagnostics.error({
            code: 'unresolvable-bendpoint',
            message: `Connection "${connection.id}" has a bendpoint with neither source- nor target-relative offsets set.`,
            entityId: connection.id,
            entityType: 'ArchiDiagramConnection',
          });
          continue;
        }
        if (resolution.mismatch) {
          // Not a data-loss case: resolution.point (the source-relative form,
          // used below regardless) is a perfectly usable point — this is a
          // small precision disagreement in Archi's own stored offsets, not a
          // construct XMA has no representation for. Warning, not an error
          // that discards the whole document.
          diagnostics.warning({
            code: 'bendpoint-endpoint-mismatch',
            message: `Connection "${connection.id}" has a bendpoint whose source-relative and target-relative offsets disagree materially (source: ${resolution.mismatch.fromSource.x},${resolution.mismatch.fromSource.y}; target: ${resolution.mismatch.fromTarget.x},${resolution.mismatch.fromTarget.y}); used the source-relative point.`,
            entityId: connection.id,
            entityType: 'ArchiDiagramConnection',
          });
        }
        const scaled = scalePoint(resolution.point);
        points.push(element('MM_Diagram:MM_Point', [['id', String(ids.fresh())], ['mm_x', String(scaled.x)], ['mm_y', String(scaled.y)]]));
      }
    }

    const relRefId = refIds.get(relId)!;
    const directedRelChildren: XmlElement[] = [];
    if (points.length > 0) {
      directedRelChildren.push(element('MM_Diagram:MM_MultiLine', [['name', 'mm_line'], ['id', String(ids.fresh())]], points));
    }
    if (connection.style?.lineColor) {
      diagnostics.warning({
        code: 'unsupported-style-connection-line-color',
        message: 'Explicit connection line color has no confirmed XMA representation and was not applied.',
        entityId: connection.id,
        entityType: 'ArchiDiagramConnection',
      });
    }
    directedRelChildren.push(
      element('MM_Diagram:MM_Graphics', [['name', 'mm_graphics'], ['id', String(ids.fresh())]], [
        buildLabelDecoration(ids.fresh(), DEFAULT_FONT_NAME),
      ]),
    );
    directedRelChildren.push(colorElement('mm_lineColor', null, ids.fresh()));

    canvasChildren.push(
      element(
        'MM_Diagram:MM_DirectedRel',
        [
          ['id', String(ids.fresh())],
          ['mm_from', String(sourceNodeXmaId)],
          ['mm_to', String(targetNodeXmaId)],
          ['mm_graphicType', '7'],
          ['mm_concept', mapping.xmaType],
          ['mm_semanticObject', String(relRefId)],
        ],
        directedRelChildren,
      ),
    );
  }

  const canvasSemanticId = ids.idFor(view.id);
  const canvasNode = element(
    'MM_Diagram:MM_Node',
    [
      ['name', 'mm_canvas'],
      ['id', String(ids.fresh())],
      ['mm_graphicType', '5'],
      ['mm_concept', 'Canvas'],
      ['mm_semanticObject', String(canvasSemanticId)],
    ],
    [
      element('MM_Diagram:MM_Graphics', [['name', 'mm_graphics'], ['id', String(ids.fresh())]], canvasChildren),
      element('MM_Rect', [
        ['name', 'mm_rect'],
        ['x', '0'],
        ['y', '0'],
        ['w', String(CANVAS_EXTENT)],
        ['h', String(CANVAS_EXTENT)],
      ]),
    ],
  );

  const diagramXml = element('MM_Diagram:MM_Diagram', [['name', 'root'], ['id', String(ids.fresh())]], [canvasNode]);

  return { diagramXml };
}
