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
   - Both forms are appended to a root-level `<ArchiMate:Relations>`
     container (a sibling of `AbstractSchemes` under `ArchiMateComponent`),
     never inside a layer scheme — confirmed directly: every generic-form
     relation instance in both fixtures appears there, never nested in
     `BusinessScheme`/`ApplicationScheme`/etc.
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
(`Relations` first, then `Connectors`), neither inside any layer scheme.

Graphically, a Junction node is confirmed structurally different from every
other element node: `mm_graphicType="3"` (not the usual `"5"`), and no
`MM_Color`/`MM_Colors` at all — a Junction carries no fill/line styling in
either fixture. Implemented in `graphical-writer.ts`'s `buildJunctionNode`,
which is used instead of the normal styled-node path.

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
