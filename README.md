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
block serialization — e.g. an explicit font-size override, or a
`DiagramModelReference` that gets omitted the same way Archi's own XMA
export omits it.

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
  relative to the parent in Archi, no offset math). Groups nest children the
  same way. Confirmed against 283-nested-object and 15-nested-object
  real-world fixtures. A relationship between a nested object and its own
  visual parent gets no graphical connector line (nesting alone conveys it)
  but is still fully present semantically. See `tests/fixtures/README.md`.
- **90 confirmed exact-triple semantic relationship mappings** (up from 3),
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
- `DiagramModelReference` ("insert view as reference") nodes are recognized
  and omitted with a `warning` diagnostic, not a blocking error — confirmed
  against the agile-manifesto fixture, whose real XMA export contains no
  trace whatsoever of such a node or its connections. See
  `src/serializer/view-writer.ts`.
- A configurable output language, applied consistently — never inferred
  from element names.
- Direct, lossless mapping of explicit Archi `fillColor`/`lineColor`
  (hex → RGB) and `fontName` overrides, where the source field maps onto
  the exact same structural XMA slot.

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
- A nested `ArchiNote` (as opposed to a nested `ArchiDiagramObject`, now
  supported) — only one instance exists across all four fixtures, not
  enough to confirm its representation.
- Purely visual (non-semantic) connections not touching a
  `DiagramModelReference` — no fixture evidence either way (the one
  purely-visual connection found, between two `DiagramModelReference`
  nodes, isn't even parsed as a diagram connection by
  `@cda/archi-semantic-core`, since it lacks an `xsi:type`).
- Profiles/specializations and arbitrary model properties.
- Explicit font size, bold/italic, line width, font color, or connector
  line color overrides (reported as diagnostics; the confirmed defaults are
  used instead).
- Manual connector anchor metadata (`mm_fromx`/`mm_fromy`/`mm_tox`/`mm_toy`)
  — only one fixture exhibited these attributes, not enough evidence to
  derive a general formula or confirm they're required for import. They are
  deliberately omitted rather than guessed; see
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
npm run build
npm test
```

## License

MIT
