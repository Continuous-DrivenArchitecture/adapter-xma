# Compatibility backlog

Status snapshot **2026-08-24**:

- **Relationship mappings: cleared.** All 31 triples that were pending when
  this document was created were byte-confirmed via a single dedicated
  round-trip the same day (record below).
- **Non-mapping constructs:** two resolved and shipped (partially-specified
  bendpoints, v0.12.0; bendpoint disagreement arbitration, including
  multi-waypoint granularity, this release), one narrower open question
  remains (tolerance for near-agreeing deltas — see below).

## Resolved: relationship mappings (cleared 2026-08-24)

**Method:** a purpose-built `.archimate` model ("XMA Mapping Backlog
Round-Trip") holding exactly the 31 pending triples as uniquely named
elements (`T## src <Type>` / `T## tgt <Type>`, relationship named `T##`) in a
single view was imported into BizzDesign Enterprise Studio and exported to
XMA. Each exported relation was matched back to its `T##` by element name and
its semantic tag read byte-exactly.

### Outcome summary

| Result | Count |
| --- | --- |
| Hypotheses confirmed byte-exact (exact triples) | 22 of 23 |
| New exact-triple entries added (`relationship-mapping.ts`) | 23 |
| Generic-form verbs newly confirmed (`generic-relationship-mapping.ts`) | 3 |
| Hypotheses refuted / corrected before entry | 1 |

Details:

- **23 new exact-triple entries** — T01–T23 below.
- **`AccessRelationship` with a `Junction`/`OrJunction` endpoint** produces
  the generic `AccessRelation` form (T27–T31, five instances across both
  endpoint orderings) — `Access` joined the confirmed junction verbs.
- **`AssignmentRelationship` with exactly one `Grouping` endpoint** produces
  `GroupingElementAssignment` / `ElementGroupingAssignment` (T24, T26).
- **`TriggeringRelationship` between two `Grouping`s** produces
  `GroupingGroupingTriggering` (T25).
- **One hypothesis refuted:** T02's expected tag assumed
  `CompositeLocationTechnologySystemSoftware…`, but the export proves
  `CompositeLocationTechnologyNodeComposition` — `SystemSoftware` collapses
  to `TechnologyNode` for relationship naming, consistent with the collapse
  already documented elsewhere in this repository.

### Confirmation record

| Tag | Archi triple | Observed XMA tag | Scheme placement |
| --- | --- | --- | --- |
| T01 | Realization: ApplicationFunction → ApplicationService | `ApplicationFunctionApplicationServiceRealisation` | ApplicationScheme |
| T02 | Composition: Location → SystemSoftware | `CompositeLocationTechnologyNodeComposition` | CompositeScheme |
| T03 | Serving: ApplicationService → ApplicationService | `ApplicationServiceApplicationServiceUse` | ApplicationScheme |
| T04 | Triggering: ApplicationComponent → ApplicationComponent | `ApplicationComponentApplicationComponentTriggering` | ApplicationScheme |
| T05 | Serving: TechnologyService → ApplicationInterface | `TechnologyServiceApplicationInterfaceUse` | TechnologyScheme |
| T06 | Serving: ApplicationComponent → ApplicationService | `ApplicationComponentApplicationServiceUse` | ApplicationScheme |
| T07 | Realization: ApplicationComponent → BusinessService | `ApplicationComponentBusinessServiceRealisation` | ApplicationScheme |
| T08 | Composition: ApplicationService → ApplicationService | `ApplicationServiceApplicationServiceComposition` | ApplicationScheme |
| T09 | Serving: BusinessService → ApplicationService | `BusinessServiceApplicationServiceUse` | BusinessScheme |
| T10 | Triggering: ApplicationService → ApplicationComponent | `ApplicationServiceApplicationComponentTriggering` | ApplicationScheme |
| T11 | Specialization: ApplicationInterface → ApplicationInterface | `ApplicationInterfaceApplicationInterfaceSpecialization` | ApplicationScheme |
| T12 | Serving: ApplicationService → ApplicationProcess | `ApplicationServiceApplicationProcessUse` | ApplicationScheme |
| T13 | Realization: ApplicationInterface → BusinessInterface | `ApplicationInterfaceBusinessInterfaceRealisation` | ApplicationScheme |
| T14 | Triggering: TechnologyService → ApplicationComponent | `TechnologyServiceApplicationComponentTriggering` | TechnologyScheme |
| T15 | Composition: Node → Node | `TechnologyNodeTechnologyNodeComposition` | TechnologyScheme |
| T16 | Serving: ApplicationService → ApplicationComponent | `ApplicationServiceApplicationComponentUse` | ApplicationScheme |
| T17 | Triggering: ApplicationInterface → ApplicationComponent | `ApplicationInterfaceApplicationComponentTriggering` | ApplicationScheme |
| T18 | Triggering: ApplicationService → ApplicationProcess | `ApplicationServiceApplicationProcessTriggering` | ApplicationScheme |
| T19 | Realization: ApplicationService → BusinessService | `ApplicationServiceBusinessServiceRealisation` | ApplicationScheme |
| T20 | Access: Node → DataObject | `TechnologyNodeApplicationDataObjectAccess` | TechnologyScheme |
| T21 | Flow: ApplicationInterface → ApplicationInterface | `ApplicationInterfaceApplicationInterfaceFlow` | ApplicationScheme |
| T22 | Serving: ApplicationService → BusinessInterface | `ApplicationServiceBusinessInterfaceUse` | ApplicationScheme |
| T23 | Triggering: ApplicationService → ApplicationInterface | `ApplicationServiceApplicationInterfaceTriggering` | ApplicationScheme |
| T24 | Assignment: Grouping → ApplicationService | `GroupingElementAssignment` | CompositeScheme (source scheme) |
| T25 | Triggering: Grouping → Grouping | `GroupingGroupingTriggering` | CompositeScheme (source scheme) |
| T26 | Assignment: ApplicationComponent → Grouping | `ElementGroupingAssignment` | ApplicationScheme (source scheme) |
| T27 | Access: ApplicationComponent → Junction | `AccessRelation` | ApplicationScheme (source scheme) |
| T28 | Access: Junction → DataObject | `AccessRelation` | root Relations container |
| T29 | Access: ApplicationInterface → Junction | `AccessRelation` | ApplicationScheme (source scheme) |
| T30 | Access: ApplicationService → Junction | `AccessRelation` | ApplicationScheme (source scheme) |
| T31 | Access: ApplicationFunction → Junction | `AccessRelation` | ApplicationScheme (source scheme) |

All 31 exported relations were accounted for — nothing was dropped or altered
by the import/export path. Scheme placements match the established rules:
exact triples live in the source element's own scheme; generic forms likewise
follow the source element's scheme, except junction-sourced relations, which
sit in the root-level `<ArchiMate:Relations>` container.

## Resolved: partially-specified bendpoints (shipped v0.12.0)

Archi's `.archimate` format makes all four bendpoint offset attributes
optional. Orthogonally-routed connections in the wild sometimes store a
waypoint with only one coordinate per reference frame — no complete source
pair and no complete target pair — which `resolveBendpoint`
(`src/geometry/bendpoints.ts`) cannot resolve.

**Resolution (implemented 2026-08-24, released in v0.12.0):** the diagnostic
is a `warning` (`unresolvable-bendpoint`), the unresolvable waypoint is
skipped, and the connection is emitted with its remaining points (or straight
when none remain) — mirroring the `bendpoint-endpoint-mismatch` precedent.
Deriving the missing coordinate by interpolation was considered and rejected:
there is no fixture evidence for any interpolation rule, and this repository
does not guess.

Evidence that justified the policy: the committed sabsa fixture contains
exactly this construct — connection `id-1997f31069a649e4ad625e77f06543db`
(the "paired with" Association between the "Resuce Exposure to Tornado
Damage" Goal and the "Inacceptable Cost to Repair Damange" Assessment) carries
`<bendpoint startX="197" endX="-197"/>`, and tracing that relation into the
reference export `sabsa.xma` (semantic `ElementElementAssociation id=2324`)
shows **no graphical `MM_DirectedRel` at all** — BizzDesign itself exported no
connector line for it. Emitting the connection straight is therefore not less
faithful than BizzDesign's own output.

Observed instances (2026-08-24 corpus scan, 21 XML models): two
`startY+endY` in SBB-AM-000069 CIAM Biometrics, one `startX+endY` in
SBB-SD-000439 Brokered Product Mutual Fund (1), plus the `startX+endX`
fixture instance above.

## Resolved: bendpoint disagreement arbitration (this release)

**Status: resolved via a real BizzDesign round-trip.** This is a different,
independent probe from the one referenced in the superseded plan below (that
earlier probe rendered tangled in Archi itself and was abandoned; this one
skips the Archi-authoring step entirely and imports straight into BizzDesign
Enterprise Studio, which is the only fidelity target this question actually
cares about).

### Method

A purpose-built `.archimate` model (`private-examples/bendpoint-fidelity-probe.archimate`,
5 elements, 4 `AssociationRelationship` connections, each isolating one
scenario) was imported directly into BizzDesign Enterprise Studio and
exported to XMA (`private-examples/Bendpoint Fidelity Probe.xma`) without
touching the routing. Each connector's `MM_Point`s were compared against
this adapter's own output for the same source file.

### Q1 — offset semantics: CONFIRMED for the agreeing case, and more deeply than expected

The snake connector (4 bendpoints, source- and target-relative offsets
deliberately consistent at every point) resolved to byte-identical points in
both exports: `(780,225) (780,780) (1800,780) (1800,360)` (mm-scale XMA
points; `/3` for Archi-space). This confirms the existing center-relative
hypothesis in `src/geometry/bendpoints.ts` for the clean case — the earlier
probe's Archi-rendering trouble was specific to that probe's own generation,
not evidence against the hypothesis itself.

### Q2 — disagreement arbitration: CONFIRMED, and it is not source-preference

**Case A — both frames fully specified, disagreeing on one axis** (deliberate
40px X divergence; source-relative resolves to Archi-space `(560,216)`,
target-relative to `(600,216)`): BizzDesign's actual export point is
`(580,216)` — exactly the arithmetic mean of the two candidates, on the
disagreeing axis (`(560+600)/2 = 580`; the agreeing Y axis is unaffected).

**Case B — neither frame has any data on one axis** (`<bendpoint startY="120"
endY="-120"/>`, mirroring the real `startY+endY`-only construct from the
original CIAM Biometrics model — no X data in either frame at all): the
adapter previously treated this as fully unresolvable and skipped the
waypoint (see "Resolved: partially-specified bendpoints" above). BizzDesign's
actual export instead places a point at Archi-space `(108,216)`. Modeling
each missing axis as defaulting to that same frame's own element center,
then averaging the two fully-resolved candidate points exactly as in Case A,
reproduces this precisely: source candidate `(108, 357+120) = (108,477)`
(center defaults the missing X), target candidate `(108, 75-120) = (108,-45)`
(same), mean `(108, 216)` — an exact match.

**Confirmed rule, replacing source-preference:** for each axis independently,
a present offset resolves to `center + offset`; a missing offset defaults to
that frame's own element center on that axis. The two fully-resolved
candidate points (source-side, target-side) are then averaged
component-wise — always, whether they agree or disagree, and regardless of
whether either frame was fully or only partially specified. This subsumes
the previous `unresolvable-bendpoint` case (Case B) into the same mechanism
as the disagreement case (Case A): a genuinely resolvable point exists
whenever *either* frame has *any* usable coordinate, not only when at least
one frame has both. Implemented in `resolveBendpoint`
(`src/geometry/bendpoints.ts`) and `graphical-writer.ts` in this release; see
`tests/unit/bendpoints.test.ts` for the traced assertions.

The pre-existing "one frame entirely absent, the other fully specified"
resolution (`source-only`/`target-only`, unrelated to either Case A or B) is
unchanged — no evidence from this experiment touches that path, and it keeps
its own, separately-established test coverage.

### Q3 — tolerance: still open

This probe used one large (40px), unambiguous divergence. Whether BizzDesign
treats sub-pixel/1–2px deltas differently (e.g. snapping to one side instead
of averaging) is untested. Lower priority now that the primary arbitration
mechanism is known — the existing `AGREEMENT_EPSILON` (0.01) only gates
whether the `bendpoint-endpoint-mismatch` diagnostic fires, not which point
is used, so a wrong tolerance value would at most mis-classify a diagnostic,
never mis-place a point.

### Q4 — multi-waypoint granularity: CONFIRMED

Resolved using a second, independent evidence source: BizzDesign Enterprise
Studio's own query scripting language (see
`scripts/bendpoint-audit.bdquery.txt`) exposes `fromPoint()`/`toPoint()`/
`points()` on a relation reference, returning BizzDesign's live, in-memory
resolved geometry directly — no export/import round-trip needed. Run
against a real production model (SBB-AM-000066 FIES FILE ESPECIAL, 662
diagram connections), this produced hundreds of real resolved points in one
pass, including genuine multi-bendpoint connections with mixed
complete/partial data.

**Case C — a real 4-bendpoint connection, one point missing an axis, the
rest fully specified** (connection `id-64dd2c5c5cf747b3846cd29bdd1ba808`,
Access relation, "FIES - Copiar Motivos Comerciales CCerradas SBS Blob
Database" → "Mensual", view "3. DCOM - Diagrama de Componentes e
Integración - STEP"):

```
<bendpoint startX="-162"          endX="1014" endY="-270"/>   (startY missing)
<bendpoint startX="-174" startY="48" endX="1038" endY="-210"/>
<bendpoint startX="-618" startY="48" endX="558"  endY="-222"/>
<bendpoint startX="-618" startY="300" endX="558" endY="30"/>
```

Applying the confirmed per-axis-default-then-average rule independently to
each of the 4 points (using each diagram object's true absolute center,
resolved through this model's real nesting) reproduces BizzDesign's actual
`points()` output **exactly, for all 4 points** (Archi-space, scaled x3 to
XMA mm): `(5688,3024)`, `(5706,3186)`, `(4320,3168)`, `(4320,3924)` — an
exact match to BizzDesign's real query result for this exact connection
(same four values, reported in a different order).

**Confirmed:** arbitration is genuinely independent per waypoint. A
multi-bendpoint connection with some points fully agreeing, one point
missing an axis, and no two points sharing the same resolution shape, still
resolves every single point via the same simple rule applied waypoint by
waypoint — no path-aware, path-smoothing, or cross-waypoint interpolation
behavior was found. This closes Q4.

### Q3 — tolerance: still open

This remains the one open question. Whether BizzDesign treats sub-pixel/
1–2px deltas differently (e.g. snapping to one side instead of averaging)
is untested — every case examined so far (synthetic and real) involved
either exact agreement or a clearly material divergence. Low priority: the
existing `AGREEMENT_EPSILON` (0.01) only gates whether the
`bendpoint-endpoint-mismatch` diagnostic fires, not which point is used, so
a wrong tolerance value would at most mis-classify a diagnostic, never
mis-place a point.

Interim note: conversion was never blocked by any of these open questions;
all are refinements to routing fidelity and diagnostic precision, not
correctness gates.

## Regenerating the backlog scan

```bash
node scripts/scan-relationship-backlog.mjs
```

Default scan paths are `../private-examples` and `./tests/fixtures`; pass
explicit paths to scan other model folders. Compressed (zip-format)
`.archimate` files are skipped with a notice — extract their `model.xml` if
their content is needed. The script reads only; it never writes or modifies
model files. It currently covers relationship triples only — non-mapping
constructs are tracked manually in this document. When new pending triples
appear, promote them using the methods in
[`../CONTRIBUTING.md`](../CONTRIBUTING.md) and update this document.
