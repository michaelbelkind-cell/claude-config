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

## Known caveats

- `WebStoreCode`, `WebStoreInstanceCode` (zymi), `rateData` and `MerchantCartHash`
  were tested against QA and found **not required** for order creation, so they
  were removed from the payload. Verified with merchants 275 and 524 (both on the
  `zymi-007` QA store). A merchant on a different store may need store-specific
  fields reintroduced as parameters.
- Other `data/payloadTemplate.js` defaults (categories, attributes, prices) come
  from one sample product; override via `buildTemplatePayload` options if needed.
