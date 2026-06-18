// Higher-level flows that chain the individual steps.

import * as steps from './steps.js';

// Run one full order lifecycle: template → order → fulfil → received → dispatch → delivered.
// merchantGuid can be passed in to avoid re-fetching it for every order in a bulk run.
export async function createSingleOrder(config, params) {
  const { merchantId, productCode, deliveryQuantity = 2 } = params;
  const merchantGuid = params.merchantGuid ?? (await steps.getMerchantGuid(config, merchantId));

  const template = await steps.createTemplate(config, params);
  const orderId = await steps.createOrder(config, template);

  await steps.fulfillParcel(config, { orderId, productCode, deliveryQuantity, merchantGuid });
  await steps.updateOrderStatus(config, {
    orderId,
    merchantGuid,
    statusCode: 'ReceivedInHub',
    name: 'Received In Hub',
  });
  await steps.dispatchOrders(config, { orderIds: [orderId], merchantGuid });
  await steps.updateOrderStatus(config, {
    orderId,
    merchantGuid,
    statusCode: 'delivered',
    name: 'Delivered to Customer',
  });

  return { orderId, merchantGuid };
}

// Create N orders for one merchant. The MerchantGUID is fetched once and reused.
// Failures are collected, not fatal, so a single bad order doesn't abort the batch.
export async function createBulkOrders(config, params, count) {
  const merchantGuid = await steps.getMerchantGuid(config, params.merchantId);
  const orders = [];
  const failures = [];

  for (let i = 0; i < count; i++) {
    try {
      const { orderId } = await createSingleOrder(config, { ...params, merchantGuid });
      orders.push(orderId);
      console.log(`✓ [${i + 1}/${count}] order ${orderId}`);
    } catch (err) {
      failures.push({ index: i + 1, error: err.message });
      console.error(`✗ [${i + 1}/${count}] ${err.message}`);
    }
  }

  return { merchantGuid, orders, failures };
}

// Create returns (RMAs) for a list of order IDs.
export async function returnOrders(config, { merchantGuid, orderIds, productCode, email }) {
  const results = [];
  for (const orderId of orderIds) {
    try {
      await steps.createReturn(config, { orderId, productCode, merchantGuid, email });
      results.push({ orderId, ok: true });
      console.log(`✓ return for order ${orderId}`);
    } catch (err) {
      results.push({ orderId, ok: false, error: err.message });
      console.error(`✗ return for order ${orderId}: ${err.message}`);
    }
  }
  return results;
}
