import type {
  ArchiModel,
  ArchiView,
  ArchiDiagramObject,
  ArchiNote,
  ArchiStyle,
  ArchiBounds,
} from '@cda/archi-semantic-core';
import { resolveAbsoluteBounds } from '@cda/archi-semantic-core';
import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element, textElement } from '../infrastructure/xml-writer.js';
import { XmaIdRegistry, type XmaIdAllocator } from '../infrastructure/id-allocator.js';
import { assertDefined } from '../infrastructure/assert.js';
import type { DiagnosticCollector } from '../diagnostics/diagnostics.js';
import type { ElementMappingEntry } from '../mapping/element-mapping.js';
import type { ResolvedRelationshipMapping } from './relationship-writer.js';
import { CATEGORY_FILL_COLOR, DEFAULT_FONT_NAME, DEFAULT_FONT_SIZE, DEFAULT_LINE_COLOR, DEFAULT_OPACITY, GROUP_FILL_COLOR, NOTE_FILL_COLOR, VIEW_REFERENCE_FILL_COLOR, CANVAS_EXTENT, parseArchiHexColor, type Rgb } from '../mapping/visual-mapping.js';
import { scaleRect, scalePoint, hasCompleteBounds, toRect, type Rect } from '../geometry/geometry.js';
import { resolveBendpoint } from '../geometry/bendpoints.js';
import type { ViewBuildResult } from './view-writer.js';

export interface GraphicalModuleResult {
  diagramXml: XmlElement;
}

/**
 * Converts a diagram object's/note's `bounds` into a `Rect`, re-checking
 * completeness explicitly rather than trusting it across the function
 * boundary from view-writer's earlier validation pass via an unchecked
 * cast. `bounds` is only ever incomplete here if that invariant is somehow
 * violated — in which case this reports the same `missing-bounds`
 * diagnostic view-writer would have, instead of emitting `NaN`/`null`
 * arithmetic into the output.
 */
function resolveDrawableBounds(
  bounds: ArchiBounds | null,
  diagnostics: DiagnosticCollector,
  entityId: string,
  entityType: string,
): Rect | null {
  if (!hasCompleteBounds(bounds)) {
    diagnostics.error({
      code: 'missing-bounds',
      message: `"${entityId}" has incomplete geometry (x/y/width/height) and cannot be positioned in XMA.`,
      entityId,
      entityType,
    });
    return null;
  }
  return toRect(bounds);
}

/**
 * Bendpoint offsets use the view's coordinate space. Nested Archi objects
 * store bounds relative to their visual parent, so this needs the object's
 * ABSOLUTE position (summed across every ancestor) for connection-point
 * resolution, while emitted node bounds elsewhere in this file stay local.
 *
 * The parent-chain walk itself is native Archi model semantics (how the
 * format nests bounds), not an XMA-specific concern — it lives in
 * `@cda/archi-semantic-core`'s `resolveAbsoluteBounds` so every consumer
 * gets the same resolution instead of reimplementing it. This is a thin
 * wrapper that only adds this package's own `missing-bounds` diagnostic,
 * since the core function is diagnostic-free (a plain `null` doesn't say
 * which entity in the chain was incomplete — good enough here, since the
 * object's own bounds already get their own precisely-attributed
 * `missing-bounds` diagnostic elsewhere in this file regardless of whether
 * it participates in a connection).
 *
 * Requires `@cda/archi-semantic-core` >= 0.5.0 (the first version to export
 * `resolveAbsoluteBounds`) — see this package's `peerDependencies`.
 */
function resolveAbsoluteDrawableBounds(model: ArchiModel, object: ArchiDiagramObject, diagnostics: DiagnosticCollector): Rect | null {
  const resolved = resolveAbsoluteBounds(model, object);
  if (resolved) return resolved;
  diagnostics.error({
    code: 'missing-bounds',
    message: `"${object.id}" has incomplete geometry (its own, or an ancestor's) and cannot be positioned in XMA.`,
    entityId: object.id,
    entityType: 'ArchiDiagramObject',
  });
  return null;
}

