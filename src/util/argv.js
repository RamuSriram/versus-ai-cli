// Small helpers for working with raw argv.
// We deliberately support both "--flag value" and "--flag=value" styles.

/**
 * Returns true if any of the given flags appear in argv.
 * Supports:
 *   --flag
 *   --flag=value
 *   -f
 *   -f=value
 */
export function hasAnyFlag(argv, flags) {
  return flags.some((flag) =>
    argv.some((arg) => arg === flag || arg.startsWith(`${flag}=`))
  );
}
