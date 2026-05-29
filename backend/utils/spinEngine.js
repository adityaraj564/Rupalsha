// Spin reward engine.
//
// Single source of truth for:
//   - segment definitions (what's on each wheel + weights)
//   - probability resolution with the global anti-frustration override
//   - the post-purchase deferred-credit timing rule
//
// Keep all reward math here so the route handlers stay thin and the wheel
// rendered on the client can read the same segment array via /api/spin/config.

const RETURN_WINDOW_DAYS = 7;
const COMEBACK_INACTIVE_DAYS = 10;
const LOSS_STREAK_LIMIT = 5;

// Each segment renders as a slice on the wheel. `label` is what the user
// sees, `amount` is the wallet credit (0 for Better Luck), `weight` is the
// raw probability share within its stage.
const WHEELS = {
  welcome: [
    { label: '₹5',  amount: 5,  weight: 50 },
    { label: '₹10', amount: 10, weight: 35 },
    { label: '₹15', amount: 15, weight: 15 },
  ],
  post_purchase: [
    { label: '₹10', amount: 10, weight: 35 },
    { label: '₹15', amount: 15, weight: 20 },
    { label: '₹20', amount: 20, weight: 6 },
    { label: '₹25', amount: 25, weight: 4 },
    { label: 'Better Luck', amount: 0, weight: 35 },
  ],
  comeback: [
    { label: '₹5',  amount: 5,  weight: 20 },
    { label: '₹10', amount: 10, weight: 20 },
    { label: '₹15', amount: 15, weight: 10 },
    { label: '₹20', amount: 20, weight: 6 },
    { label: '₹25', amount: 25, weight: 3 },
    { label: 'Better Luck', amount: 0, weight: 41 },
  ],
};

// Smallest winning segment for each wheel — used by the anti-frustration
// override (when a loss streak hits the limit, we force the cheapest win
// instead of the cheapest segment overall, so we never "force" a free spin).
const FALLBACK_WIN_AMOUNT = {
  welcome: 5,         // welcome always wins anyway, included for symmetry
  post_purchase: 10,
  comeback: 5,
};

// Weighted random pick of an index from the wheel array.
function pickIndex(wheel) {
  const total = wheel.reduce((s, seg) => s + seg.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < wheel.length; i += 1) {
    r -= wheel[i].weight;
    if (r <= 0) return i;
  }
  return wheel.length - 1;
}

// Public: resolve the spin outcome. Pure function except for the global
// counter read/update which the caller passes in.
//
// Returns { index, segment, forcedWin } so the caller can both credit the
// wallet AND tell the client which slice to land on (animation correctness).
function resolveSpin(type, counterDoc) {
  const wheel = WHEELS[type];
  if (!wheel) throw new Error(`Unknown spin type: ${type}`);

  let index = pickIndex(wheel);
  let segment = wheel[index];
  let forcedWin = false;

  // Anti-frustration: if the user landed on a losing segment AND the global
  // loss streak has already hit the limit, swap the result for the smallest
  // win on this wheel. This guarantees that within any window of N+1 spins
  // across the platform, at least one is a win.
  const isLoss = segment.amount === 0;
  if (isLoss && counterDoc.consecutiveLosses >= LOSS_STREAK_LIMIT) {
    const fallbackAmt = FALLBACK_WIN_AMOUNT[type];
    const fallbackIdx = wheel.findIndex((s) => s.amount === fallbackAmt);
    if (fallbackIdx >= 0) {
      index = fallbackIdx;
      segment = wheel[fallbackIdx];
      forcedWin = true;
    }
  }

  return { index, segment, forcedWin };
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

// Comeback eligibility: a user qualifies if either they have never spun
// before (no lastSpinAt) or it's been at least 10 days since their last
// spin. Brand new accounts that haven't done the welcome spin yet are
// excluded — welcome takes priority on the client.
function isComebackEligible(user) {
  if (!user) return false;
  if (!user.welcomeSpinAt) return false;
  if (!user.lastSpinAt) return true;
  const ageMs = Date.now() - new Date(user.lastSpinAt).getTime();
  return ageMs >= COMEBACK_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
}

module.exports = {
  WHEELS,
  RETURN_WINDOW_DAYS,
  COMEBACK_INACTIVE_DAYS,
  LOSS_STREAK_LIMIT,
  resolveSpin,
  creditableAtFor,
  isComebackEligible,
};
