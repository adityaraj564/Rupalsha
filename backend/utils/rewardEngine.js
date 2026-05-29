// Reward engine.
//
// Single source of truth for the post-purchase scratch-card reward:
//   - reward pool (what's on each card + weights)
//   - probability resolution with the global anti-frustration override
//   - the deferred-credit timing rule
//
// Keep all reward math here so the route handlers stay thin.
//
// Historical note: this module also used to drive "welcome" and "comeback"
// reward pools. Those flows have been retired — the scratch card now only
// appears after a successful order. The Reward model enum still accepts the
// legacy types so historical rows render correctly on the rewards page.

const RETURN_WINDOW_DAYS = 7;
const LOSS_STREAK_LIMIT = 5;

// Each entry is one possible scratch reveal. `label` is what the user sees,
// `amount` is the wallet credit (0 for Better Luck), `weight` is the raw
// probability share within its pool. Weight-0 entries are decorative only
// and can never be picked.
//
// Real probabilities:
//   post_purchase: ₹10 35%, ₹15 20%, ₹20 6%, ₹25 4%, BL 35%
const REWARD_POOLS = {
  post_purchase: [
    { label: '₹10',         amount: 10, weight: 18 },
    { label: '₹15',         amount: 15, weight: 10 },
    { label: 'Better Luck', amount: 0,  weight: 18 },
    { label: '₹20',         amount: 20, weight: 6  },
    { label: '₹10',         amount: 10, weight: 17 },
    { label: '₹25',         amount: 25, weight: 4  },
    { label: 'Better Luck', amount: 0,  weight: 17 },
    { label: '₹15',         amount: 15, weight: 10 },
  ],
};

// Smallest winning amount for each pool — used by the anti-frustration
// override (when a loss streak hits the limit, we force the cheapest win
// instead of the cheapest entry overall).
const FALLBACK_WIN_AMOUNT = {
  post_purchase: 10,
};

// Weighted random pick of an index from a pool.
function pickIndex(pool) {
  const total = pool.reduce((s, entry) => s + entry.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    r -= pool[i].weight;
    if (r <= 0) return i;
  }
  return pool.length - 1;
}

// Public: resolve the reward outcome. Pure function except for the global
// counter read which the caller passes in.
//
// Returns { index, entry, forcedWin } so the caller can both credit the
// wallet AND tell the client which entry was picked.
function resolveReward(type, counterDoc) {
  const pool = REWARD_POOLS[type];
  if (!pool) throw new Error(`Unknown reward type: ${type}`);

  let index = pickIndex(pool);
  let entry = pool[index];
  let forcedWin = false;

  // Anti-frustration: if the user landed on a losing entry AND the global
  // loss streak has already hit the limit, swap the result for the smallest
  // win in this pool. Guarantees at least one win in every N+1 attempts.
  const isLoss = entry.amount === 0;
  if (isLoss && counterDoc.consecutiveLosses >= LOSS_STREAK_LIMIT) {
    const fallbackAmt = FALLBACK_WIN_AMOUNT[type];
    const fallbackIdx = pool.findIndex((s) => s.amount === fallbackAmt);
    if (fallbackIdx >= 0) {
      index = fallbackIdx;
      entry = pool[fallbackIdx];
      forcedWin = true;
    }
  }

  return { index, entry, forcedWin };
}

// Returns the safe "credit on" date for a post-purchase reward given the
// order delivery date. We add the public return window so the credit only
// lands once the customer can no longer return the order.
function creditableAtFor(deliveredAt) {
  if (!deliveredAt) return null;
  const dt = new Date(deliveredAt);
  dt.setDate(dt.getDate() + RETURN_WINDOW_DAYS);
  return dt;
}

module.exports = {
  REWARD_POOLS,
  RETURN_WINDOW_DAYS,
  LOSS_STREAK_LIMIT,
  resolveReward,
  creditableAtFor,
};
