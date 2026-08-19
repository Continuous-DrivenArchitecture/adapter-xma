// Marks dist/cjs as CommonJS, overriding the root package.json's "type":
// "module" for that subtree — the standard dual-ESM/CJS-output pattern.
// Explicit .mjs extension so this script itself always runs as ESM
// regardless of the nearest package.json, matching how it's invoked below.
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
