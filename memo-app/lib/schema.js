export function isValidPriority(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

const VALID_OUTPUT_TYPES = ["article", "video"];

export function normalizeOutputTypes(input) {
  if (input === undefined) return undefined;
  const list = Array.isArray(input) ? input : [];
  const unique = [...new Set(list.filter((v) => VALID_OUTPUT_TYPES.includes(v)))];
  return unique.length > 0 ? unique : ["article"];
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
