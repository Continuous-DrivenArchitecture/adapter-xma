# Contributing

## Setup

```
npm install
npm run typecheck
npm run lint
npm run build
npm test
```

A `husky` pre-commit hook runs `typecheck` + `lint` + `test` automatically
on every commit (installed via `npm install`'s `prepare` script).

## The core rule: never guess

This library's central design principle is **strict, evidence-backed
mapping** — see the README's "Support matrix" and
[`tests/fixtures/README.md`](tests/fixtures/README.md). Every mapping table
entry, every default color/font/geometry value, and every "this construct
isn't supported" diagnostic is derived from a concrete byte in one of the
four reference `.archimate`/`.xma` fixture pairs, not from assumption or
from how you'd expect Archi/XMA to behave.

If you're adding or changing behavior:

- **Trace it to a byte.** Find the specific attribute/element in a
  `tests/fixtures/*/*.xma` file (or a new fixture pair you contribute) that
  proves the mapping, and reference it in a code comment the way the
  existing code does — see e.g. `src/serializer/graphical-writer.ts`'s
  `resolveNodeVisuals` or `src/geometry/geometry.ts`'s `hasCompleteBounds`.
- **No evidence, no mapping.** If a construct isn't confirmed by any
  fixture, it must produce an `error` or `warning` diagnostic via
  `DiagnosticCollector` (see `src/diagnostics/diagnostics.ts`), never a
  silently-guessed default. `unsupported-style-alpha` is a good example of
  the pattern: zero fixtures have an explicit `alpha` override, so it's
  diagnosed and left at the default rather than applied.
- **Contributing a new fixture pair?** See "How each mapping was derived
  and verified" in `tests/fixtures/README.md` for the expected method
  (cross-referencing `.archimate` source against the real `.xma` export,
  documenting counts and byte offsets, not just "it looked right").
  Existing fixture files are immutable ground truth — don't edit them.

## Determinism

Output must stay byte-identical for the same `ArchiModel` and options: no
`Math.random()`, `Date.now()`, timestamps, host names, or other
non-reproducible values anywhere in `src/`. `tests/unit/xml-writer.test.ts`
and the integration tests assert this.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/)
(`fix:`, `feat:`, `docs:`, `chore:`, ...) — `semantic-release` computes the
next version and changelog entry directly from them on every merge to
`main`. Look at `git log` for the established style before writing one.

## Pull requests

- Keep `npm run typecheck && npm run lint && npm run build && npm test`
  green (the pre-commit hook already enforces this locally; CI enforces it
  again, across Node 20/22/24).
- Add or extend tests for any behavior change — prefer a synthetic model
  via `tests/helpers/model-builder.ts` for edge cases, and a real-fixture
  assertion in `tests/integration/` when you can trace the change to
  fixture bytes.
