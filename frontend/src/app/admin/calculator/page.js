'use client';

import { useMemo, useState } from 'react';
import {
  FiCopy, FiRefreshCw, FiTrendingUp, FiPackage, FiRotateCcw, FiShield,
  FiTruck, FiGlobe, FiTarget, FiCreditCard, FiPercent, FiCheck, FiInfo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ---- Defaults ----------------------------------------------------------
const DEFAULTS = {
  productCost: '',
  returnShippingCost: 120,
  nonReturnShippingCost: 60,
  transportCost: 20,
  websiteCost: 50,
  profit: 150,
  paymentGatewayPercent: 2,
  gatewayGSTPercent: 18,
};

// ---- Helpers -----------------------------------------------------------
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Snap a price to the nearest psychologically-pleasing number (…49/…99).
// e.g. 553 → 549, 491 → 499, 612 → 599, 678 → 699
const psychologicalPrice = (price) => {
  if (price <= 0) return 0;
  const candidates = [];
  // For each "hundreds bucket" around the price, emit the …49 and …99 ladder
  const base = Math.floor(price / 100) * 100;
  for (let b = Math.max(0, base - 100); b <= base + 200; b += 100) {
    candidates.push(b + 49, b + 99);
  }
  // Pick the candidate closest to the price (prefer ≥ price on ties so we don't undersell)
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    if (c <= 0) continue;
    const d = Math.abs(c - price);
    if (d < bestDist || (d === bestDist && c > best)) {
      best = c;
      bestDist = d;
    }
  }
  return best;
};

const calcLine = ({ productCost, shippingCost, transportCost, websiteCost, profit, paymentGatewayPercent, gatewayGSTPercent }) => {
  const subtotal = productCost + shippingCost + transportCost + websiteCost + profit;
  const gatewayCharge = subtotal * (paymentGatewayPercent / 100);
  const gatewayGST = gatewayCharge * (gatewayGSTPercent / 100);
  const finalPrice = subtotal + gatewayCharge + gatewayGST;
  const finalRounded = Math.round(finalPrice);
  const margin = productCost > 0 ? (profit / finalPrice) * 100 : 0;
  return {
    subtotal: Math.round(subtotal),
    gatewayCharge: Math.round(gatewayCharge),
    gatewayGST: Math.round(gatewayGST),
    finalPrice: finalRounded,
    suggested: psychologicalPrice(finalRounded),
    margin,
  };
};

const marginTone = (m) => {
  if (m >= 25) return { color: 'green', label: 'Healthy margin' };
  if (m >= 12) return { color: 'yellow', label: 'Medium margin' };
  return { color: 'red', label: 'Low margin' };
};

const TONE_CLASSES = {
  green: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ring: 'ring-green-500/30',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
  },
  yellow: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    ring: 'ring-amber-500/30',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  red: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    ring: 'ring-red-500/30',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
};

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ---- Reusable bits -----------------------------------------------------
function Field({ icon: Icon, label, hint, value, onChange, prefix = '₹', suffix, required, min = 0, step = 1 }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
        {Icon && <Icon size={14} className="text-brand-green dark:text-brand-gold" />}
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && (
          <span className="text-gray-400 font-normal" title={hint}>
            <FiInfo size={12} />
          </span>
        )}
      </span>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm py-2.5 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'} focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function Row({ label, value, muted, strong }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className={`${muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
        {label}
      </span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
        {value}
      </span>
    </div>
  );
}

