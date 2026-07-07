#!/usr/bin/env node
/**
 * Regenerates the billing `country_name` choice options in create-orders.yml
 * from glbe-order-tool/data/countries.json (single source of truth).
 *
 * Run after editing countries.json:
 *   node glbe-order-tool/scripts/sync-workflow-country-options.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { countryNames } from '../data/countries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowPath = join(__dirname, '../../.github/workflows/create-orders.yml');

const START = '          # BEGIN billing country options (auto-generated — do not edit)';
const END = '          # END billing country options';

const optionsBlock = countryNames.map((name) => `          - ${JSON.stringify(name)}`).join('\n');

let yaml = readFileSync(workflowPath, 'utf8');
const pattern = new RegExp(
  `${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
);

if (!pattern.test(yaml)) {
  console.error(`Markers not found in ${workflowPath}. Add ${START} / ${END} around country options.`);
  process.exit(1);
}

yaml = yaml.replace(pattern, `${START}\n${optionsBlock}\n${END}`);
writeFileSync(workflowPath, yaml);
console.log(`Updated ${workflowPath} with ${countryNames.length} billing country options.`);
