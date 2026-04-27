/**
 * Lightweight in-process order metrics.
 * --------------------------------------------------------------------------
 * Intentionally simple — counters live in memory and are exposed via
 * `GET /api/admin/order-metrics`. Good enough to spot-check stock-conflict
 * frequency in dev/staging and decide when to migrate to a real metrics
 * pipeline (Prometheus / DataDog / OpenTelemetry).
 *
 * All `log*` helpers also emit a structured JSON line to stdout so the
 * data is captured by any log aggregator the host already has.
 */

const counters = {
  ordersAttempted: 0,
  ordersSucceeded: 0,
  ordersFailed: 0,
  insufficientStock409: 0,
  walletDebitFailed: 0,
  orderCreateFailed: 0,
  // Per-product 409 tally — capped to avoid unbounded growth.
  perProduct409: new Map(),
};

const PER_PRODUCT_CAP = 500;

function log(event, payload = {}) {
  // One JSON line per event. Trivial to grep / ingest.
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
  } catch {
    // never throw from a logger
  }
}

function bumpPerProduct(productId, size) {
  if (!productId) return;
  if (counters.perProduct409.size >= PER_PRODUCT_CAP) return;
  const key = `${productId}:${size || ''}`;
  counters.perProduct409.set(key, (counters.perProduct409.get(key) || 0) + 1);
}

const orderMetrics = {
  attempt(userId) {
    counters.ordersAttempted += 1;
    log('order.attempt', { userId: String(userId) });
  },

  success({ userId, orderId, orderNumber, totalAmount, paymentMethod }) {
    counters.ordersSucceeded += 1;
    log('order.success', {
      userId: String(userId),
      orderId: String(orderId),
      orderNumber,
      totalAmount,
      paymentMethod,
    });
  },

  failure({ userId, step, reason, statusCode, productId, size, requested, available, message }) {
    counters.ordersFailed += 1;
    if (step === 'stock') counters.insufficientStock409 += 1;
    if (step === 'wallet') counters.walletDebitFailed += 1;
    if (step === 'create') counters.orderCreateFailed += 1;
    if (step === 'stock' && productId) bumpPerProduct(productId, size);
    log('order.failure', {
      userId: String(userId),
      step,
      reason,
      statusCode,
      productId: productId ? String(productId) : undefined,
      size,
      requested,
      available,
      message,
    });
  },

  /**
   * Snapshot for the admin endpoint.
   */
  snapshot() {
    const top = [...counters.perProduct409.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, v]) => {
        const [productId, size] = k.split(':');
        return { productId, size, count: v };
      });
    return {
      ordersAttempted: counters.ordersAttempted,
      ordersSucceeded: counters.ordersSucceeded,
      ordersFailed: counters.ordersFailed,
      insufficientStock409: counters.insufficientStock409,
      walletDebitFailed: counters.walletDebitFailed,
      orderCreateFailed: counters.orderCreateFailed,
      successRate:
        counters.ordersAttempted > 0
          ? Math.round((counters.ordersSucceeded / counters.ordersAttempted) * 10000) / 100
          : null,
      topConflicts: top,
    };
  },
};

module.exports = { orderMetrics };
