# Relationship-mapping backlog (cleared 2026-08-24)

**Status: all entries promoted.** Every triple listed here was pending
confirmation when this document was created, and all of them were
byte-confirmed via a single dedicated round-trip on 2026-08-24. This document
is now the evidence record for that batch; re-run the scanner to check for
newly observed pending triples.

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