function colorElement(name: string | null, rgb: Rgb | null, id: number): XmlElement {
  const attrs: Array<[string, string]> = [['id', String(id)]];
  if (name !== null) {
    attrs.push(['name', name]);
  }
  // Only regular styled colors carry r/g/b; a bare default (e.g. relationship line color) omits them — confirmed shape.
  // A zero-valued channel is itself omitted rather than written as "0" —
  // confirmed against the sabsa fixture's one explicit connection lineColor
  // override (#ff0000): its MM_Color is `mm_r="255"` alone, g/b entirely
  // absent, not `mm_g="0" mm_b="0"`. Same omit-when-zero convention already
  // confirmed for bounds x/y in geometry.ts.
  if (rgb) {
    if (rgb.r !== 0) attrs.push(['mm_r', String(rgb.r)]);
    if (rgb.g !== 0) attrs.push(['mm_g', String(rgb.g)]);
    if (rgb.b !== 0) attrs.push(['mm_b', String(rgb.b)]);
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
  fontSize: number;
  fillOpacity: number;
  /** `mm_fontMode`: bold=1, italic=2, both=3 (a 2-bit mask), absent when neither is set. */
  fontMode: number | null;
  fontColor: Rgb | null;
}

/**
 * Resolves a node's effective fill/line/font, applying explicit Archi
 * styling only where mechanically lossless (a direct hex RGB copy, a
 * verbatim font-name substitution into the same structural slot, the
 * confirmed font-size formula, the confirmed `mm_fontMode` bold/italic
 * bitmask, or a font-color hex copy into the label decoration's own
 * `mm_lineColor`) — per v0.1 policy, everything else explicit (line width,
 * fill opacity/alpha) is diagnosed as an unsupported style override rather
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
  let fontSize = DEFAULT_FONT_SIZE;
  let fontMode: number | null = null;
  let fontColor: Rgb | null = null;
  // Never reassigned: alpha has zero fixture evidence, so it's diagnosed
  // (see below) rather than applied — fillOpacity always stays the default.
  const fillOpacity = DEFAULT_OPACITY;

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
      // Not applied: zero occurrences of an explicit `alpha` in any of the
      // four reference fixtures — no evidence for how (or whether) it maps
      // to `mm_fillOpacity`, so per v0.1 policy this is diagnosed like every
      // other unconfirmed style override, not guessed.
      diagnostics.warning({
        code: 'unsupported-style-alpha',
        message: 'Explicit fill opacity (alpha) has no confirmed XMA representation and was not applied (default used).',
        entityId,
        entityType,
      });
    }
    if (style.fontColor !== null) {
      const parsed = parseArchiHexColor(style.fontColor);
      if (parsed) {
        fontColor = parsed;
      } else {
        diagnostics.warning({
          code: 'unsupported-style-font-color',
          message: `Font color "${style.fontColor}" is not a recognized hex color and was not applied.`,
          entityId,
          entityType,
        });
      }
    }
    if (style.fontSize !== null) {
      // `mm_fontSize = floor(pt) * 20` — confirmed by both data points in
      // the agile-manifesto fixture: an 11.25pt override -> mm_fontSize=220,
      // a 14.25pt override -> mm_fontSize=280.
      fontSize = Math.floor(style.fontSize) * 20;
    }
    if (style.fontStyle !== null && (style.fontStyle.bold || style.fontStyle.italic)) {
      // Confirmed via a dedicated Enterprise Studio round-trip (3 isolated
      // elements: bold-only, italic-only, bold+italic together): mm_fontMode
      // is a 2-bit mask — bold=1, italic=2, both=3.
      fontMode = (style.fontStyle.bold ? 1 : 0) | (style.fontStyle.italic ? 2 : 0);
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

  return { fill, line, fontName, fontSize, fillOpacity, fontMode, fontColor };
}

function buildLabelDecoration(
  id: number,
  fontName: string,
  fontSize: number,
  fontMode: number | null,
  fontColor: Rgb | null,
  fontColorId: number | null,
  extraAttrs: Array<[string, string]> = [],
): XmlElement {
  const attrs: Array<[string, string]> = [
    ['id', String(id)],
    ['mm_fontSize', String(fontSize)],
    ['mm_graphicType', '2'],
    ['mm_concept', 'label'],
    ...extraAttrs,
  ];
  if (fontMode !== null) {
    attrs.push(['mm_fontMode', String(fontMode)]);
  }
  const children: XmlElement[] = [textElement('mm_font', fontName)];
  if (fontColor !== null && fontColorId !== null) {
    children.push(colorElement('mm_lineColor', fontColor, fontColorId));
  }
  return element('MM_Diagram:MM_Decoration', attrs, children);
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
  const labelDecorationId = ids.fresh();
  const fontColorId = visuals.fontColor !== null ? ids.fresh() : null;
  graphicsChildren.push(
    buildLabelDecoration(labelDecorationId, visuals.fontName, visuals.fontSize, visuals.fontMode, visuals.fontColor, fontColorId, labelExtraAttrs),
  );
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
 * A Junction carries no fill/line/font styling at all in either fixture
 * (see `buildJunctionNode`) — so unlike `resolveNodeVisuals`'s per-field
 * diagnostics for a regular node, any style override at all on a Junction
 * diagram object is unsupported. Previously this was discarded with no
 * indication anything was dropped.
 */
function reportUnsupportedJunctionStyle(obj: ArchiDiagramObject, diagnostics: DiagnosticCollector): void {
  const style = obj.style;
  if (!style) return;
  const hasOverride =
    style.fillColor !== null ||
    style.lineColor !== null ||
    style.fontColor !== null ||
    style.fontName !== null ||
    style.fontSize !== null ||
    style.lineWidth !== null ||
    style.alpha !== null ||
    (style.fontStyle !== null && (style.fontStyle.bold || style.fontStyle.italic));
  if (!hasOverride) return;
  diagnostics.warning({
    code: 'unsupported-style-junction',
    message: `Diagram object "${obj.id}" is a Junction with an explicit style override — Junctions have no confirmed styling representation in XMA (drawn with a fixed, colorless form) and the override was not applied.`,
    entityId: obj.id,
    entityType: 'ArchiDiagramObject',
  });
}

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
        buildLabelDecoration(ids.fresh(), DEFAULT_FONT_NAME, DEFAULT_FONT_SIZE, null, null, null),
      ]),
      rectElement(ids.fresh(), bounds),
    ],
  );
}

