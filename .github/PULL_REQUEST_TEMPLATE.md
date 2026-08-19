## What & why

<!-- What changes, and the motivation. If this closes an issue, say "Closes #N". -->

## Evidence

<!--
If this changes a mapping, default value, or adds support for a
previously-unsupported construct: what fixture byte(s) confirm it? See
CONTRIBUTING.md — no fixture evidence means it should be a diagnostic, not
a guess.
N/A if this is pure tooling/infra/docs.
-->

## Checklist

- [ ] `npm run typecheck && npm run lint && npm run build && npm test` passes locally
- [ ] Added/extended tests for the behavior change
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (drives semantic-release)
- [ ] README / `tests/fixtures/README.md` updated if the support matrix or a mapping's evidence changed
