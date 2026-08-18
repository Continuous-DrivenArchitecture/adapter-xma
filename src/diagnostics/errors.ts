import type { XmaDiagnostic } from './diagnostics.js';

/**
 * Thrown by `serializeXma` whenever serializing would silently lose
 * semantics or presentation intent. Carries the full structured diagnostic
 * list (not just the first failure) so callers can report everything wrong
 * in one pass — see `inspectXmaSupport` to obtain the same list without
 * throwing.
 */
export class XmaSerializationError extends Error {
  readonly diagnostics: XmaDiagnostic[];

  constructor(diagnostics: XmaDiagnostic[]) {
    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    super(
      `XMA serialization failed: ${errorCount} unsupported construct(s) would cause semantic or presentation loss. ` +
        diagnostics
          .filter((d) => d.severity === 'error')
          .map((d) => `[${d.code}] ${d.message}`)
          .join('; '),
    );
    this.name = 'XmaSerializationError';
    this.diagnostics = diagnostics;
  }
}
