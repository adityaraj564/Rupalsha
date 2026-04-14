'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';

const SIZE_CHART = {
  'XS': { bust: '32', waist: '26', hip: '35' },
  'S': { bust: '34', waist: '28', hip: '37' },
  'M': { bust: '36', waist: '30', hip: '39' },
  'L': { bust: '38', waist: '32', hip: '41' },
  'XL': { bust: '40', waist: '34', hip: '43' },
  'XXL': { bust: '42', waist: '36', hip: '45' },
};

export default function SizeGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-semibold">Size Guide</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">All measurements are in inches</p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 font-semibold">Size</th>
              <th className="text-center py-3 font-semibold">Bust</th>
              <th className="text-center py-3 font-semibold">Waist</th>
              <th className="text-center py-3 font-semibold">Hip</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SIZE_CHART).map(([size, measurements]) => (
              <tr key={size} className="border-b border-gray-100">
                <td className="py-3 font-medium">{size}</td>
                <td className="py-3 text-center text-gray-600">{measurements.bust}</td>
                <td className="py-3 text-center text-gray-600">{measurements.waist}</td>
                <td className="py-3 text-center text-gray-600">{measurements.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 p-4 bg-brand-cream rounded-xl text-sm text-gray-600">
          <p className="font-medium text-brand-charcoal mb-1">How to measure:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Bust: Measure around the fullest part of your bust</li>
            <li>Waist: Measure around the narrowest part of your waist</li>
            <li>Hip: Measure around the fullest part of your hips</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
