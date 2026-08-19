# Security Policy

## Supported versions

This project is pre-1.0 (`0.x`). Only the latest published version on npm
receives security fixes; there is no backport policy for older `0.x`
releases.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a suspected security
vulnerability. Instead, use GitHub's private vulnerability reporting for
this repository:

[github.com/Continuous-DrivenArchitecture/adapter-xma/security/advisories/new](https://github.com/Continuous-DrivenArchitecture/adapter-xma/security/advisories/new)

This opens a private advisory visible only to the maintainers until a fix
is ready, avoiding exposure of the details before a patched release exists.

Include, where possible:

- the version of `@cda/adapter-xma` affected
- a minimal `ArchiModel` (or `.archimate` snippet) that reproduces the issue
- what you expected vs. what actually happened

## Scope notes

`@cda/adapter-xma` is a pure, dependency-free serializer: it consumes an
already-parsed `ArchiModel` and produces an XML string. It has no network
I/O, no filesystem access, and no `dependencies` in `package.json` — its
`peerDependency` on `@cda/archi-semantic-core` is the only external code in
its runtime path. Reports involving that package should go to its own
repository instead.