function ResultCard({ title, icon: Icon, accent, result, productCost, enabled, disabledMessage }) {
  const tone = marginTone(result.margin);
  const t = TONE_CLASSES[tone.color];
  // Suggested range: ±5% around the suggested psychological price (snapped to …49/99)
  const low = psychologicalPrice(Math.round(result.suggested * 0.95));
  const high = psychologicalPrice(Math.round(result.suggested * 1.05));

  const copyPrice = async () => {
    try {
      await navigator.clipboard.writeText(String(result.suggested));
      toast.success(`Copied ₹${result.suggested}`);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className={`relative rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${!enabled ? 'opacity-60' : ''}`}>
      {/* Accent stripe */}
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} text-white`}>
              <Icon size={18} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${t.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
            {tone.label}
          </span>
        </div>

        {!enabled ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            {disabledMessage}
          </p>
        ) : (
          <>
            {/* Breakdown */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 px-4 py-3 mb-4 divide-y divide-gray-200/60 dark:divide-gray-700/60">
              <Row label="Subtotal (cost + shipping + transport + website + profit)" value={inr(result.subtotal)} muted />
              <Row label="Payment gateway charge" value={inr(result.gatewayCharge)} muted />
              <Row label="GST on gateway charge" value={inr(result.gatewayGST)} muted />
              <Row label="Calculated final price" value={inr(result.finalPrice)} strong />
            </div>

            {/* Hero price */}
            <div className={`relative rounded-2xl p-5 ring-1 ${t.ring} bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900`}>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Suggested selling price
              </p>
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-4xl sm:text-5xl font-bold text-brand-green dark:text-brand-gold tabular-nums">
                    ₹{result.suggested.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Snapped from {inr(result.finalPrice)} (psychological pricing)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyPrice}
                  className="inline-flex items-center gap-2 text-sm font-medium bg-brand-green text-white hover:bg-brand-green/90 px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                >
                  <FiCopy size={15} /> Copy Final Price
                </button>
              </div>
            </div>

            {/* Margin meter */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 dark:text-gray-400">Profit margin</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                  {result.margin.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full ${t.bar} transition-all`}
                  style={{ width: `${Math.max(2, Math.min(100, result.margin))}%` }}
                />
              </div>
            </div>

            {/* Recommended range */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Recommended selling range</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                ₹{low.toLocaleString('en-IN')} – ₹{high.toLocaleString('en-IN')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Page --------------------------------------------------------------
export default function AdminCalculatorPage() {
  const [v, setV] = useState({ ...DEFAULTS });
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [returnEligible, setReturnEligible] = useState(true);

  const setField = (k) => (val) => setV((prev) => ({ ...prev, [k]: val }));

  const reset = () => {
    setV({ ...DEFAULTS });
    setFreeDelivery(false);
    setReturnEligible(true);
    toast.success('Reset to defaults');
  };

  const inputs = useMemo(() => ({
    productCost: toNum(v.productCost),
    returnShippingCost: toNum(v.returnShippingCost),
    nonReturnShippingCost: toNum(v.nonReturnShippingCost),
    // If "Free Delivery" toggle is on, the seller absorbs the transport cost
    // into the price (still counted). It's already counted by default — the
    // toggle simply documents the intent and is reflected in the badge.
    transportCost: toNum(v.transportCost),
    websiteCost: toNum(v.websiteCost),
    profit: toNum(v.profit),
    paymentGatewayPercent: toNum(v.paymentGatewayPercent),
    gatewayGSTPercent: toNum(v.gatewayGSTPercent),
  }), [v]);

  const returnable = useMemo(() => calcLine({
    productCost: inputs.productCost,
    shippingCost: inputs.returnShippingCost,
    transportCost: inputs.transportCost,
    websiteCost: inputs.websiteCost,
    profit: inputs.profit,
    paymentGatewayPercent: inputs.paymentGatewayPercent,
    gatewayGSTPercent: inputs.gatewayGSTPercent,
  }), [inputs]);

  const nonReturnable = useMemo(() => calcLine({
    productCost: inputs.productCost,
    shippingCost: inputs.nonReturnShippingCost,
    transportCost: inputs.transportCost,
    websiteCost: inputs.websiteCost,
    profit: inputs.profit,
    paymentGatewayPercent: inputs.paymentGatewayPercent,
    gatewayGSTPercent: inputs.gatewayGSTPercent,
  }), [inputs]);

  const hasCost = inputs.productCost > 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal dark:text-white flex items-center gap-2">
            <FiTrendingUp className="text-brand-green dark:text-brand-gold" />
            Pricing Calculator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Work out the final selling price for returnable & non-returnable products in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-xl"
        >
          <FiRefreshCw size={15} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <section className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 h-fit lg:sticky lg:top-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiPackage className="text-brand-green dark:text-brand-gold" />
            Product Cost & Settings
          </h2>

          <div className="space-y-4">
            <Field
              icon={FiPackage}
              label="Original Product Cost"
              required
              value={v.productCost}
              onChange={setField('productCost')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                icon={FiRotateCcw}
                label="Return Shipping / Risk"
                hint="Editable — buffer for returnable products"
                value={v.returnShippingCost}
                onChange={setField('returnShippingCost')}
              />
              <Field
                icon={FiShield}
                label="Non-Return Shipping / Risk"
                hint="Editable — buffer for non-returnable products"
                value={v.nonReturnShippingCost}
                onChange={setField('nonReturnShippingCost')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field icon={FiTruck} label="Transport Cost" value={v.transportCost} onChange={setField('transportCost')} />
              <Field icon={FiGlobe} label="Website / App Cost" value={v.websiteCost} onChange={setField('websiteCost')} />
            </div>

            <Field icon={FiTarget} label="Desired Profit" value={v.profit} onChange={setField('profit')} />

            <div className="grid grid-cols-2 gap-3">
              <Field
                icon={FiCreditCard}
                label="Gateway Charge"
                prefix=""
                suffix="%"
                step={0.1}
                value={v.paymentGatewayPercent}
                onChange={setField('paymentGatewayPercent')}
              />
              <Field
                icon={FiPercent}
                label="GST on Gateway"
                prefix=""
                suffix="%"
                step={0.1}
                value={v.gatewayGSTPercent}
                onChange={setField('gatewayGSTPercent')}
              />
            </div>

            {/* Toggles */}
            <div className="pt-2 space-y-2.5">
              <Toggle
                checked={freeDelivery}
                onChange={setFreeDelivery}
                label="Free Delivery"
                description="Display the price as inclusive of shipping"
              />
              <Toggle
                checked={returnEligible}
                onChange={setReturnEligible}
                label="Return Eligible"
                description="Highlight the returnable price as the primary recommendation"
              />
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="lg:col-span-2 space-y-6">
          {!hasCost && (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter an <span className="font-medium text-gray-700 dark:text-gray-200">Original Product Cost</span> to see live pricing.
              </p>
            </div>
          )}

          <ResultCard
            title={`Returnable Product${returnEligible ? ' · Recommended' : ''}`}
            icon={FiRotateCcw}
            accent="bg-brand-green"
            result={returnable}
            productCost={inputs.productCost}
            enabled={hasCost}
            disabledMessage="Awaiting product cost…"
          />

          <ResultCard
            title="Non-Returnable Product"
            icon={FiShield}
            accent="bg-brand-gold"
            result={nonReturnable}
            productCost={inputs.productCost}
            enabled={hasCost}
            disabledMessage="Awaiting product cost…"
          />

          {/* Tag chips for toggles */}
          {hasCost && (
            <div className="flex flex-wrap gap-2">
              {freeDelivery && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <FiCheck size={12} /> Free Delivery
                </span>
              )}
              {returnEligible && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  <FiCheck size={12} /> Return Eligible
                </span>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-600'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  );
}
