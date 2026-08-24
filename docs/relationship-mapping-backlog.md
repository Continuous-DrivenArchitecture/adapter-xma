# Compatibility backlog

**Relationship mappings: cleared 2026-08-24.** Every triple listed here was
pending confirmation when this document was created, and all of them were
byte-confirmed via a single dedicated round-trip on 2026-08-24 (see the
record below). This document also tracks other observed-but-unresolved
compatibility constructs that block conversion (see
[Pending non-mapping constructs](#pending-non-mapping-constructs)); re-run
the scanner to check for newly observed pending triples.

**Round-trip method:** a purpose-built `.archimate` model ("XMA Mapping
Backlog Round-Trip") holding exactly these 31 triples as uniquely named
elements (`T## src <Type>` / `T## tgt <Type>`, relationship named `T##`) in a
single view was imported into BizzDesign Enterprise Studio and exported to
XMA. Each exported relation was matched back to its `T##` by element name and
its semantic tag read byte-exactly.

## Outcome summary

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

## Confirmation record

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

## Pending non-mapping constructs

Constructs observed in real models that block conversion for reasons other
than relationship mappings.

### Partially-specified bendpoints (`unresolvable-bendpoint`, downgraded to warning 2026-08-24)

Archi's OEX format makes all four bendpoint offset attributes optional
(`startX`/`startY` relative to the source object's center, `endX`/`endY`
relative to the target's). Orthogonally-routed connections in the wild
sometimes store a waypoint with only one coordinate per reference frame — no
complete source pair and no complete target pair — so
`resolveBendpoint` (`src/geometry/bendpoints.ts`) cannot produce a point from
either side and `graphical-writer` reports an `unresolvable-bendpoint`
**warning**, skipping only that waypoint (the connector is drawn with its
remaining points, or straight when none remain).

Observed instances (2026-08-24 corpus scan, 21 XML models):

| Model | Connection | Bendpoint |
| --- | --- | --- |
| SBB-AM-000069 CIAM Biometrics | `id-fc27ba2d1a324826bb3542093db442e1` | `<bendpoint startY="242" endY="-335"/>` |
| SBB-AM-000069 CIAM Biometrics | `id-4555ab5805ec457ea31e7571762d69fa` | `<bendpoint startY="242" endY="-335"/>` |
| SBB-SD-000439 Brokered Product Mutual Fund (1) | `id-40edb273c7674d928feba3adf73874ec` | `<bendpoint startX="210" endY="-159"/>` |

Shapes seen so far: `startY+endY`, `startX+endY` (and one `startX+endX`
instance inside the committed sabsa fixture — see below). All have exactly
two of the four attributes; no instance with fewer has been observed.

**Fixture evidence:** the committed sabsa fixture contains exactly this
construct — connection `id-1997f31069a649e4ad625e77f06543db` (the
"paired with" Association between the "Resuce Exposure to Tornado Damage"
Goal and the "Inacceptable Cost to Repair Damange" Assessment) carries
`<bendpoint startX="197" endX="-197"/>`. Tracing that relation into the
reference export `sabsa.xma` (semantic `ElementElementAssociation id=2324`)
shows **no graphical `MM_DirectedRel` at all**: BizzDesign itself exported
no connector line for it. Emitting the connection as a straight line (or
with its remaining resolvable points) is therefore not less faithful than
BizzDesign's own output.

**Resolution (implemented 2026-08-24):** the diagnostic is a `warning`, the
unresolvable waypoint is skipped, and the connection is emitted with its
remaining points (or straight when none remain) — mirroring the existing
`bendpoint-endpoint-mismatch` precedent ("precision discrepancy in Archi's
own stored data, not a construct XMA can't represent"). Deriving the missing
coordinate by interpolation was considered and rejected: there is no fixture
evidence for any interpolation rule, and this repository does not guess.

## Regenerating the backlog scan

```bash
node scripts/scan-relationship-backlog.mjs
```

Default scan paths are `../private-examples` and `./tests/fixtures`; pass
explicit paths to scan other model folders. Compressed (zip-format)
`.archimate` files are skipped with a notice — extract their `model.xml` if
their content is needed. The script reads only; it never writes or modifies
model files. When new pending triples appear, promote them using the methods
in [`../CONTRIBUTING.md`](../CONTRIBUTING.md) and remove them from this
document.
