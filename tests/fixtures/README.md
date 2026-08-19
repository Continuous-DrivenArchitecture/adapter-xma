# Reference fixtures

These are the immutable, empirically-paired `.archimate` / `.xma` fixture
sets this library's mapping tables were reverse-engineered from. **Do not
edit their contents** — tests assert against them as ground truth.

## `catalog/` — `catalogo.archimate` / `catalogo.xma`

All 60 confirmed ArchiMate concept types, one view, a Note and a Group, and
per-category default visual styling (fill colors, icon decoration presence).
This is the source of truth for `src/mapping/element-mapping.ts` and
`src/mapping/scheme-mapping.ts`.

## `relationships/` — `relaciones.archimate` / `relaciones.xma`

The three original confirmed semantic relationship mappings (Assignment,
Serving→Use, Flow), their graphical `MM_DirectedRel` representation, and one
manually routed connection with a bendpoint. This is the source of truth for
`src/geometry/bendpoints.ts`, and (jointly with `sabsa/` and
`agile-manifesto/`, below) for `src/mapping/relationship-mapping.ts`.

## `sabsa/` — `sabsa.archimate` / `sabsa.xma`

A large, real-world model (SABSA framework: 463 elements, 551 relationships,
38 views), contributed by the project maintainer specifically to expand
relationship-mapping coverage beyond the original three. Confirmed **64
additional** relationship mappings, using the method below. `sabsa.archimate`
is stored decompressed (Archi's zip-archive variant, decoded once with
`extractArchiModelXml`), matching the plain-XML convention of the other
fixture pairs.

## `agile-manifesto/` — `agile-manifesto.archimate` / `agile-manifesto.xma`

A second real-world model (73 elements, 104 relationships, 3 views),
contributed by the project maintainer after `sabsa/`. Confirmed **20 more**
exact-triple relationship mappings using the same method — including the
first confirmed mappings with a `Driver` endpoint — plus independent
confirmation of the `...Collaboration`-collapse pattern (see "Generic and
collapsed forms" below) and the evidence for `Junction`/`OrJunction` and
multi-view support (both also below). Running exact-triple total: **90**
(87 + 3 confirmed `...Collaboration`-collapse entries), up from the
original 3.

### Derivation method (exact-triple mappings)

Unlike `relaciones.xma` (3 relationships, checked by hand), SABSA's 551
relationships made manual cross-referencing impractical, and — critically —
**the XMA output preserves no reference back to the source `.archimate`
GUIDs at all** (confirmed by inspecting `relaciones.xma`: every id is a
tool-assigned sequential integer, with no comment, property, or attribute
tying it back to the source element). Correlation was done by structural
inference instead of GUID lookup:

1. Parse `sabsa.archimate` and count occurrences of every distinct
   `(relationshipType, sourceType, targetType)` triple.
2. Parse `sabsa.xma` generically (not through this package's own serializer —
   that would be circular) and, for every `<ArchiMate:{Tag} id="X" from="Y"
   to="Z"/>` relation instance, resolve `Y` and `Z` to their enclosing
   element's own tag name (e.g. `<ArchiMate:MotivationPrinciple id="40">` →
   id `40` is type `MotivationPrinciple`).
3. For each archi triple, compute the **expected** XMA tag as
   `ELEMENT_MAPPINGS[sourceType].xmaType + ELEMENT_MAPPINGS[targetType].xmaType
   + verb`, using `src/mapping/element-mapping.ts` (already confirmed ground
   truth from the `catalog/` fixture) for the type names, and a verb derived
   from the 3 already-confirmed relationships (`Assignment`, `Access`,
   `Realisation` — note the British spelling — `Flow`, `Triggering`,
   `Influence`, `Specialization`, `Composition`, `Use`).
4. Accept the triple as confirmed **only if** the expected tag's actual
   occurrence count in the XMA matches the archi-side count exactly. Any
   mismatch (wrong count, or the tag simply absent) was excluded and treated
   as an open question (see below), never guessed into the mapping table.

This yielded 87 exact-triple matches across the two fixtures (3 already
known, re-confirmed independently, plus 64 from `sabsa/` and 20 from
`agile-manifesto/`).

### Generic and collapsed forms — implemented in `generic-relationship-mapping.ts`

The exact-triple lookup in `relationship-mapping.ts` can't represent
type-independent rules. Three such patterns were confirmed and are now
implemented, each in its own function/module so the "never guess" boundary
stays explicit about which claims are backed by which evidence:

1. **`AssociationRelationship` is type-independent** — confirmed across
   dozens of distinct source/target type combinations in both fixtures,
   every single instance serializes as the same generic
   `ElementElementAssociation` tag, never a type-specific one. Implemented in
   `lookupGenericRelationshipMapping`.
