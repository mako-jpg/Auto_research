export function isValidPriority(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
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
