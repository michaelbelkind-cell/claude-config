# glbe-order-tool

Internal CLI tool to **bulk-create GLBE orders and returns (RMAs)** against the QA
environment. Ported from the `GLBE Create Order` Postman collection.

It runs the full order lifecycle programmatically:

1. Look up the merchant's **MerchantGUID** (`/api/v1/merchants/return-configuration`)
2. Build the order **Template** (`/Template`)
3. **Create the order** (`/Orders`) → `OrderId`
4. **Fulfil parcel** / shipping docs (`/Order/GetShippingDocuments`)
5. Status → **Received In Hub** (`/Order/UpdateOrderStatus`)
6. **Dispatch** (`/Order/DispatchOrders`)
7. Status → **Delivered** (`/Order/UpdateOrderStatus`)
8. *(optional)* Create **return / RMA** (`/Return/GetReturnDocuments`)

## Requirements

- **Node.js 18+** (uses native `fetch`, no HTTP dependencies)
- One dependency: `dotenv`

## Setup

```bash
cd glbe-order-tool
npm install
cp .env.example .env   # then fill in GLBE_AUTH_TOKEN and GLBE_API_KEY
```

> ⚠️ The QA `AuthToken` / `X-API-KEY` from the original Postman collection were
> shared in plain text — **rotate them** and put the fresh values in `.env`
> (which is gitignored). Never commit secrets.

## Usage

The tool runs in **two modes**:

### Mode 1 — orders only (no RMA)

Runs the order lifecycle through "delivered" and never calls the Return API.

```bash
node bin/cli.js create-orders --merchant 275 --product 701644329402M --count 5
```

### Mode 2 — orders + RMA

Same as above, then creates a return (RMA) for each successful order.

```bash
node bin/cli.js create-orders --merchant 275 --product 701644329402M --count 3 --with-returns
```

### High-volume runs (e.g. 50,000 orders)

The tool is built for large, unstable-environment runs:

- **`--concurrency <n>`** — parallel workers (default 1). Start at 10–25 on QA.
- **Retries + backoff** on timeouts/5xx/network errors (`--retries`, `--timeout`).
- **Crash-safe**: every order/return is written to `results/` immediately, so an
  interrupted run keeps everything completed so far.
- **Circuit breaker**: aborts after N consecutive order failures (`--max-consecutive-failures`, default 50).
- **Graceful stop**: Ctrl+C finishes in-flight work then stops (Ctrl+C twice = force quit).
- **Live progress** with rate + ETA.

**Recommended pattern for big runs WITH returns — two phases.** Returns lag behind
the "delivered" status under load (QA eventual consistency, up to ~2 min), so don't
make every worker block on it. Instead:

```bash
# Phase 1 — create all orders fast (no returns)
node bin/cli.js create-orders --merchant 524 --product 701644329402M --count 50000 --concurrency 20

# Phase 2 — later, return everything still pending (orders have settled, so this is fast)
node bin/cli.js create-returns --merchant 524 --product 701644329402M --from-results --concurrency 20
```

`--from-results` reads orders from `results/` that were created but not yet returned
(filtered to `--merchant`), so it's safe to re-run until nothing is pending.

For smaller runs, inline `--with-returns` is fine — it retries the return through
the eligibility lag automatically (`--return-retries`, `--return-delay`).

### Other examples

Different ordered vs delivery quantity:

```bash
node bin/cli.js create-orders --merchant 524 --product 701644329402M --ordered-qty 2 --delivery-qty 1
```

Create returns for specific existing orders:

```bash
node bin/cli.js create-returns --merchant 275 --product 701644329402M --orders 12345,12346
```

Run with no command (or `--help`) to see all options.

## Results / output

Every run records the orders (and any returns) it created to `results/`:

- `created-orders.csv` — open in Excel/Sheets; one row per order
- `created-orders.json` — accumulating array for programmatic use

Columns: `timestamp, env, merchantId, merchantGuid, productCode, country,
orderedQuantity, deliveryQuantity, orderId, returned, rmaNumber, rmaTracking`.

`results/` **is committed to git** so the whole team can download/copy the file
(e.g. from GitHub → `results/created-orders.csv` → Raw / Download). The files
accumulate across runs; clear them if they get too large.

## Environments

Only **QA** is configured today. `staging`/`prod` are placeholders in
`src/config.js`; running against anything other than QA requires
`GLBE_ALLOW_NON_QA=true` as a safety gate.

## Project layout

```
bin/cli.js              CLI entry + arg parsing
src/config.js           env + secrets loading, environment gate
src/client.js           thin fetch wrapper (logging, error handling)
src/steps.js            one function per API call
src/flows.js            createSingleOrder / createBulkOrders / returnOrders
data/payloadTemplate.js parameterized /Template cart payload
```

## Running via GitHub Actions (on-demand)

Two `workflow_dispatch` workflows live in `.github/workflows/`:

- **Create Orders (GLBE)** — bulk order creation
- **Create Returns (GLBE)** — RMA creation (explicit IDs or `from_results`)

Run them from the repo's **Actions** tab → pick the workflow → **Run workflow** →
fill the inputs. Results are uploaded as a downloadable **artifact** on each run.

### One-time setup (required)

Add the QA secrets under **Settings → Secrets and variables → Actions**:

- `GLBE_AUTH_TOKEN`
- `GLBE_API_KEY`

### Runner choice — ⚠️ you must use a self-hosted runner

The order-creation service (`automation-order-creation-qa.bglobale.com`) lives
behind an **internal gateway on a private 10.x address**, so **GitHub-hosted
runners cannot reach it** (order creation fails with `fetch failed`). Only
`connect-qa.bglobale.com` is public (Cloudflare), which is why merchant lookups
succeed but order creation does not on hosted runners.

- `ubuntu-latest` — ❌ will fail at the Template/Orders step (no route to 10.x).
- `self-hosted` — ✅ **required.** Register a runner on a machine with corp
  network / VPN access to `10.32.x.x` (and outbound internet for checkout/npm).
  Also avoids the hosted 6h job cap, so it's needed for 50k regardless.

Set the workflow's `runner` input to `self-hosted` when dispatching.

### Two-phase for big runs

1. Run **Create Orders** (e.g. count 50000, no returns).
2. Run **Create Returns** with `from_results: true` and `orders_run_id` set to the
   create-orders run's ID — it pulls that run's results artifact and returns all
   pending orders. Re-run until nothing is pending.

## Known caveats

- `WebStoreCode`, `WebStoreInstanceCode` (zymi), `rateData` and `MerchantCartHash`
  were tested against QA and found **not required** for order creation, so they
  were removed from the payload. Verified with merchants 275 and 524 (both on the
  `zymi-007` QA store). A merchant on a different store may need store-specific
  fields reintroduced as parameters.
- Other `data/payloadTemplate.js` defaults (categories, attributes, prices) come
  from one sample product; override via `buildTemplatePayload` options if needed.
