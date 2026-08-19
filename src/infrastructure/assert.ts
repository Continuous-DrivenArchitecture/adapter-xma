/**
 * Asserts an internal cross-module invariant (e.g. "view-writer always
 * registers this id before graphical-writer reads it back") instead of
 * silently trusting it via a `!` non-null assertion. If the invariant is
 * ever violated by a future refactor, this throws a clear, specific error
 * instead of letting `undefined` flow into the rendered XML as the literal
 * string `"undefined"`.
 */
export function assertDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(`Internal invariant violation: ${message}`);
  }
  return value;
}
