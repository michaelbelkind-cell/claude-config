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

Create 5 orders for merchant 275:

```bash
node bin/cli.js create-orders --merchant 275 --product 701644329402M --count 5
```

Create 3 orders and immediately return each:

```bash
node bin/cli.js create-orders --merchant 275 --product 701644329402M --count 3 --with-returns
```

Create returns for specific existing orders:

```bash
node bin/cli.js create-returns --merchant 275 --product 701644329402M --orders 12345,12346
```

Run with no command (or `--help`) to see all options.

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

- Some constants in `data/payloadTemplate.js` (`rateData`, `MerchantCartHash`,
  WebStore codes) were captured from a single QA cart and may be merchant- or
  session-specific. Revisit if order creation starts failing.