2. **A `Grouping` or `Junction`/`OrJunction` endpoint collapses the
   relationship type to a generic form** instead of the type-specific tag
   either endpoint would otherwise produce:
   - `Grouping`: `{Grouping|Element}{Grouping|Element}{Verb}` (e.g.
     `GroupingElementComposition`), confirmed for the verbs Composition,
     Specialization, Influence, Use (Serving) — deliberately *not* extended
     to Assignment/Access/Realization/Flow/Triggering, which have no
     `Grouping`-endpoint evidence in either fixture.
   - `Junction`/`OrJunction`: `{Verb}Relation` (e.g. `RealisationRelation`),
     confirmed for the verbs Realisation and Influence (two fixtures, two
     verbs, same pattern — see "Junction element and Connectors container"
     below) — same rule, not extended past those two verbs without evidence.
   - **Correction (found after initial implementation shipped a real bug):**
     both forms are **not** confined to a root-level container. Every
     relation — exact-triple or generic — is appended to its **source
     element's own scheme's** `<ArchiMate:Relations>` collection; only a
     `Junction`/`OrJunction` source (which has no scheme) falls back to the
     root-level `<ArchiMate:Relations>` (a sibling of `AbstractSchemes`).
     Confirmed by tracing three generic-form relations' `from` id to its
     defining element in `agile-manifesto.xma`: an `ApplicationComponent`-
     sourced `ElementElementAssociation` sits inside `ApplicationScheme`'s own
     `Relations`, alongside ordinary exact-triple relations
     (`ApplicationComponentBusinessProcessRealisation`, etc); a
     `CompositeGrouping`-sourced `GroupingElementComposition` sits inside
     `CompositeScheme`'s; only the one relation sourced from the model's
     `Junction` sits at the document root. The original claim above ("never
     inside a layer scheme") was wrong — it was checked against the
     `.archimate` source's own generic-relationship *type*, not against where
     each specific relation instance actually landed in the real `.xma`, and
     shipped a document Enterprise Studio rejected outright ("could not
     generate the object: unknown type") for any model with a generic-form
     relation outside the narrow case tested. Fixed in `relationship-writer.ts`.
3. **A handful of concrete types collapse to a coarser XMA "category" only
   for relationship-type naming** — distinct from their own element mapping
   in `element-mapping.ts`, and *not* generic (still an exact-triple lookup,
   just with a "collapsed" `xmaType` value). Confirmed directly in the raw
   XML (not inferred), in both fixtures:
   - `sabsa/`: `TechnologyCollaboration` (own `xmaType:
     'TechnologyCollaboration'`) produces a `TechnologyNode`-prefixed
     relationship tag instead. `SystemSoftware` (own `xmaType:
     'TechnologySystemSoftware'`) does the same.
   - `agile-manifesto/`: `BusinessCollaboration` — verified directly (element
     id traced to its `<ArchiMate:BusinessCollaboration id="39">`
     declaration, appearing as `from`/`to` in a
     `BusinessRoleBusinessProcessTriggering` and an
     `ApplicationComponentBusinessRoleUse` relation) — collapses to
     `BusinessRole`, matching the `TechnologyCollaboration` pattern exactly:
     **every confirmed `...Collaboration` type collapses to its own
     "singular active structure" counterpart** (`Role` for Business, `Node`
     for Technology). This is the closest thing to a general rule found so
     far, but it's confirmed only for these two `...Collaboration` types —
     do not extend it to `ApplicationCollaboration` (which shares
     `ApplicationComponent`'s `collectionTag` in `element-mapping.ts`, so
     it's a plausible next candidate) without fixture evidence; a shared
     `collectionTag` alone is not sufficient evidence of a naming collapse —
     the whole Motivation-layer group (`Driver`, `Assessment`, `Goal`, ...)
     shares one `collectionTag` and yet each keeps its own distinct name in
     every confirmed relationship mapping. `Constraint` collapsing to
     `MotivationRequirement` remains circumstantial (one otherwise-unexplained
     count mismatch in `sabsa/`, no direct id-traced confirmation like the
     two `...Collaboration` cases) and is **not** implemented.

Nothing here is silently dropped: a relationship that doesn't resolve via
either the exact-triple table or one of these generic rules is still
correctly diagnosed as unsupported by `inspectXmaSupport` (see
`tests/integration/sabsa.test.ts` and
`tests/integration/agile-manifesto.test.ts`).

### Junction element and Connectors container

Confirmed directly in both fixtures: `Junction` (`ArchiElement.type` is
always the literal string `"Junction"` for both AND/OR — the distinction
lives in the separate `junctionType` field) has two XMA element forms,
`ArchiMate:Junction` (AND) and `ArchiMate:OrJunction` (OR), living in a
root-level `<ArchiMate:Connectors>` container — a sibling of
`<ArchiMate:Relations>` under `ArchiMateComponent`, in that order
(`Relations` first, then `Connectors`). Unlike `Relations` (see the
correction above — every *other* scheme also has its own `Relations`
collection), `Connectors` really is root-only: `Junction`/`OrJunction` are
the only element types with no layer scheme of their own to live in instead.

Every `ArchiMate:{collection}` element — a layer scheme's typed collections
(`ApplicationComponents`, `BusinessProcesses`, ...) and every `Relations`
collection alike — carries its own `id` attribute, confirmed directly (e.g.
`ApplicationComponents id="222"`, `BusinessProcesses id="70"`, `Relations
id="72"`). This was also missed by the initial implementation (both were
rendered with no `id` at all) and, like the Relations mis-nesting above, was
rejected outright by Enterprise Studio rather than merely losing content.
Fixed in `semantic-writer.ts`'s `renderSchemeChildren`.

Graphically, a Junction node is confirmed structurally different from every
other element node: `mm_graphicType="3"` (not the usual `"5"`), and no
`MM_Color`/`MM_Colors` at all — a Junction carries no fill/line styling in
either fixture. Implemented in `graphical-writer.ts`'s `buildJunctionNode`,
which is used instead of the normal styled-node path.

### Nested diagram objects

`sabsa.archimate` has 283 nested `ArchiDiagramObject`s (parent-and/or-child),
up to 3 levels deep; `agile-manifesto.archimate` has 15, 1 level deep — both
independently disprove the "nested diagram objects aren't supported"
assumption v0.1 originally shipped with. Confirmed structure (verified with
a structural walk of both `.xma` files, matching parent/child `MM_Rect`
values against the source `.archimate`'s parent/child bounds × 3):

- A child's `MM_Node` nests as a sibling of its parent's icon/label
  `MM_Decoration`s, inside the parent's own `MM_Graphics` — not as a sibling
  of the parent in the Canvas.
- A child's `MM_Rect` bounds are used exactly as Archi stores them (already
  relative to the parent), scaled ×3 like every other node — **no offset
  math**. Confirmed by exact match: a parent/child pair with Archi bounds
  `{264,96,445,124}` / `{288,36,145,73}` produces XMA `MM_Rect`s of exactly
  `{792,288,1335,372}` / `{864,108,435,219}` (×3, no addition).
- Groups nest children the same way a normal element-backed node does
  (confirmed: a `ViewGraphic` node with 3 nested `MM_Node` children exists in
  `sabsa.xma`) — the same recursive structure, not a special case.

Implemented in `graphical-writer.ts`'s `buildNodeTree` (recursive,
bottom-up: children are built first, then passed into `buildStyledNode`'s
`nestedChildrenXml` parameter) and `view-writer.ts` (dropped the outright
rejection of any object with a `parentId`/non-empty `childrenIds`).

### Nesting suppresses the graphical connector for the same relationship

Reported against a real converted file opened in Enterprise Studio: a
relationship between a nested diagram object and its own visual parent still
drew an explicit connector with an arrowhead, which looks wrong — the
nesting itself already conveys the relationship.

Confirmed directly in `agile-manifesto.xma`: this fixture has exactly 12
relationships between a diagram object and its immediate visual parent (all
`CompositionRelationship` — 10 with `Grouping` as source, producing the
generic `GroupingElementComposition` form; 2 plain `BusinessProcess` ->
`BusinessFunction` exact-triple). Both tags appear in the semantic
`Relations` collections at their full count (10 and 2), but **neither tag
appears among the graphical `MM_DirectedRel` connectors at all** — 0 of 12,
not merely fewer. Meanwhile `ElementGroupingComposition` (`Grouping` as
*target* — 2 instances, none of them a nesting pair) is drawn normally, 2
semantic and 2 graphical: the omission tracks nesting, not the relationship
type or even the presence of `Grouping` as an endpoint.

Implemented in `graphical-writer.ts`'s connector-building loop: a connection
is skipped (no `MM_DirectedRel`, but the semantic relationship and its
`RefObjects` entry are unaffected — both already built by
`relationship-writer.ts`/`view-writer.ts` independently) when one endpoint's
diagram object is the other's immediate visual parent, regardless of
relationship type — nesting evidence isn't type-specific, only "is this
endpoint the other's visual parent" is.

**Known residual gap, not yet explained:** the model has 104 diagram
connections total; the real fixture draws 93 of them graphically, this
implementation now draws 92 — one fewer than the real file, not traced to a
specific relationship. All 12 identified nesting pairs match the real
fixture's omissions exactly (by tag and count), so the extra gap is
somewhere in the other 92, for a reason not yet investigated. Documented
here rather than silently claimed as exact; see the `toHaveLength(92)`
assertion (not 93) in `tests/integration/agile-manifesto.test.ts`.

**Not implemented — no fixture evidence:** a nested `ArchiNote` (as opposed
to a nested `ArchiDiagramObject`). Only one instance exists across all four
fixtures combined, not enough to confirm its representation; still
diagnosed as unsupported.

### Multi-view support

`sabsa.xma` has 38 `<ArchiMate:AllView>` elements; `agile-manifesto.xma` has
3 — both fixtures independently disprove the "XMA supports exactly one view"
assumption v0.1 originally shipped with. Confirmed structure (both
fixtures): every view nests as a sibling inside one shared `AbstractViews`
container, while each gets its own separate `GraphicalModule` (its own
`MM_Diagram` and its own `Any/Objectref` pointing back to its `AllView`) —
verified by matching each `GraphicalModule`'s `Objectref` value against its
own `MM_Diagram`'s Canvas `mm_semanticObject`, confirming a strict 1:1
pairing in both fixtures. Implemented across `serialize-xma.ts` (iterates
`model.views` instead of requiring exactly one) and `document-writer.ts`
(assembles the shared `AbstractViews` + per-view `GraphicalModule`s).

### DiagramModelReference ("insert view as reference" shape)

**Corrected finding.** An earlier version of this codebase claimed zero
fixture evidence for this construct's XMA representation, based on grepping
`agile-manifesto.xma` for the `DiagramModelReference` object's own Archi
string id and the referenced view's Archi string id. That check could never
have found a match: XMA never reuses Archi's ids (every XMA id is a
deterministic, freshly-allocated integer — see `id-allocator.ts`), so the
absence of those specific strings proved nothing about whether the construct
was represented, only that XMA ids look different from Archi ids (which was
already known).

Re-verified directly, by tracing `agile-manifesto.archimate`'s two
`DiagramModelReference` shapes (linking to the "Agile Manifesto" and "12
Agile Principes" views) through to their graphical representation in the
real `agile-manifesto.xma`:

- Both **are** drawn, as an `MM_Diagram:MM_Node` with
  `mm_graphicType="3"` (like `Junction`, not the usual `"5"`) and
  `mm_concept="AllView"` — confirmed identical bounds to the source
  `<bounds>` scaled ×3, an icon decoration (unlike `Junction`, which has
  none), a fixed line color (`92,92,92`, the same `DEFAULT_LINE_COLOR` used
  everywhere else), and a fixed fill color (`220,235,235`, unique to this
  construct — confirmed identical on both instances, and neither source
  object has a `<style>` element, so it's a construct default, not a
  style-resolution result).
- The node's `mm_semanticObject` resolves through an `ArchiMate:AllViewRef`
  — the exact same Ref-layer indirection pattern used for every other
  element/relationship reference — to the id of an
  `ArchiMate:AllView` that already exists in the document as the
  *referenced view's own* definition. No new semantic concept is minted for
  the reference itself.
- This only resolves when `referencedModelId` matches another `ArchiView`
  in the *same* model. `archi-semantic-core`'s own docs on that field note
  it can also point at a Sketch/Canvas view, which isn't parsed into an
  `ArchiView` at all — that case remains genuinely unrepresentable and is
  reported as a `warning`, not guessed.
- The one connection *between* the two reference nodes (a purely-visual
  `mm_concept="ViewEdge"` `MM_DirectedRel`) is a separate, still-open gap —
  see "Nesting suppresses the graphical connector..." above and the 92-vs-93
  connector count discussion in `tests/integration/agile-manifesto.test.ts`;
  `archi-semantic-core` doesn't parse that connection at all (no `xsi:type`
  on its source XML), so it never reaches this library's input.

Implemented in `view-writer.ts` (validates the reference, resolves the
target view's ref) and `graphical-writer.ts`'s `buildViewReferenceNode`.

## Provenance

All three pairs were produced by exporting the same source model from Archi
and from the target XMA-producing tool, so that the `.archimate` and `.xma`
files describe the same model in each format. Tool/environment-specific
values present in the `.xma` files (desktop username, "Enterprise Studio"
version string, save timestamps) are **not** reproduced by this library —
see `src/serializer/document-writer.ts` for the minimal, neutral document
skeleton this adapter emits instead.

If any fixture pair is ever missing from a checkout, `tests/unit/*` still
cover every proven mapping rule via small synthetic models
(`tests/helpers/model-builder.ts`); only `tests/integration/*.test.ts`
require these fixture files to exist.
