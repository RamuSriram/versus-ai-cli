import picocolors from "picocolors";

// Shared styling layer so we can honor `--color` and `NO_COLOR`
// consistently across the CLI.
//
// `pc` is a live binding (reassigned by setColorMode). Other modules import it
// and will automatically see the updated object.

export let pc = picocolors;

function normalizeMode(mode) {
  const m = String(mode ?? "auto").trim().toLowerCase();
  if (m === "always" || m === "on" || m === "true" || m === "1") return "always";
  if (m === "never" || m === "off" || m === "false" || m === "0") return "never";
  return "auto";
}

/**
 * Configure ANSI color/styling.
 *
 * Supported modes:
 * - auto: enable when attached to a TTY and NO_COLOR is not set
 * - always: force-enable
 * - never: force-disable
 */
export function setColorMode(mode, { stdoutIsTTY = process.stdout.isTTY, stderrIsTTY = process.stderr.isTTY } = {}) {
  const m = normalizeMode(mode);

  const noColorEnv = Object.prototype.hasOwnProperty.call(process.env, "NO_COLOR");
  const forceColorEnv = process.env.FORCE_COLOR;
  const isTTY = Boolean(stdoutIsTTY || stderrIsTTY);

  let enabled;
  if (m === "always") {
    enabled = true;
  } else if (m === "never") {
    enabled = false;
  } else {
    // auto
    enabled = isTTY && !noColorEnv && forceColorEnv !== "0";
  }

  // picocolors exposes createColors(enabled) which returns an object containing
  // the same styling functions but conditionally enabled.
  pc = typeof picocolors.createColors === "function" ? picocolors.createColors(enabled) : picocolors;
}
