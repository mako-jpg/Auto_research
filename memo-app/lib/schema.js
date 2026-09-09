export function isValidPriority(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

const VALID_OUTPUT_TYPES = ["research", "article", "video"];

export function normalizeOutputTypes(input) {
  if (input === undefined) return undefined;
  const list = Array.isArray(input) ? input : [];
  const unique = [...new Set(list.filter((v) => VALID_OUTPUT_TYPES.includes(v)))];
  return unique.length > 0 ? unique : ["research"];
}

const VALID_RESEARCH_MODES = ["once", "recurring"];
const VALID_RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "custom"];

export function normalizeResearchMode(input) {
  if (input === undefined) return undefined;
  return VALID_RESEARCH_MODES.includes(input) ? input : "once";
}

export function normalizeRecurringFrequency(input) {
  if (input === undefined) return undefined;
  return VALID_RECURRING_FREQUENCIES.includes(input) ? input : "weekly";
}

export function normalizeDayOfWeek(input) {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  const n = Number(input);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
}

export function normalizeDayOfMonth(input) {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  const n = Number(input);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

export function normalizeRecurringTime(input) {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  const trimmed = String(input).trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : null;
}

export function normalizeCustomDates(input) {
  if (input === undefined) return undefined;
  const list = Array.isArray(input) ? input : [];
  const valid = list.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  return [...new Set(valid)].sort();
}

export function normalizeSourceUrl(input) {
  if (input === undefined) return undefined;
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeBoolean(input) {
  if (input === undefined) return undefined;
  return Boolean(input);
}

export function normalizeCategories(input) {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set();
  const result = [];
  for (const item of list) {
    if (item === null || item === undefined) continue;
    const name = String(item).trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}
