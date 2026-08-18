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

The three confirmed semantic relationship mappings (Assignment, Serving→Use,
Flow), their graphical `MM_DirectedRel` representation, and one manually
routed connection with a bendpoint. This is the source of truth for
`src/mapping/relationship-mapping.ts` and `src/geometry/bendpoints.ts`.

## Provenance

Both pairs were produced by exporting the same source model from Archi and
from the target XMA-producing tool, so that the `.archimate` and `.xma`
files describe the same model in each format. Tool/environment-specific
values present in the `.xma` files (desktop username, "Enterprise Studio"
version string, save timestamps) are **not** reproduced by this library —
see `src/serializer/document-writer.ts` for the minimal, neutral document
skeleton this adapter emits instead.

If either fixture pair is ever missing from a checkout, `tests/unit/*`
still cover every proven mapping rule via small synthetic models
(`tests/helpers/model-builder.ts`); only `tests/integration/*.test.ts`
require these fixture files to exist.
