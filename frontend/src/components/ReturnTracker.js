'use client';

import { FiCheck, FiClock, FiPackage, FiTruck, FiHome, FiDollarSign, FiX } from 'react-icons/fi';

// Timeline steps shown for a return request.
const STEPS = [
  { key: 'pending', label: 'Requested', icon: FiClock },
  { key: 'approved', label: 'Approved', icon: FiCheck },
  { key: 'pickup_scheduled', label: 'Pickup Scheduled', icon: FiPackage },
  { key: 'picked_up', label: 'Picked Up', icon: FiTruck },
  { key: 'received', label: 'Received', icon: FiHome },
  { key: 'refunded', label: 'Refunded', icon: FiDollarSign },
];

const REASON_LABELS = {
  wrong_item: 'Wrong item received',
  damaged: 'Item damaged / defective',
  missing_parts: 'Item missing parts / incomplete',
  size_issue: "Doesn't fit / size issue",
  different_from_description: 'Item different from description',
};

export default function ReturnTracker({ returnRequest }) {
  if (!returnRequest) return null;

  const { status } = returnRequest;
  const isRejected = status === 'rejected';

  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="card p-5 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold">Return Request #{returnRequest.returnNumber}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Raised {new Date(returnRequest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {returnRequest.reason && ` • ${REASON_LABELS[returnRequest.reason] || returnRequest.reason}`}
          </p>
        </div>
        {isRejected && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            <FiX size={14} /> Rejected
          </span>
        )}
      </div>

      {/* Status message */}
      {status === 'pending' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-5">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Our team is currently reviewing your request. We&apos;ll contact you soon.
          </p>
        </div>
      )}

      {status === 'approved' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Your return has been approved. We&apos;re scheduling the pickup — you&apos;ll see details here shortly.
          </p>
        </div>
      )}

      {status === 'pickup_scheduled' && returnRequest.pickupDate && (
        <div className="bg-brand-cream dark:bg-gray-800 border border-brand-green/20 rounded-lg p-3 mb-5 text-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-medium">Pickup scheduled:</span>{' '}
              {new Date(returnRequest.pickupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {returnRequest.courierName && (
              <div className="text-gray-600 dark:text-gray-400">via {returnRequest.courierName}</div>
            )}
          </div>
          {returnRequest.trackingNumber && (
            <div className="mt-1 text-gray-600 dark:text-gray-400">
              Tracking: <span className="font-mono">{returnRequest.trackingNumber}</span>
            </div>
          )}
        </div>
      )}

      {status === 'picked_up' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-5 text-sm text-green-800 dark:text-green-300">
          The courier has picked up your package. It&apos;s on its way to us.
          {returnRequest.trackingNumber && (
            <div className="mt-1 font-mono">Tracking: {returnRequest.trackingNumber}</div>
          )}
        </div>
      )}

      {status === 'received' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-5 text-sm text-green-800 dark:text-green-300">
          We&apos;ve received your returned item. Refund is being processed.
        </div>
      )}

      {status === 'refunded' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-5 text-sm text-green-800 dark:text-green-300">
          Refund of ₹{returnRequest.refundAmount || '—'} processed on{' '}
          {returnRequest.refundedAt
            ? new Date(returnRequest.refundedAt).toLocaleDateString('en-IN')
            : ''}
          . It should reflect in your account within 5–7 business days.
        </div>
      )}

      {isRejected && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-5 text-sm">
          <p className="font-medium text-red-800 dark:text-red-300">Your return request was not approved.</p>
          {returnRequest.rejectionReason && (
            <p className="text-red-700 dark:text-red-400 mt-1">Reason: {returnRequest.rejectionReason}</p>
          )}
        </div>
      )}

      {/* Timeline */}
      {!isRejected && (
        <div className="relative flex justify-between items-start">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-brand-green transition-all"
            style={{ width: `${Math.max(0, currentIdx) / (STEPS.length - 1) * 100}%` }}
          />
          {STEPS.map((step, i) => {
            const done = i <= currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition ${
                    done
                      ? 'bg-brand-green border-brand-green text-white'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <span
                  className={`text-[11px] md:text-xs mt-2 text-center px-1 ${
                    done ? 'text-brand-green font-medium' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
