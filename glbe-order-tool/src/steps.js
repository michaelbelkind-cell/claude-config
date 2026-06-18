// One function per API call in the order/RMA lifecycle. Each takes the loaded
// config plus the params it needs, and returns the value the next step consumes.

import { request } from './client.js';
import { buildTemplatePayload } from '../data/payloadTemplate.js';

// 1. Look up a merchant's GUID from its return-configuration.
export async function getMerchantGuid(config, merchantId) {
  const url = `${config.connectBase}/api/v1/merchants/return-configuration`;
  const data = await request('POST', url, {
    headers: { AuthToken: config.authToken, 'Content-Type': 'application/json' },
    body: { MerchantIds: [Number(merchantId)] },
  });

  const configs = data?.MerchantConfigurations || {};
  const raw = configs[merchantId] ?? configs[String(merchantId)];
  if (raw === undefined) {
    throw new Error(`No MerchantConfiguration returned for merchant ${merchantId}`);
  }
  const merchantData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const guid = merchantData?.Merchant?.MerchantGUID;
  if (!guid) throw new Error(`MerchantGUID not found for merchant ${merchantId}`);
  return guid;
}

// 2. Build the order template; returns the full response used as the order body.
export async function createTemplate(config, params) {
  const url = `${config.orderCreationBase}/Template`;
  return request('POST', url, {
    headers: {
      accept: '*/*',
      'X-API-KEY': config.apiKey,
      'Content-Type': 'application/json-patch+json',
    },
    body: buildTemplatePayload(params),
  });
}

// 3. Create the order from the template response; returns the new OrderId.
export async function createOrder(config, templateResponse) {
  const url = `${config.orderCreationBase}/Orders`;
  const data = await request('POST', url, {
    headers: {
      accept: '*/*',
      'X-API-KEY': config.apiKey,
      'Content-Type': 'application/json-patch+json',
    },
    body: templateResponse,
  });
  const orderId = data?.OrderId;
  if (!orderId) throw new Error('No OrderId in create-order response');
  return orderId;
}

// 4. Create the parcel fulfilment / shipping documents.
export async function fulfillParcel(config, { orderId, productCode, deliveryQuantity, merchantGuid }) {
  const url = `${config.connectBase}/Order/GetShippingDocuments?merchantGUID=${encodeURIComponent(
    merchantGuid,
  )}`;
  return request('POST', url, {
    headers: { 'Content-Type': 'application/json' },
    body: {
      OrderId: orderId,
      Parcels: [
        { ParcelCode: 'P1', Products: [{ ProductCode: productCode, DeliveryQuantity: deliveryQuantity }] },
      ],
    },
  });
}

// 5/7. Update order status (status is passed as a JSON-encoded query param).
export async function updateOrderStatus(config, { orderId, merchantGuid, statusCode, name }) {
  const status = JSON.stringify({
    OrderId: orderId,
    OrderStatus: { OrderStatusCode: statusCode, Name: name },
  });
  const url =
    `${config.connectBase}/Order/UpdateOrderStatus` +
    `?MerchantGUID=${encodeURIComponent(merchantGuid)}` +
    `&orderStatus=${encodeURIComponent(status)}`;
  return request('POST', url, { headers: { 'Content-Type': 'application/json' } });
}

// 6. Dispatch one or more orders.
export async function dispatchOrders(config, { orderIds, merchantGuid }) {
  const url = `${config.connectBase}/Order/DispatchOrders?merchantGUID=${encodeURIComponent(
    merchantGuid,
  )}`;
  return request('POST', url, {
    headers: { 'Content-Type': 'application/json' },
    body: { OrderIds: orderIds },
  });
}

// 8. Create a return (RMA) for a delivered order.
export async function createReturn(
  config,
  {
    orderId,
    productCode,
    merchantGuid,
    email = 'Automation.Bot@gmail.com',
    merchantRmaNumber,
    returnQuantity = 1,
    shippingCost = 15.0,
    currencyCode = 'USD',
  },
) {
  const url = `${config.connectBase}/Return/GetReturnDocuments?merchantGUID=${encodeURIComponent(
    merchantGuid,
  )}`;
  return request('POST', url, {
    headers: { 'Content-Type': 'application/json', MerchantGUID: merchantGuid },
    body: {
      ProviderCode: 'LOOP',
      OrderId: orderId,
      Email: email,
      MerchantRmaNumber: merchantRmaNumber ?? `RMA-${Date.now()}`,
      ShippingCost: shippingCost,
      CurrencyCode: currencyCode,
      ReturnShippingTypeId: 2,
      ReturnShippingMethodID: 40060181,
      IsReturnForService: 0,
      ReturnedProducts: [
        {
          ProductCode: productCode,
          ReturnQuantity: returnQuantity,
          MerchantReturnReasonCode: 'Wrong Item',
          MerchantReturnReasonDescription: 'Wrong Item',
        },
      ],
    },
  });
}