/**
 * Builds a `DiagramModelReference` ("insert view as reference") node —
 * confirmed against both instances in the agile-manifesto fixture:
 * `mm_graphicType="3"` (like Junction, not the usual `"5"`), but *unlike*
 * Junction it does carry an icon decoration and a fixed fill/line color
 * (`VIEW_REFERENCE_FILL_COLOR`/`DEFAULT_LINE_COLOR` — no `style` element on
 * either source object, so this is the construct's fixed default, not a
 * style-resolution result). `semanticObject` is the Ref id pointing at the
 * *referenced view's own* `ArchiMate:AllView` — see `view-writer.ts`.
 */
function buildViewReferenceNode(
  ids: XmaIdRegistry,
  nodeXmaId: number,
  semanticObject: number,
  bounds: Rect,
  nestedChildrenXml: XmlElement[] = [],
): XmlElement {
  return element(
    'MM_Diagram:MM_Node',
    [
      ['id', String(nodeXmaId)],
      ['mm_graphicType', '3'],
      ['mm_concept', 'AllView'],
      ['mm_lineOpacity', String(DEFAULT_OPACITY)],
      ['mm_fillOpacity', String(DEFAULT_OPACITY)],
      ['mm_semanticObject', String(semanticObject)],
    ],
    [
      element('MM_Diagram:MM_Graphics', [['name', 'mm_graphics'], ['id', String(ids.fresh())]], [
        buildIconDecoration(ids.fresh()),
        buildLabelDecoration(ids.fresh(), DEFAULT_FONT_NAME, DEFAULT_FONT_SIZE, null, null, null),
        ...nestedChildrenXml,
      ]),
      colorElement('mm_lineColor', DEFAULT_LINE_COLOR, ids.fresh()),
      element(
        'MM_Diagram:MM_Colors',
        [['name', 'mm_fillColors'], ['id', String(ids.fresh())]],
        [colorElement(null, VIEW_REFERENCE_FILL_COLOR, ids.fresh())],
      ),
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
 * metadata) are deliberately omitted — present on only a minority of
 * connections in three of the four fixtures (5/93 in agile-manifesto, 1/3
 * in relaciones, 15/346 in sabsa), never on all of them, which isn't
 * enough evidence to derive a general formula for which connections get
 * one or confirm they're mandatory for import (see project docs,
 * "unresolved reverse-engineering limitations"). If a future fixture
 * proves them required, add that behavior here, isolated from the rest of
 * this function.
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
   * Notes nested inside a diagram object (`note.parentId === obj.id`) —
   * confirmed against an independent reference model: 90 nested-Note instances
   * across two views, an exact 1:1 count match against the real XMA's
   * nested `ViewGraphic` nodes (unambiguous: neither source view has any
   * Group, which shares the same `ViewGraphic` concept, so every nested
   * `ViewGraphic` node found there had to be a Note). Structurally
   * identical to a top-level Note — see `buildNoteNode` below, shared by
   * both. `ArchiDiagramObject` has no `noteIds` field (only `childrenIds`,
   * for child diagram objects), so this index is built separately.
   */
  const noteIdsByParentId = new Map<string, string[]>();
  for (const note of model.notes) {
    if (note.parentId === null) continue;
    const siblings = noteIdsByParentId.get(note.parentId);
    if (siblings) siblings.push(note.id);
    else noteIdsByParentId.set(note.parentId, [note.id]);
  }

  function buildNoteNode(note: ArchiNote): XmlElement | null {
    const bounds = resolveDrawableBounds(note.bounds, diagnostics, note.id, 'ArchiNote');
    if (!bounds) return null;
    const noteSemanticId = assertDefined(ids.get(note.id), `no semantic id registered for note "${note.id}" (view-writer should have registered it before graphical-writer runs)`);
    const visuals = resolveNodeVisuals(note.style, NOTE_FILL_COLOR, diagnostics, note.id, 'ArchiNote');
    const nodeXmaId = nodeIds.idFor(note.id);
    return buildStyledNode(ids, nodeXmaId, 'ViewGraphic', noteSemanticId, false, visuals, bounds, null);
  }

  /**
   * Builds one diagram object's node, recursively building and nesting its
   * children first (bottom-up) — confirmed structure: a child `MM_Node`
   * nests as a sibling of its parent's icon/label decorations, inside the
   * same `MM_Graphics`, up to 3 levels deep in the sabsa fixture. Applies
   * equally to element-backed objects and Groups (both confirmed to nest
   * children this way), and to nested Notes (see `noteIdsByParentId`
   * above). Returns `null` for an object this pass can't draw (already
   * diagnosed elsewhere).
   */
  function buildNodeTree(objId: string, ancestorIds: ReadonlySet<string> = new Set()): XmlElement | null {
    const obj = diagramObjectById.get(objId);
    if (!obj) return null;

    if (ancestorIds.has(objId)) {
      diagnostics.error({
        code: 'cyclic-diagram-object-nesting',
        message: `Diagram object "${objId}" is its own descendant (a cyclic parent/child chain) and cannot be drawn.`,
        entityId: objId,
        entityType: 'ArchiDiagramObject',
      });
      return null;
    }
    const nextAncestorIds = new Set(ancestorIds).add(objId);

    const nestedChildrenXml = obj.childrenIds
      .map((childId) => buildNodeTree(childId, nextAncestorIds))
      .filter((xml): xml is XmlElement => xml !== null);
    for (const noteId of noteIdsByParentId.get(objId) ?? []) {
      if (!viewResult.validNoteIds.has(noteId)) continue;
      const note = noteById.get(noteId);
      if (!note) continue;
      const noteXml = buildNoteNode(note);
      if (noteXml) nestedChildrenXml.push(noteXml);
    }

    if (viewResult.validElementNodeObjectIds.has(objId) && obj.archimateElementId) {
      const mapping = assertDefined(mappedElements.get(obj.archimateElementId), `no mapping for element "${obj.archimateElementId}" (view-writer should have skipped diagram object "${obj.id}")`);
      const refId = assertDefined(refIds.get(obj.archimateElementId), `no ref id registered for element "${obj.archimateElementId}" (view-writer should have registered it before graphical-writer runs)`);
      const nodeXmaId = nodeIds.idFor(obj.id);
      const bounds = resolveDrawableBounds(obj.bounds, diagnostics, obj.id, 'ArchiDiagramObject');
      if (!bounds) return null;
      if (JUNCTION_XMA_TYPES.has(mapping.xmaType)) {
        reportUnsupportedJunctionStyle(obj, diagnostics);
        return buildJunctionNode(ids, nodeXmaId, mapping.xmaType, refId, bounds);
      }
      const visuals = resolveNodeVisuals(obj.style, CATEGORY_FILL_COLOR[mapping.category], diagnostics, obj.id, 'ArchiDiagramObject');
      return buildStyledNode(
        ids,
        nodeXmaId,
        mapping.xmaType,
        refId,
        mapping.hasIcon,
        visuals,
        bounds,
        null,
        [],
        nestedChildrenXml,
      );
    }

    if (viewResult.validGroupObjectIds.has(objId)) {
      const groupSemanticId = assertDefined(ids.get(obj.id), `no semantic id registered for group "${obj.id}" (view-writer should have registered it before graphical-writer runs)`);
      const visuals = resolveNodeVisuals(obj.style, GROUP_FILL_COLOR, diagnostics, obj.id, 'ArchiDiagramObject');
      const nodeXmaId = nodeIds.idFor(obj.id);
      const bounds = resolveDrawableBounds(obj.bounds, diagnostics, obj.id, 'ArchiDiagramObject');
      if (!bounds) return null;
      return buildStyledNode(
        ids,
        nodeXmaId,
        'ViewGraphic',
        groupSemanticId,
        false,
        visuals,
        bounds,
        'group',
        [['mm_frameStrategy', '12']],
        nestedChildrenXml,
      );
    }

    if (viewResult.validViewReferenceObjectIds.has(objId)) {
      if (obj.referencedModelId === null) {
        throw new Error(`Internal invariant violation: diagram object "${obj.id}" is in validViewReferenceObjectIds but has no referencedModelId.`);
      }
      const refId = assertDefined(refIds.get(obj.referencedModelId), `no ref id registered for referenced view "${obj.referencedModelId}" (view-writer should have registered it before graphical-writer runs)`);
      const nodeXmaId = nodeIds.idFor(obj.id);
      const bounds = resolveDrawableBounds(obj.bounds, diagnostics, obj.id, 'ArchiDiagramObject');
      if (!bounds) return null;
      return buildViewReferenceNode(ids, nodeXmaId, refId, bounds, nestedChildrenXml);
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
    if (!note || note.parentId !== null) continue; // nested notes are drawn via their parent's buildNodeTree instead
    const noteXml = buildNoteNode(note);
    if (noteXml) canvasChildren.push(noteXml);
  }

  const connectionById = new Map(model.diagramConnections.map((c) => [c.id, c]));
  for (const connId of view.diagramConnectionIds) {
    const connection = connectionById.get(connId);
    if (!connection || connection.viewId !== view.id) continue;
    const relId = connection.archimateRelationshipId;
    let xmaType: string;
    let semanticObjectId: number;
    if (relId) {
      const mapping = mappedRelationships.get(relId);
      if (!mapping) continue; // already diagnosed by relationship-writer
      xmaType = mapping.xmaType;
      semanticObjectId = assertDefined(refIds.get(relId), `no ref id registered for relationship "${relId}" (view-writer should have registered it before graphical-writer runs)`);
    } else {
      // A purely-visual connection (no underlying ArchiMate relationship) —
      // view-writer already resolved this to a ViewEdge if both endpoints
      // had a semantic id to reference; otherwise it already diagnosed the
      // unsupported-connection-no-relationship error, so there's nothing to
      // draw here.
      const viewEdgeSemanticId = viewResult.viewEdgeSemanticIds.get(connection.id);
      if (viewEdgeSemanticId === undefined) continue;
      xmaType = 'ViewEdge';
      semanticObjectId = viewEdgeSemanticId;
    }

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

    // A connection between a diagram object and its own visual parent is
    // already conveyed by the nesting itself — confirmed against both
    // fixtures: e.g. agile-manifesto's two BusinessProcessBusinessFunction-
    // Composition relations exist in the semantic Relations collection (so
    // they're still emitted below via relationship-writer/view-writer) but
    // have zero MM_DirectedRel graphics; sabsa's ElementGroupingComposition
    // (Grouping as target, not a nesting pair) is drawn normally while its
    // GroupingElementComposition (Grouping as source, always a nesting pair
    // in both fixtures) never is. Applies regardless of relationship type —
    // nesting evidence isn't type-specific, only "is this endpoint the
    // other's visual parent" is.
    if (sourceObj && targetObj && (sourceObj.parentId === targetObj.id || targetObj.parentId === sourceObj.id)) {
      continue;
    }

    const points: XmlElement[] = [];
    if (connection.bendpoints.length > 0 && sourceObj && targetObj && hasCompleteBounds(sourceObj.bounds) && hasCompleteBounds(targetObj.bounds)) {
      const sourceRect = resolveAbsoluteDrawableBounds(model, sourceObj, diagnostics);
      const targetRect = resolveAbsoluteDrawableBounds(model, targetObj, diagnostics);
      if (!sourceRect || !targetRect) continue;
      const sourceLocalRect = toRect(sourceObj.bounds);
      const targetLocalRect = toRect(targetObj.bounds);
      for (const bp of connection.bendpoints) {
        const localResolution = resolveBendpoint(bp, sourceLocalRect, targetLocalRect);
        const absoluteResolution = resolveBendpoint(bp, sourceRect, targetRect);
        if (!localResolution || !absoluteResolution) {
          // Genuinely unresolvable: EITHER the bendpoint has no usable
          // coordinate on either frame at all, or one entire frame is
          // completely absent while the other frame is itself only
          // partially specified (no confirmed resolution rule for that
          // combination — see resolveBendpoint's own doc comment). This is
          // narrower than it used to be: a bendpoint missing an entire axis
          // on BOTH frames (e.g. startY+endY only, no X anywhere) is no
          // longer unresolvable — see the `bendpoint-endpoint-mismatch`
          // branch below, which now also covers that case via the same
          // per-axis-default-then-average mechanism, confirmed against a
          // real BizzDesign round-trip (docs/relationship-mapping-backlog.md,
          // "Resolved: bendpoint disagreement arbitration"). For the
          // narrower cases that remain here, the single waypoint is skipped
          // rather than guessed — presentation-only loss on this connector,
          // made explicit. The reference sabsa export carries NO connector
          // line at all for its one such connection (semantic relation
          // ElementElementAssociation id=2324), so drawing the remaining
          // route straight is not less faithful than BizzDesign's own
          // output.
          diagnostics.warning({
            code: 'unresolvable-bendpoint',
            message: `Connection "${connection.id}" has a bendpoint with neither source- nor target-relative offsets set; skipped the waypoint and drew the connector without it.`,
            entityId: connection.id,
            entityType: 'ArchiDiagramConnection',
          });
          continue;
        }
        // Locally agreed offsets are valid in the normalized Archi export;
        // absolute coordinates are still used for the emitted XMA point --
        // EXCEPT for which specific point is used when there's a mismatch.
        // A mismatch present in absoluteResolution but ABSENT from
        // localResolution is not a genuine stored-data disagreement: it is
        // an artifact of resolving nested endpoints (with different
        // ancestor chains) to absolute canvas coordinates from otherwise
        // identical, locally-agreeing local bounds. Averaging two absolute
        // positions that only differ because they live under different
        // parents would produce a point unrelated to either shape's real
        // location, so that case keeps the pre-existing behavior (the
        // source-relative absolute point) rather than the new averaging
        // rule. A mismatch present in BOTH is a genuine disagreement in
        // Archi's own stored offsets (or a bendpoint missing an axis on
        // both frames), for which averaging is BizzDesign's own confirmed
        // behavior — see resolveBendpoint's doc comment.
        const resolution =
          absoluteResolution.mismatch && !localResolution.mismatch
            ? { ...absoluteResolution, point: absoluteResolution.mismatch.fromSource }
            : absoluteResolution;
        if (localResolution.mismatch && absoluteResolution.mismatch) {
          // Not a data-loss case: resolution.point (the averaged point,
          // used below regardless) is a perfectly usable point — this is
          // either a small precision disagreement in Archi's own stored
          // offsets, or a bendpoint missing an entire axis on both frames,
          // neither of which is a construct XMA has no representation for.
          // Warning, not an error that discards the whole document.
          // Averaging, not preferring either side, is BizzDesign's own
          // confirmed behavior — see resolveBendpoint's doc comment.
          diagnostics.warning({
            code: 'bendpoint-endpoint-mismatch',
            message: `Connection "${connection.id}" has a bendpoint whose source-relative and target-relative offsets disagree materially after absolute endpoint resolution (source: ${absoluteResolution.mismatch!.fromSource.x},${absoluteResolution.mismatch!.fromSource.y}; target: ${absoluteResolution.mismatch!.fromTarget.x},${absoluteResolution.mismatch!.fromTarget.y}); used the midpoint of the two.`,
            entityId: connection.id,
            entityType: 'ArchiDiagramConnection',
          });
        }
        const scaled = scalePoint(resolution.point);
        points.push(element('MM_Diagram:MM_Point', [['id', String(ids.fresh())], ['mm_x', String(scaled.x)], ['mm_y', String(scaled.y)]]));
      }
    }

    const directedRelChildren: XmlElement[] = [];
    if (points.length > 0) {
      directedRelChildren.push(element('MM_Diagram:MM_MultiLine', [['name', 'mm_line'], ['id', String(ids.fresh())]], points));
    }
    // Confirmed against the sabsa fixture's one explicit connection
    // lineColor override (#ff0000): the DirectedRel's MM_Color carries the
    // parsed RGB, in the exact same structural slot as a node's line color.
    let connectionLineColor: Rgb | null = null;
    if (connection.style?.lineColor) {
      const parsed = parseArchiHexColor(connection.style.lineColor);
      if (parsed) {
        connectionLineColor = parsed;
      } else {
        diagnostics.warning({
          code: 'unsupported-style-connection-line-color',
          message: `Connection line color "${connection.style.lineColor}" is not a recognized hex color and was not applied.`,
          entityId: connection.id,
          entityType: 'ArchiDiagramConnection',
        });
      }
    }
    directedRelChildren.push(
      element('MM_Diagram:MM_Graphics', [['name', 'mm_graphics'], ['id', String(ids.fresh())]], [
        buildLabelDecoration(ids.fresh(), DEFAULT_FONT_NAME, DEFAULT_FONT_SIZE, null, null, null),
      ]),
    );
    directedRelChildren.push(colorElement('mm_lineColor', connectionLineColor, ids.fresh()));

    canvasChildren.push(
      element(
        'MM_Diagram:MM_DirectedRel',
        [
          ['id', String(ids.fresh())],
          ['mm_from', String(sourceNodeXmaId)],
          ['mm_to', String(targetNodeXmaId)],
          ['mm_graphicType', '7'],
          ['mm_concept', xmaType],
          ['mm_semanticObject', String(semanticObjectId)],
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
