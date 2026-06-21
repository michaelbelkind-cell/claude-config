#!/usr/bin/env node
// CLI entry point. Two commands:
//   create-orders   bulk-create N orders (optionally returning each)
//   create-returns  create returns for an explicit list of order IDs

import { loadConfig } from '../src/config.js';
import { runBulk, returnOrders } from '../src/flows.js';
import { getMerchantGuid } from '../src/steps.js';
import { initResults, appendResult, pendingReturnOrderIds } from '../src/results.js';
import { createProgress } from '../src/progress.js';

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
  node bin/cli.js create-returns --merchant <id> --product <code> (--orders <ids> | --from-results) [options]

create-orders options:
  --merchant <id>               (required) merchant id, e.g. 275
  --product <code>              (required) product code, e.g. 701644329402M
  --count <n>                   number of orders to create (default 1)
  --qty <n>                     shorthand: sets ordered & delivery quantity (default 2)
  --ordered-qty <n>             ordered quantity (overrides --qty)
  --delivery-qty <n>            delivery quantity (overrides --qty)
  --country <code>              destination country code (default DE)
  --currency <code>             currency code (default EUR)
  --with-returns                create a return (RMA) for each successful order
  --email <addr>                email for returns (default Automation.Bot@gmail.com)

create-returns options:
  --orders <id1,id2,...>        comma-separated order ids
  --from-results                return all pending orders from the results file
                                (ok + not yet returned, filtered to --merchant)

high-volume / robustness options (both commands):
  --concurrency <n>             parallel workers (default 1 = sequential, like Postman)
  --delay <ms>                  delay between requests (default 2000; paces QA so orders sync to ReturnGo)
  --retries <n>                 retries per failed request (default 4)
  --timeout <ms>                per-request timeout in ms (default 60000)
  --return-retries <n>          retries for return eligibility lag (default 10)
  --return-delay <ms>           base delay between return retries (default 5000)
  --max-consecutive-failures <n> abort run after N order failures in a row (default 50; 0 disables)

