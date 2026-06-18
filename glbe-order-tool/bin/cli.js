#!/usr/bin/env node
// CLI entry point. Two commands:
//   create-orders   bulk-create N orders (optionally returning each)
//   create-returns  create returns for an explicit list of order IDs

import { loadConfig } from '../src/config.js';
import { createBulkOrders, returnOrders } from '../src/flows.js';
import { getMerchantGuid } from '../src/steps.js';
import { saveResults } from '../src/results.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true; // boolean flag
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function requireArg(args, name) {
  if (args[name] === undefined) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return args[name];
}

const USAGE = `
glbe-order-tool — internal order/RMA creation tool

Usage:
  node bin/cli.js create-orders  --merchant <id> --product <code> [options]
  node bin/cli.js create-returns --merchant <id> --product <code> --orders <id1,id2,...>

create-orders options:
  --merchant <id>      (required) merchant id, e.g. 275
  --product <code>     (required) product code, e.g. 701644329402M
  --count <n>          number of orders to create (default 1)
  --qty <n>            shorthand: sets both ordered & delivery quantity (default 2)
  --ordered-qty <n>    ordered quantity (overrides --qty)
  --delivery-qty <n>   delivery quantity (overrides --qty)
  --country <code>     destination country code (default DE)
  --currency <code>    currency code (default EUR)
  --with-returns       create a return (RMA) for each successful order
  --email <addr>       email for returns (default Automation.Bot@gmail.com)

create-returns options:
  --merchant <id>     (required)
  --product <code>    (required)
  --orders <list>     (required) comma-separated order ids
  --email <addr>      (default Automation.Bot@gmail.com)

Environment (.env): GLBE_ENV, GLBE_AUTH_TOKEN, GLBE_API_KEY, GLBE_ALLOW_NON_QA
`;

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  const wantsHelp = ['help', '--help', '-h'].includes(command) || args.help;
  if (!command || wantsHelp) {
    console.log(USAGE);
    process.exit(wantsHelp ? 0 : 1);
  }

  const KNOWN_COMMANDS = ['create-orders', 'create-returns'];
  if (!KNOWN_COMMANDS.includes(command)) {
    console.error(`Unknown command: ${command}`);
    console.log(USAGE);
    process.exit(1);
  }

  const config = loadConfig();
  console.log(`Environment: ${config.envName}`);

  const country = args.country ?? 'DE';

  if (command === 'create-orders') {
    const merchantId = requireArg(args, 'merchant');
    const productCode = requireArg(args, 'product');
    const count = Number(args.count ?? 1);
    const orderedQuantity = Number(args['ordered-qty'] ?? args.qty ?? 2);
    const deliveryQuantity = Number(args['delivery-qty'] ?? args.qty ?? 2);

    const params = {
      merchantId,
      productCode,
      countryCode: country,
      currencyCode: args.currency ?? 'EUR',
      orderedQuantity,
      deliveryQuantity,
    };

    const { merchantGuid, orders, failures } = await createBulkOrders(config, params, count);
    console.log(`\nCreated ${orders.length}/${count} orders: ${orders.join(', ') || '(none)'}`);
    if (failures.length) console.log(`Failures: ${failures.length}`);

    let returnResults = [];
    if (args['with-returns'] && orders.length) {
      console.log('\nCreating returns...');
      returnResults = await returnOrders(config, {
        merchantGuid,
        orderIds: orders,
        productCode,
        email: args.email,
      });
    }

    const returnsByOrder = new Map(returnResults.map((r) => [r.orderId, r]));
    const records = orders.map((orderId) => {
      const ret = returnsByOrder.get(orderId);
      return {
        timestamp: new Date().toISOString(),
        env: config.envName,
        merchantId,
        merchantGuid,
        productCode,
        country,
        orderedQuantity,
        deliveryQuantity,
        orderId,
        returned: ret ? Boolean(ret.ok) : false,
        rmaNumber: ret?.rmaNumber,
        rmaTracking: ret?.tracking,
      };
    });
    const saved = saveResults(records);
    if (saved) console.log(`\nSaved ${records.length} record(s) to:\n  ${saved.csv}\n  ${saved.json}`);
  } else if (command === 'create-returns') {
    const merchantId = requireArg(args, 'merchant');
    const productCode = requireArg(args, 'product');
    const orderIds = String(requireArg(args, 'orders'))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Returns need a MerchantGUID; fetch it via a step directly.
    const merchantGuid = await getMerchantGuid(config, merchantId);
    const returnResults = await returnOrders(config, {
      merchantGuid,
      orderIds,
      productCode,
      email: args.email,
    });

    const records = returnResults.map((ret) => ({
      timestamp: new Date().toISOString(),
      env: config.envName,
      merchantId,
      merchantGuid,
      productCode,
      country,
      orderedQuantity: '',
      deliveryQuantity: '',
      orderId: ret.orderId,
      returned: Boolean(ret.ok),
      rmaNumber: ret.rmaNumber,
      rmaTracking: ret.tracking,
    }));
    const saved = saveResults(records);
    if (saved) console.log(`\nSaved ${records.length} record(s) to:\n  ${saved.csv}\n  ${saved.json}`);
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
