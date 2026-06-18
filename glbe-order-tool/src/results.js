// Persists created orders/returns to results/ so developers and testers have a
// shared record of what test data exists. Two formats are written:
//   created-orders.csv   easy to open in Excel/Sheets for testers
//   created-orders.json  accumulating array for programmatic use
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = join(ROOT, 'results');
const CSV_PATH = join(RESULTS_DIR, 'created-orders.csv');
const JSON_PATH = join(RESULTS_DIR, 'created-orders.json');

const COLUMNS = [
  'timestamp',
  'env',
  'merchantId',
  'merchantGuid',
  'productCode',
  'country',
  'orderedQuantity',
  'deliveryQuantity',
  'orderId',
  'returned',
  'rmaNumber',
  'rmaTracking',
];

export function saveResults(records) {
  if (!records || records.length === 0) return null;
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

  // CSV — write the header once.
  if (!existsSync(CSV_PATH)) writeFileSync(CSV_PATH, COLUMNS.join(',') + '\n');
  for (const r of records) {
    appendFileSync(CSV_PATH, COLUMNS.map((c) => csvCell(r[c])).join(',') + '\n');
  }

  // JSON — accumulate into a single array.
  let all = [];
  if (existsSync(JSON_PATH)) {
    try {
      all = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    } catch {
      all = [];
    }
  }
  all.push(...records);
  writeFileSync(JSON_PATH, JSON.stringify(all, null, 2) + '\n');

  return { csv: CSV_PATH, json: JSON_PATH };
}

function csvCell(value) {
  if (value === undefined || value === null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
