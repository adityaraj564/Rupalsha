'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';

const BANGLE_SIZES = {
  '2.2': { diameter: '56 mm', circumference: '176 mm' },
  '2.4': { diameter: '60 mm', circumference: '189 mm' },
  '2.6': { diameter: '65 mm', circumference: '204 mm' },
  '2.8': { diameter: '70 mm', circumference: '220 mm' },
  '2.10': { diameter: '75 mm', circumference: '236 mm' },
};

const RING_SIZES = {
  '5': { diameter: '15.7 mm', circumference: '49.3 mm' },
  '6': { diameter: '16.5 mm', circumference: '51.8 mm' },
  '7': { diameter: '17.3 mm', circumference: '54.4 mm' },
  '8': { diameter: '18.1 mm', circumference: '57.0 mm' },
  '9': { diameter: '18.9 mm', circumference: '59.5 mm' },
  '10': { diameter: '19.8 mm', circumference: '62.1 mm' },
  '11': { diameter: '20.6 mm', circumference: '64.6 mm' },
  '12': { diameter: '21.4 mm', circumference: '67.2 mm' },
  '13': { diameter: '22.2 mm', circumference: '69.7 mm' },
  '14': { diameter: '23.0 mm', circumference: '72.3 mm' },
  '15': { diameter: '23.8 mm', circumference: '74.8 mm' },
  '16': { diameter: '24.6 mm', circumference: '77.4 mm' },
  '17': { diameter: '25.4 mm', circumference: '79.9 mm' },
  '18': { diameter: '26.2 mm', circumference: '82.5 mm' },
};

export default function SizeGuideModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('bangle');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 md:p-8 animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-semibold">Size Guide</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('bangle')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'bangle' ? 'bg-brand-green text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            Bangles
          </button>
          <button
            onClick={() => setTab('ring')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'ring' ? 'bg-brand-green text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            Rings
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-3 font-semibold">Size</th>
              <th className="text-center py-3 font-semibold">Diameter</th>
              <th className="text-center py-3 font-semibold">Circumference</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(tab === 'bangle' ? BANGLE_SIZES : RING_SIZES).map(([size, m]) => (
              <tr key={size} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 font-medium">{size}</td>
                <td className="py-3 text-center text-gray-600 dark:text-gray-300">{m.diameter}</td>
                <td className="py-3 text-center text-gray-600 dark:text-gray-300">{m.circumference}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 p-4 bg-brand-cream dark:bg-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-brand-charcoal dark:text-gray-100 mb-1">How to measure:</p>
          {tab === 'bangle' ? (
            <ul className="list-disc list-inside space-y-1">
              <li>Measure the inner diameter of an existing bangle that fits well</li>
              <li>Or wrap a measuring tape around your hand at the widest point (thumb tucked)</li>
              <li>Common Indian sizes: 2.2 (small), 2.4 (medium), 2.6 (large)</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              <li>Wrap a thin strip of paper around your finger</li>
              <li>Mark where it overlaps, then measure the length in mm</li>
              <li>Match the circumference to find your ring size</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