Environment (.env): GLBE_ENV, GLBE_AUTH_TOKEN, GLBE_API_KEY, GLBE_ALLOW_NON_QA
Set GLBE_DEBUG=true for per-request logging (noisy; not for big runs).
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

  // Shared robustness settings.
  // Defaults mimic the known-good Postman flow: sequential (concurrency 1) and a
  // 2000ms delay between requests, which lets QA sync each order into ReturnGo.
  const concurrency = Number(args.concurrency ?? 1);
  const reqOpts = {
    retries: Number(args.retries ?? 4),
    timeoutMs: Number(args.timeout ?? 60000),
    retryOnTimeoutBody: true, // retry QA "Execution Timeout Expired" bodies (createOrder opts out)
    delayMs: Number(args.delay ?? 2000),
  };
  // Returns lag behind the "delivered" status under load (QA eventual consistency,
  // observed up to ~2 min). Default to a patient retry window.
  const returnRetry = {
    attempts: Number(args['return-retries'] ?? 10),
    delayMs: Number(args['return-delay'] ?? 5000),
  };
  const maxConsecutiveFailures = Number(args['max-consecutive-failures'] ?? 50);
  const country = args.country ?? 'DE';

  // Track order vs return outcomes separately.
  const tally = { returnsOk: 0, returnsFail: 0 };
  const trackReturns = (record) => {
    if (record.ok && record.returnError) tally.returnsFail++;
    else if (record.returned) tally.returnsOk++;
  };

  // Print failure reasons to the log (deduped so a big run isn't flooded).
  const seenErrors = new Map();
  const logFailure = (record) => {
    const msg = record.error || record.returnError;
    if (!msg) return;
    const key = msg.slice(0, 120);
    const n = (seenErrors.get(key) || 0) + 1;
    seenErrors.set(key, n);
    if (n <= 5) console.error(`✗ ${record.orderId || '(order failed)'}: ${msg.slice(0, 400)}`);
    else if (n === 6) console.error(`  …(further identical errors suppressed)`);
  };

  // Graceful shutdown: first Ctrl+C stops launching new work; second forces exit.
  const controller = new AbortController();
  let interrupted = false;
  process.on('SIGINT', () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    console.error('\n⚠️  Interrupt — finishing in-flight work, then stopping. Press Ctrl+C again to force quit.');
    controller.abort();
  });

  const { csv, jsonl } = initResults();
  const merchantId = requireArg(args, 'merchant');
  const productCode = requireArg(args, 'product');

  if (command === 'create-orders') {
    const count = Number(args.count ?? 1);
    const orderedQuantity = Number(args['ordered-qty'] ?? args.qty ?? 2);
    const deliveryQuantity = Number(args['delivery-qty'] ?? args.qty ?? 2);

    if (count > 100) {
      const perOrderSec = 7 * (reqOpts.delayMs / 1000) + 10; // ~7 paced steps + processing
      const estMin = Math.round((count * perOrderSec) / Math.max(1, concurrency) / 60);
      console.warn(
        `⚠️  ${count} orders, concurrency ${concurrency}, delay ${reqOpts.delayMs}ms ≈ ~${estMin} min. ` +
          `Pacing is intentional so orders sync to ReturnGo — raising concurrency/lowering delay risks RGO sync misses.`,
      );
    }

    const withReturns = Boolean(args['with-returns']);
    const progress = createProgress(count);
    const onResult = (record) => {
      appendResult(record);
      trackReturns(record);
      logFailure(record);
      progress.update(record);
    };

    console.log(
      `Creating ${count} order(s) for merchant ${merchantId} | concurrency ${concurrency} | returns ${withReturns ? 'on' : 'off'}`,
    );

    const { breakerTripped } = await runBulk(config, {
      params: {
        merchantId,
        productCode,
        countryCode: country,
        currencyCode: args.currency ?? 'EUR',
        orderedQuantity,
        deliveryQuantity,
        email: args.email,
      },
      count,
      concurrency,
      withReturns,
      reqOpts,
      returnRetry,
      maxConsecutiveFailures,
      controller,
      onResult,
    });

    progress.finish();
    printSummary(progress.stats(), {
      csv,
      jsonl,
      interrupted,
      breakerTripped,
      returns: withReturns ? tally : null,
    });
  } else if (command === 'create-returns') {
    // Order IDs come either from --orders or from the results file (--from-results).
    let orderIds;
    if (args['from-results']) {
      const path = typeof args['from-results'] === 'string' ? args['from-results'] : undefined;
      orderIds = pendingReturnOrderIds(merchantId, path);
      console.log(`Loaded ${orderIds.length} pending order(s) from results for merchant ${merchantId}`);
      if (orderIds.length === 0) {
        console.log('Nothing to return.');
        return;
      }
    } else {
      orderIds = String(requireArg(args, 'orders'))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const merchantGuid = await getMerchantGuid(config, merchantId, reqOpts);
    const progress = createProgress(orderIds.length);
    const onResult = (record) => {
      appendResult(record);
      logFailure(record);
      progress.update(record);
    };

    console.log(`Creating ${orderIds.length} return(s) | concurrency ${concurrency}`);

    await returnOrders(config, {
      merchantGuid,
      merchantId,
      country,
      orderIds,
      productCode,
      email: args.email,
      concurrency,
      reqOpts,
      returnRetry,
      controller,
      onResult,
    });

    progress.finish();
    printSummary(progress.stats(), { csv, jsonl, interrupted, breakerTripped: false, returns: null });
  }
}

function printSummary(stats, { csv, jsonl, interrupted, breakerTripped, returns }) {
  console.log(
    `\nDone: ${stats.done} processed — orders ${stats.ok} ok, ${stats.fail} failed in ${stats.elapsedSec.toFixed(1)}s`,
  );
  if (returns) {
    console.log(`Returns: ${returns.returnsOk} ok, ${returns.returnsFail} failed`);
  }
  if (interrupted) console.log('(run was interrupted by Ctrl+C)');
  if (breakerTripped) console.log('(run was stopped by the circuit breaker)');
  console.log(`Results:\n  ${csv}\n  ${jsonl}`);
  if (stats.fail > 0 || (returns && returns.returnsFail > 0)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
