/**
 * Google Analytics 4 (GA4) helpers.
 *
 * All helpers are safe no-ops when:
 *   - running on the server (no window),
 *   - the GA Measurement ID env var is missing,
 *   - or the gtag function isn't loaded yet.
 *
 * The GA script itself is injected by `components/Analytics.js`, which
 * also fires automatic `page_view` events on every client-side route
 * change in Next.js' App Router.
 *
 * E-commerce event names + parameter shapes follow GA4's recommended
 * schema:
 *   https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 *
 * Keep the public surface small — every new event we add must map 1:1
 * to a GA4 standard event so it shows up in the built-in e-commerce
 * reports without custom dimensions.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

/** True when GA is configured AND we're on the client. */
export const gaEnabled = () =>
  typeof window !== 'undefined' && !!GA_MEASUREMENT_ID;

/** Low-level passthrough. Prefer the typed helpers below in app code. */
export function gaEvent(name, params = {}) {
  if (!gaEnabled() || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params);
  } catch {
    // never let analytics break the UI
  }
}

/** Manual page_view (auto-fired on route changes by <Analytics />). */
export function gaPageView(url) {
  if (!gaEnabled() || typeof window.gtag !== 'function') return;
  try {
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
  } catch {}
}

// ── E-commerce helpers ──────────────────────────────────────────────
// All helpers accept a single product (or array for purchase) plus
// optional extras and shape them into GA4's `items[]` schema.

const toItem = (p, extras = {}) => ({
  item_id: p?.productCode || p?._id || p?.id || '',
  item_name: p?.name || '',
  item_brand: 'Rupalsha',
  item_category: p?.category?.name || p?.category || undefined,
  price: Number(p?.price) || 0,
  quantity: extras.quantity || 1,
  ...(extras.size ? { item_variant: extras.size } : {}),
});

export function gaViewItem(product) {
  if (!product) return;
  gaEvent('view_item', {
    currency: 'INR',
    value: Number(product.price) || 0,
    items: [toItem(product)],
  });
}

export function gaSelectItem(product, listName) {
  if (!product) return;
  gaEvent('select_item', {
    item_list_name: listName || 'product_grid',
    items: [toItem(product)],
  });
}

export function gaAddToCart(product, { size, quantity = 1 } = {}) {
  if (!product) return;
  gaEvent('add_to_cart', {
    currency: 'INR',
    value: (Number(product.price) || 0) * quantity,
    items: [toItem(product, { size, quantity })],
  });
}

export function gaRemoveFromCart(product, { size, quantity = 1 } = {}) {
  if (!product) return;
  gaEvent('remove_from_cart', {
    currency: 'INR',
    value: (Number(product.price) || 0) * quantity,
    items: [toItem(product, { size, quantity })],
  });
}

export function gaAddToWishlist(product) {
  if (!product) return;
  gaEvent('add_to_wishlist', {
    currency: 'INR',
    value: Number(product.price) || 0,
    items: [toItem(product)],
  });
}

/** Cart items shape: [{ product, size, quantity }] */
export function gaBeginCheckout(cartItems, total) {
  const items = (cartItems || [])
    .map((ci) => ci?.product && toItem(ci.product, { size: ci.size, quantity: ci.quantity }))
    .filter(Boolean);
  gaEvent('begin_checkout', {
    currency: 'INR',
    value: Number(total) || 0,
    items,
  });
}

/** Fires once on the order-success page. Order shape from /api/orders. */
export function gaPurchase(order) {
  if (!order) return;
  const items = (order.items || [])
    .map((it) => toItem(it.product || { name: it.name, _id: it.product, price: it.price }, {
      size: it.size,
      quantity: it.quantity,
    }))
    .filter(Boolean);
  gaEvent('purchase', {
    transaction_id: order.orderNumber || order._id,
    currency: 'INR',
    value: Number(order.totalAmount ?? order.total) || 0,
    tax: Number(order.tax) || 0,
    shipping: Number(order.shippingCost) || 0,
    coupon: order.couponCode || undefined,
    items,
  });
}

export function gaSearch(query) {
  if (!query) return;
  gaEvent('search', { search_term: String(query) });
}

export function gaLogin(method = 'email') {
  gaEvent('login', { method });
}

export function gaSignUp(method = 'email') {
  gaEvent('sign_up', { method });
}
