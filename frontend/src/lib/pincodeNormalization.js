import aliases from '@/data/pincodes';

// Build a lowercase lookup map once at module load
const aliasMap = new Map();
for (const [key, value] of Object.entries(aliases)) {
  aliasMap.set(key.toLowerCase(), value);
}

/**
 * Strips postal suffixes (S.O, B.O, H.O, SO, BO, HO) and jargon terms.
 */
function stripPostalSuffix(name) {
  if (!name) return '';
  return name
    .replace(/\s*(S\.?O\.?|B\.?O\.?|H\.?O\.?)\s*$/i, '')
    .replace(/\b(GPO|MDG|RSO|RMS|Delivery|Head Office|Sub Office|Branch Office)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Title-cases a string.
 */
function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Normalizes a raw postal office name into a customer-friendly locality name.
 *
 * Logic:
 * 1. Check alias map with raw name (exact match)
 * 2. Strip S.O/B.O/H.O suffix, check alias map again
 * 3. Fallback to cleaned (suffix-stripped, title-cased) name
 */
export function normalizeLocalityName(officeName) {
  if (!officeName) return '';

  // Try exact alias match (case-insensitive)
  const lower = officeName.toLowerCase().trim();
  if (aliasMap.has(lower)) {
    return aliasMap.get(lower);
  }

  // Strip suffix and try again
  const stripped = stripPostalSuffix(officeName);
  const strippedLower = stripped.toLowerCase();
  if (aliasMap.has(strippedLower)) {
    return aliasMap.get(strippedLower);
  }

  // Fallback: return title-cased cleaned name
  return titleCase(stripped);
}

/**
 * Title-case helper exported for other modules.
 */
export { titleCase };
