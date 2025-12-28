// Time formatting helpers for user-facing UX.

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatUtcOffsetLabel(date) {
  // getTimezoneOffset() returns minutes behind UTC (e.g., IST => -330)
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = pad2(Math.floor(abs / 60));
  const mm = pad2(abs % 60);
  return `UTC${sign}${hh}:${mm}`;
}

function resolveTimeZoneLabel(date) {
  // Best effort: try to get a friendly short name from Intl (e.g., IST, PST).
  // If ICU data is limited, this may fall back to GMT offsets.
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart?.value) return tzPart.value;
  } catch {
    // ignore
  }

  // Special-case common one: Asia/Kolkata.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IST";
  } catch {
    // ignore
  }

  return formatUtcOffsetLabel(date);
}

export function formatLocalDateTime(date) {
  const base = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  const tz = resolveTimeZoneLabel(date);
  return `${base} ${tz}`;
}

// A shorter local datetime intended for CLI metadata.
// Omits the year when the timestamp is within the current year.
export function formatLocalDateTimeShort(date, now = new Date()) {
  const includeYear = date.getFullYear() !== now.getFullYear();

  const opts = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  if (includeYear) opts.year = "numeric";

  const base = new Intl.DateTimeFormat(undefined, opts).format(date);
  const tz = resolveTimeZoneLabel(date);
  return `${base} ${tz}`;
}

export function formatRelativeTime(fromMs, toMs = Date.now()) {
  const delta = Math.max(0, toMs - fromMs);

  if (delta < 5_000) return "just now";

  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;

  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;

  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}
