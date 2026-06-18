// Higher-level flows that chain the individual steps, plus the high-volume
// engine (runBulk) used for large runs.

import * as steps from './steps.js';
import { runPool } from './pool.js';

// Run one full order lifecycle: template → order → fulfil → received → dispatch → delivered.
export async function createSingleOrder(config, params, reqOpts = {}) {
  const { productCode, deliveryQuantity = 2, merchantGuid } = params;

  const template = await steps.createTemplate(config, params, reqOpts);
  const orderId = await steps.createOrder(config, template, reqOpts);

  await steps.fulfillParcel(config, { orderId, productCode, deliveryQuantity, merchantGuid }, reqOpts);
  await steps.updateOrderStatus(
    config,
    { orderId, merchantGuid, statusCode: 'ReceivedInHub', name: 'Received In Hub' },
    reqOpts,
  );
  await steps.dispatchOrders(config, { orderIds: [orderId], merchantGuid }, reqOpts);
  await steps.updateOrderStatus(
    config,
    { orderId, merchantGuid, statusCode: 'delivered', name: 'Delivered to Customer' },
    reqOpts,
  );

  return { orderId, merchantGuid };
}

// The "delivered" status update returns 200 before the backend finishes making the
// order return-eligible (eventual consistency). Retry the return on those specific
// eligibility errors with a growing delay.
function isEligibilityError(err) {
  return /parcel status|was not delivered|E07|PE04/i.test(err?.message || '');
}

async function createReturnResilient(config, args, reqOpts, { attempts, delayMs, signal }) {
  let lastErr;
  for (let a = 1; a <= attempts; a++) {
    if (signal?.aborted) throw lastErr ?? new Error('aborted before return');
    try {
      return await steps.createReturn(config, args, reqOpts);
    } catch (err) {
      lastErr = err;
      if (!isEligibilityError(err) || a === attempts) throw err;
      await sleep(delayMs * a); // 1x, 2x, 3x … give QA time to propagate "delivered"
    }
  }
  throw lastErr;
}

// High-volume engine: create `count` orders (optionally returning each) using a
// bounded worker pool. Each completed order is reported via onResult immediately
// (for incremental saving + progress). Order success and return success are
// tracked separately — a failed return never loses the created OrderId. A circuit
// breaker aborts after `maxConsecutiveFailures` ORDER-creation failures in a row.
export async function runBulk(config, options) {
  const {
    params,
    count,
    concurrency = 1,
    withReturns = false,
    reqOpts = {},
    returnRetry = { attempts: 10, delayMs: 5000 },
    maxConsecutiveFailures = 0,
    controller,
    onResult,
  } = options;

  const merchantGuid = await steps.getMerchantGuid(config, params.merchantId, reqOpts);

  let consecutive = 0;
  let breakerTripped = false;

  await runPool(
    count,
    concurrency,
    async () => {
      if (controller?.signal.aborted) return;

      const base = {
        timestamp: new Date().toISOString(),
        env: config.envName,
        merchantId: params.merchantId,
        merchantGuid,
        productCode: params.productCode,
        country: params.countryCode,
        orderedQuantity: params.orderedQuantity,
        deliveryQuantity: params.deliveryQuantity,
      };

      // --- Order creation (steps 1-7) ---
      let orderId;
      try {
        ({ orderId } = await createSingleOrder(config, { ...params, merchantGuid }, reqOpts));
        consecutive = 0;
      } catch (err) {
        consecutive++;
        onResult?.({
          ...base,
          orderId: '',
          returned: false,
          rmaNumber: '',
          rmaTracking: '',
          ok: false,
          error: err.message,
          returnError: '',
        });
        if (
          maxConsecutiveFailures > 0 &&
          consecutive >= maxConsecutiveFailures &&
          controller &&
          !breakerTripped
        ) {
          breakerTripped = true;
          console.error(
            `\n⛔ Circuit breaker: ${consecutive} consecutive order failures — aborting. Last: ${err.message}`,
          );
          controller.abort();
        }
        return;
      }

      // --- Optional return (step 8), independent of order success ---
      let returned = false;
      let rmaNumber = '';
      let rmaTracking = '';
      let returnError = '';
      if (withReturns) {
        try {
          const r = await createReturnResilient(
            config,
            { orderId, productCode: params.productCode, merchantGuid, email: params.email },
            reqOpts,
            { ...returnRetry, signal: controller?.signal },
          );
          returned = true;
          rmaNumber = r?.Data?.GlobaleRmaNumber ?? '';
          rmaTracking = r?.Data?.ReturnTrackingDetails?.TrackingNumber ?? '';
        } catch (err) {
          returnError = err.message;
        }
      }

      onResult?.({
        ...base,
        orderId,
        returned,
        rmaNumber,
        rmaTracking,
        ok: true, // order WAS created, even if the return failed
        error: '',
        returnError,
      });
    },
    { signal: controller?.signal },
  );

  return { merchantGuid, breakerTripped };
}

// Create returns (RMAs) for an explicit list of order IDs, pooled + incremental.
export async function returnOrders(config, options) {
  const {
    merchantGuid,
    orderIds,
    productCode,
    email,
    concurrency = 1,
    reqOpts = {},
    returnRetry = { attempts: 10, delayMs: 5000 },
    controller,
    onResult,
  } = options;

  await runPool(
    orderIds.length,
    concurrency,
    async (i) => {
      if (controller?.signal.aborted) return;
      const orderId = orderIds[i];
      const base = {
        timestamp: new Date().toISOString(),
        env: config.envName,
        merchantId: options.merchantId,
        merchantGuid,
        productCode,
        country: options.country,
        orderedQuantity: '',
        deliveryQuantity: '',
        orderId,
      };
      try {
        const r = await createReturnResilient(
          config,
          { orderId, productCode, merchantGuid, email },
          reqOpts,
          { ...returnRetry, signal: controller?.signal },
        );
        onResult?.({
          ...base,
          returned: true,
          rmaNumber: r?.Data?.GlobaleRmaNumber ?? '',
          rmaTracking: r?.Data?.ReturnTrackingDetails?.TrackingNumber ?? '',
          ok: true,
          error: '',
          returnError: '',
        });
      } catch (err) {
        onResult?.({
          ...base,
          returned: false,
          rmaNumber: '',
          rmaTracking: '',
          ok: false,
          error: '',
          returnError: err.message,
        });
      }
    },
    { signal: controller?.signal },
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
