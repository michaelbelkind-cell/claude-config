// Persists created orders/returns to results/ so developers and testers have a
// shared record of what test data exists. Writes are INCREMENTAL (one append per
// record) so an interrupted or crashed run keeps everything completed so far.
//
//   created-orders.csv    easy to open in Excel/Sheets for testers
//   created-orders.jsonl  one JSON object per line, append-safe for huge runs
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = join(ROOT, 'results');
const CSV_PATH = join(RESULTS_DIR, 'created-orders.csv');
const JSONL_PATH = join(RESULTS_DIR, 'created-orders.jsonl');

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
  'ok',
  'error',
  'returnError',
];

// Ensure the dir exists and the CSV header is present. Call once before a run.
export function initResults() {
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  if (!existsSync(CSV_PATH)) writeFileSync(CSV_PATH, COLUMNS.join(',') + '\n');
  return { csv: CSV_PATH, jsonl: JSONL_PATH };
}

// Append a single record. appendFileSync is synchronous/atomic per call, so it is
// safe to call from concurrent workers without interleaving partial lines.
export function appendResult(record) {
  appendFileSync(CSV_PATH, COLUMNS.map((c) => csvCell(record[c])).join(',') + '\n');
  appendFileSync(JSONL_PATH, JSON.stringify(record) + '\n');
}

// Read all records from the JSONL results file (for the two-phase workflow).
export function readResults(path = JSONL_PATH) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Orders that were created (ok) but never successfully returned in ANY record —
// i.e. still pending a return. Optionally filter to a single merchant.
export function pendingReturnOrderIds(merchantId, path = JSONL_PATH) {
  const created = new Map(); // orderId -> merchantId
  const returned = new Set();
  for (const r of readResults(path)) {
    if (!r.orderId) continue;
    if (r.ok && r.merchantId !== undefined) created.set(r.orderId, String(r.merchantId));
    if (r.returned) returned.add(r.orderId);
  }
  const ids = [];
  for (const [orderId, mId] of created) {
    if (returned.has(orderId)) continue;
    if (merchantId !== undefined && mId !== String(merchantId)) continue;
    ids.push(orderId);
  }
  return ids;
}

function csvCell(value) {
  if (value === undefined || value === null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
