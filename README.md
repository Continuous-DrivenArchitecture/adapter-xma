# @cda/adapter-xma

An XMA output adapter for the [Continuous-Driven Architecture (CDA)](https://github.com/Continuous-DrivenArchitecture) ecosystem.

`@cda/adapter-xma` converts the typed `ArchiModel` produced by
[`@cda/archi-semantic-core`](https://github.com/Continuous-DrivenArchitecture/archi-semantic-core)
into an XMA document, preserving both **semantics** (elements, relationships,
names, documentation) and **presentation intent** (views, node geometry,
default visual styling, graphical relationships, bendpoints, Notes, Groups).

```
.archimate
    │
    ▼
@cda/archi-semantic-core   (parseArchiModel)
    │
    ▼
ArchiModel
    │
    ▼
@cda/adapter-xma           (serializeXma)
    │
    ▼
.xma
```

This package is a **pure output-format adapter**. It does not re-parse
`.archimate` XML, does not duplicate `archi-semantic-core`'s parsing logic,
and does not use the ArchiMate Open Exchange format as an intermediate
representation (doing so would lose native presentation fidelity). It
consumes `archi-semantic-core`'s public `ArchiModel` contract only.

The runtime is dependency-light and avoids Node-only APIs (`fs`, `path`,
`process`), so it can run in a browser — e.g. a future client-side CDA
converter.

## Installation

```
npm install @cda/archi-semantic-core @cda/adapter-xma
```

## Usage

```ts
import { parseArchiModel } from '@cda/archi-semantic-core';
import { serializeXma } from '@cda/adapter-xma';

const model = parseArchiModel(archimateXml);

const xma = serializeXma(model, {
  language: 'en',
});
```

`serializeXma` is **strict by default**: if the model contains a construct
that would cause semantic or presentation loss (an unmapped element type, an
unconfirmed relationship, more than one view, a diagram object missing
width/height, ...) it throws `XmaSerializationError` carrying a structured
diagnostic for every problem found, rather than silently dropping content or
fabricating an approximate result. Lower-severity findings (`warning`) don't
block serialization — e.g. an explicit fill-opacity (`alpha`) override, or a
`DiagramModelReference` pointing outside this model's own ArchiMate views
(e.g. a Sketch/Canvas), which has no XMA representation.

To preview what is and isn't supported without throwing:

```ts
import { inspectXmaSupport } from '@cda/adapter-xma';

const diagnostics = inspectXmaSupport(model);
for (const d of diagnostics) {
  console.log(`[${d.severity}] ${d.code}: ${d.message}`);
}
```

### Options

```ts
interface XmaSerializeOptions {
  /** Applied to every xml:lang and the default MM_Language. Default: 'en'. Never inferred from element names. */
  language?: string;
  /** The root MM_ModelPackage's display name. Default: a neutral placeholder — no machine/user identity is ever fabricated. */
  packageName?: string;
  /** The model's display name. Default: `model.metadata.name`. */
  modelName?: string;
}
```

## Support matrix

This is **initial, evidence-backed XMA serialization support** — not a
complete, universal XMA converter. Everything below was confirmed against
four reference `.archimate`/`.xma` fixture pairs (see
[`tests/fixtures/README.md`](tests/fixtures/README.md)); nothing here is
extrapolated beyond that evidence.

### Supported

- All 60 confirmed ArchiMate element type mappings (Strategy, Business,
  Application, Technology, Physical, Motivation, Implementation & Migration,
  Composite), with confirmed scheme/collection placement and default icon
  decoration presence.
- `Junction`/`OrJunction` — a root-level `Connectors` container, confirmed
  distinct graphical form (no fill/line color, `mm_graphicType="3"`). See
  `tests/fixtures/README.md`.
- Element and view names, and documentation (as RTF profile values).
- **Multiple ArchiMate views per model** (up from exactly one) — each gets
  its own `GraphicalModule`, all nesting under one shared `AbstractViews`
  container. Confirmed against 38-view and 3-view real-world fixtures. Node
  geometry (exact ×3 scale), default per-category fill colors, line color,
  opacity, and font are unaffected by view count.
- Notes and Groups (as `ArchiMate:ViewGraphic`), including Group
  documentation.
- **Nested diagram objects, up to 3 levels deep** — a child's `MM_Node`
  nests inside its parent's `MM_Graphics`, using its bounds as-is (already
  relative to the parent in Archi, no offset math). Groups and Notes nest
  children/nest themselves the same way — a nested Note's `MM_Node` is
  structurally identical to a top-level one, just relocated in the tree
  (confirmed against a private, non-public model: 90 nested-Note instances,
  an exact 1:1 count match against the real XMA's nested nodes). Confirmed
  against 283-nested-object and 15-nested-object real-world fixtures for
  diagram objects/Groups. A relationship between a nested object and its
  own visual parent gets no graphical connector line (nesting alone conveys
  it) but is still fully present semantically. See
  `tests/fixtures/README.md`.
- **115 confirmed exact-triple semantic relationship mappings** (up from 3),
  spanning all eight schemes, plus **3 confirmed generic (type-independent)
  forms** — `AssociationRelationship`, a `Grouping` endpoint (Composition,
  Specialization, Influence, Use), and a `Junction`/`OrJunction` endpoint
  (Realisation, Influence) — see `src/mapping/relationship-mapping.ts` and
  `src/mapping/generic-relationship-mapping.ts` for the tables, and
  `tests/fixtures/README.md` for how each was derived and verified. The
  original 3 exact-triple mappings additionally have their graphical
  `MM_DirectedRel` representation confirmed end-to-end; the rest were
  confirmed at the semantic layer only (the same generic serializer code
  path, not independently fixture-checked for the graphical layer):
  - `AssignmentRelationship` `BusinessActor` → `BusinessProcess`
  - `ServingRelationship` `ApplicationService` → `BusinessProcess` (XMA
    calls this `...Use`, not `...Serving`)
  - `FlowRelationship` `BusinessProcess` → `BusinessProcess`
- Manually routed connection bendpoints (source/target-relative offsets,
  cross-checked against each other). When both offsets are present but
  disagree, the source-relative point is used and a `warning` diagnostic is
  reported — this is a precision discrepancy in Archi's own stored data, not
  a construct XMA can't represent, so it does not block serialization.
- An omitted `x`/`y` bounds coordinate. Confirmed across all four fixtures
  (three omitted-`x`, one omitted-`y`, always alone, never alongside a
  missing `width`/`height`): Archi omits a bounds coordinate specifically
  when its value is `0`, per the ArchiMate Exchange Format convention. Not
  treated as incomplete geometry; JS's null-coerces-to-0 arithmetic applies
  the default when scaling/centering. See `src/geometry/geometry.ts`.
- `DiagramModelReference` ("insert view as reference") nodes, when they
  point at another ArchiMate view within the same model — drawn as an
  `mm_concept="AllView"`/`mm_graphicType="3"` node whose semantic object
  resolves, via an `ArchiMate:AllViewRef`, to the *referenced view's own*
  `ArchiMate:AllView` (no new semantic concept is minted for the reference
  itself). Confirmed byte-for-byte against both instances in the
  agile-manifesto fixture, including their fixed fill/line color. A
  reference to something outside this model's own views (e.g. a
  Sketch/Canvas) has no XMA representation and is reported as a `warning`,
  not a blocking error. See `src/serializer/view-writer.ts` and
  `graphical-writer.ts`'s `buildViewReferenceNode`.
- **A purely-visual connection between two drawable objects (no underlying
  ArchiMate relationship)** — represented as an `ArchiMate:ViewEdge`
  (semantic layer) and an `mm_concept="ViewEdge"` `MM_DirectedRel`
  (graphical layer). Confirmed against two independent real instances in
  two different fixtures — agile-manifesto (between two
  `DiagramModelReference`s) and sabsa (between a Note/Group and a
  `BusinessRole` element) — that the `ViewEdge`'s `from`/`to` are exactly
  each endpoint's own semantic id, the same value already used as that
  endpoint's own node's `mm_semanticObject`. Requires
  `@cda/archi-semantic-core >=0.4.3`, which stopped silently dropping a
  `sourceConnection` with no `xsi:type` (some of these connections have
  none); with an older parser version the connection simply never reaches
  this library's input, so nothing breaks, the improvement just doesn't
  apply. See `view-writer.ts`'s `resolveObjectSemanticId`.
- A configurable output language, applied consistently — never inferred
  from element names.
- Direct, lossless mapping of explicit Archi `fillColor`/`lineColor`
  (hex → RGB) and `fontName` overrides, where the source field maps onto
  the exact same structural XMA slot — including a connection's own
  `lineColor` override, applied to its `MM_DirectedRel` the same way.
- An explicit font-size override, via the confirmed `floor(pt) * 20`
  formula (two independent data points in the agile-manifesto fixture:
  11.25pt → `mm_fontSize="220"`, 14.25pt → `"280"`).
- Explicit bold/italic font style, via a confirmed `mm_fontMode` bitmask on
  the label decoration (bold=1, italic=2, both=3), and an explicit font
  color, applied as a nested `mm_lineColor` on that same decoration — both
  confirmed via a dedicated, isolated Enterprise Studio round-trip (not
  present in any of the four public fixtures).
- **Multiple views sharing an element or relationship** each get their own
  independent `RefObjects` entry — confirmed against the 38-view sabsa
  fixture (840 `Ref` elements for 735 distinct semantic targets: a ref id
  is never reused across two views). An earlier version deduplicated these
  globally, which silently dropped `RefObjects` entries for every view
  after the first that referenced an already-seen element.

### Not yet guaranteed

- Relationship type/source/target combinations beyond the 90 confirmed exact
  triples and the 3 confirmed generic forms (reported as a diagnostic, not
  silently dropped or guessed) — e.g. a `Grouping`/`Junction` endpoint paired
  with a verb outside the confirmed set for that endpoint kind.
- A handful of concrete types that collapse to a coarser XMA category
  specifically for relationship naming, distinct from their own element
  mapping — confirmed and implemented for `TechnologyCollaboration` →
  `TechnologyNode`, `BusinessCollaboration` → `BusinessRole`, and
  `SystemSoftware` → `TechnologyNode`. `Constraint` → `MotivationRequirement`
  remains circumstantial (one otherwise-unexplained count mismatch, no
  direct confirmation) and is **not** implemented. See "Generic and
  collapsed forms" in [`tests/fixtures/README.md`](tests/fixtures/README.md).
- Profiles/specializations and arbitrary model properties.
- Explicit line width or fill opacity (`alpha`) overrides (reported as
  diagnostics; the confirmed defaults are used instead). `alpha` in
  particular has zero occurrences across all four reference fixtures — no
  evidence to confirm a mapping, so it's diagnosed like every other
  unconfirmed override rather than applied on a guess.
- Manual connector anchor metadata (`mm_fromx`/`mm_fromy`/`mm_tox`/`mm_toy`)
  — present on a minority of connections in three of the four fixtures
  (5/93 in agile-manifesto, 1/3 in relaciones, 15/346 in sabsa; catalogo has
  no connections at all), never on all of them. Not enough evidence to tell
  what distinguishes an anchored connection from the rest or to derive a
  general formula, so they're deliberately omitted rather than guessed; see
  `src/serializer/graphical-writer.ts`.

## Architecture

```
src/
  index.ts                    public API

  serializer/                 XmlElement tree construction
    serialize-xma.ts            orchestrator: plan -> diagnostics/throw -> render
    document-writer.ts          MM_Document skeleton, scheme/folder nesting
    semantic-writer.ts          per-scheme element collections
    relationship-writer.ts      semantic relationship elements
    view-writer.ts              AllView: ViewGraphics + RefObjects, validation
    graphical-writer.ts         Canvas / MM_Node / MM_DirectedRel
    profile-values.ts           MM_ProfileValues (nm/doc) builder
    rtf.ts                      dependency-free RTF escaping

  mapping/                    immutable mapping DATA (never switch statements)
    element-mapping.ts           60 confirmed Archi type -> XMA type/scheme/collection
    relationship-mapping.ts      90 confirmed (type, source, target) -> XMA relationship
    generic-relationship-mapping.ts  3 confirmed type-independent forms (Association, Grouping, Junction)
    scheme-mapping.ts            scheme container / folder-nesting metadata
    visual-mapping.ts            default fill/line colors, font, opacity

  geometry/
    geometry.ts                  the ×3 scale rule
    bendpoints.ts                bendpoint offset -> absolute point resolution

  infrastructure/
    id-allocator.ts              deterministic numeric XMA id allocation
    xml-writer.ts                typed XmlElement tree -> deterministic XML string

  diagnostics/
    diagnostics.ts               XmaDiagnostic, DiagnosticCollector
    errors.ts                    XmaSerializationError
```

Every generated XMA id is a deterministic, strictly-increasing integer
driven by traversal order over the (order-preserving) `ArchiModel` — never
`Math.random()`, `Date.now()`, or a UUID. Archi's own string ids are never
reused as XMA ids.

Output is fully deterministic: the same `ArchiModel` and options always
produce byte-identical XML (no timestamps, host names, or environment
values are ever embedded).

## Development

```
npm install
npm run typecheck
npm run lint
npm run build
npm test
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for this project's core rule
(every mapping is evidence-backed, never guessed) and how to trace a
change to fixture bytes.

## License

MIT
