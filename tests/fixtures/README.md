# Reference fixtures

These are the two immutable, empirically-paired `.archimate` / `.xma` fixture
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
`src/geometry/bendpoints.ts`, and (jointly with `sabsa/`, below) for
`src/mapping/relationship-mapping.ts`.

## `sabsa/` — `sabsa.archimate` / `sabsa.xma`

A large, real-world model (SABSA framework: 463 elements, 551 relationships,
38 views), contributed by the project maintainer specifically to expand
relationship-mapping coverage beyond the original three. Confirmed **64
additional** relationship mappings (67 total, up from 3), using the method
below. `sabsa.archimate` is stored decompressed (Archi's zip-archive variant,
decoded once with `extractArchiModelXml`), matching the plain-XML convention
of the other two fixture pairs.

### Derivation method (exact-triple mappings only — see "Known limitation" below)

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

This yielded 67 exact matches (3 already known, re-confirmed independently by
this second fixture, plus 64 new).

### Known limitation surfaced by this fixture — NOT yet modeled in `relationship-mapping.ts`

The exact-triple lookup in `relationship-mapping.ts` cannot represent
everything this fixture proves. Three distinct patterns were confirmed but
deliberately left unmodeled, pending a design decision on how to extend the
mapping shape without weakening its "never guess" guarantee:

1. **`AssociationRelationship` is type-independent.** Every single instance
   across dozens of distinct source/target type combinations serializes as
   the same generic `ElementElementAssociation` tag. Modeling this as
   individual exact triples would require dozens of duplicate-looking rows
   for what is actually one universal rule, and would still fail to cover a
   source/target pair not literally present in this fixture even though the
   rule obviously generalizes.
2. **A `Grouping` or `Junction` endpoint collapses the relationship type to a
   generic form**, e.g. `GroupingElementComposition`,
   `ElementGroupingSpecialization`, `RealisationRelation` — instead of the
   type-specific tag either endpoint would otherwise produce.
3. **A handful of concrete types collapse to a coarser XMA "category" only
   for relationship-type naming** — distinct from their own element mapping
   in `element-mapping.ts`. Confirmed directly in the raw XML (not inferred):
   a `TechnologyCollaboration` endpoint (`element-mapping.ts` gives it its
   own `xmaType: 'TechnologyCollaboration'`) produces a
   `TechnologyNode`-prefixed relationship tag instead
   (`TechnologyNodeApplicationComponentUse`). The same collapse was observed
   for `SystemSoftware` (own `xmaType: 'TechnologySystemSoftware'`, but also
   collapses to `TechnologyNode` in relationship tags), and circumstantial
   evidence (an otherwise-unexplained count mismatch) suggests `Constraint`
   collapses to `MotivationRequirement`'s category for this same purpose.
   The exact boundary of which types collapse into which category, and why,
   is not yet fully mapped — do not assume categories from `element-mapping.ts`
   apply here without fixture evidence per case.

None of this is silently dropped: relationships hitting any of these three
cases are still correctly diagnosed as unsupported by `inspectXmaSupport`
today (see `tests/integration/sabsa.test.ts`) — the gap is coverage, not
correctness.

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
