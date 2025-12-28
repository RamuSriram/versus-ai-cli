const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._+:-]*$/;

export function tokenizeTarget(target) {
  return String(target).trim().split(/\s+/).filter(Boolean);
}

export function isSafeToken(token) {
  // Disallow shell metacharacters, quotes, spaces, etc.
  // Allow typical command names and subcommands: git, pull, docker-compose, ip, ss, etc.
  return SAFE_TOKEN.test(token);
}

export function validateTargetForExec(target) {
  const tokens = tokenizeTarget(target);
  if (tokens.length === 0) {
    return { ok: false, reason: "Empty target" };
  }
  if (!isSafeToken(tokens[0])) {
    return { ok: false, reason: `Unsafe command token: "${tokens[0]}"` };
  }
  for (const t of tokens.slice(1)) {
    // Allow subcommand tokens, but still keep them safe.
    if (!isSafeToken(t)) {
      return { ok: false, reason: `Unsafe token: "${t}"` };
    }
  }
  return { ok: true, tokens };
}
