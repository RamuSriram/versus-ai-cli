export function nowIso() {
  return new Date().toISOString();
}

export function hrtimeMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}
