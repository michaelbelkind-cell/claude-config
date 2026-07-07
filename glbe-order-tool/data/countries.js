import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default billing country name (maps to countryId 69). */
export const DEFAULT_BILLING_COUNTRY = 'Germany';

const countries = JSON.parse(readFileSync(join(__dirname, 'countries.json'), 'utf8'));

const byName = new Map(countries.map((c) => [c.name.toLowerCase(), c.id]));

/** All country names sorted alphabetically (for workflow choice options). */
export const countryNames = countries.map((c) => c.name).sort((a, b) => a.localeCompare(b));

/**
 * Resolve a country name (case-insensitive) to its billing countryId.
 * @param {string} name
 * @returns {number}
 */
export function resolveBillingCountryId(name) {
  const trimmed = (name ?? DEFAULT_BILLING_COUNTRY).trim();
  const id = byName.get(trimmed.toLowerCase());
  if (id === undefined) {
    const sample = countryNames.slice(0, 5).join(', ');
    throw new Error(
      `Unknown billing country "${trimmed}". Use an exact name from countries.json (e.g. ${sample}, …).`,
    );
  }
  return id;
}
