'use client';

import { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { FiX, FiImage, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { returnsAPI } from '@/lib/api';

const REASONS = [
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'damaged', label: 'Item damaged / defective' },
  { value: 'missing_parts', label: 'Item missing parts / incomplete' },
  { value: 'size_issue', label: "Doesn't fit / size issue" },
  { value: 'different_from_description', label: 'Item different from description' },
];

const MAX_IMAGES = 4;

const itemKey = (it) => `${String(it.product?._id || it.product || '')}|${it.size || ''}`;

export default function ReturnModal({ order, onClose, onSuccess, returnedKeys = [] }) {
  const isCod = order?.paymentMethod === 'cod';

  // Items already covered by another return (non-rejected). Hidden from selection.
  const returnedSet = useMemo(() => new Set(returnedKeys), [returnedKeys]);
  const availableItems = useMemo(
    () => (order?.items || []).filter((it) => !returnedSet.has(itemKey(it))),
    [order, returnedSet]
  );

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);           // File[]
  const [refundMethod, setRefundMethod] = useState('wallet');
  const [submitting, setSubmitting] = useState(false);
  // Selection: default all available items selected
  const [selectedKeys, setSelectedKeys] = useState(
    () => new Set(availableItems.map(itemKey))
  );
  const imageInputRef = useRef(null);

  const toggleItem = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onPickImages = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    if (files.length > remaining) {
      toast.error(`You can upload up to ${MAX_IMAGES} images`);
    }
    const accepted = files.slice(0, remaining).filter((f) => f.type.startsWith('image/'));
    setImages((prev) => [...prev, ...accepted]);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) return toast.error('Please select a reason');
    if (selectedKeys.size === 0) {
      return toast.error('Please select at least one product to return');
    }
    if (images.length === 0) {
      return toast.error('Please upload at least one image as evidence');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('orderId', order._id);
      fd.append('reason', reason);
      if (description.trim()) fd.append('description', description.trim());
      const items = availableItems
        .filter((it) => selectedKeys.has(itemKey(it)))
        .map((it) => ({
          product: it.product?._id || it.product,
          name: it.name,
          image: it.image,
          size: it.size,
          quantity: it.quantity,
          price: it.price,
        }));
      fd.append('items', JSON.stringify(items));
      fd.append('refundMethod', isCod ? 'wallet' : refundMethod);
      images.forEach((img) => fd.append('images', img));

      const res = await returnsAPI.create(fd);
      toast.success('Return request submitted. Our team will review it shortly.');
      onSuccess?.(res.return);
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl my-8 shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800">
          <h2 className="font-serif text-xl font-semibold">Return / Refund Request</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <FiX size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Item selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select item(s) to return *
            </label>
            {availableItems.length === 0 ? (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 text-sm">
                All items in this order are already part of an active or completed return.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableItems.map((it) => {
                  const key = itemKey(it);
                  const checked = selectedKeys.has(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                        checked
                          ? 'border-brand-green bg-green-50/50 dark:bg-green-900/20'
                          : 'dark:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(key)}
                        className="accent-brand-green w-4 h-4"
                      />
                      <div className="relative w-12 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {it.image && (
                          <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{it.name}</p>
                        <p className="text-xs text-gray-500">
                          Size: {it.size} • Qty: {it.quantity} • ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reason for return *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">Select a reason</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about the issue..."
              className="w-full border rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload photos (max {MAX_IMAGES}) *
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPickImages}
              className="hidden"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(img)} alt={`evidence ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    aria-label="Remove image"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-brand-green hover:text-brand-green transition"
                >
                  <FiImage size={22} />
                  <span className="text-xs mt-1">Add photo</span>
                </button>
              )}
            </div>
          </div>

          {/* Refund method */}
          <div>
            <label className="block text-sm font-medium mb-2">Refund method *</label>
            {isCod ? (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 text-sm">
                Your refund will be credited to your <strong>Rupalsha Wallet</strong> instantly once approved.
                COD orders cannot be refunded to a bank account.
              </div>
            ) : (
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${refundMethod === 'wallet' ? 'border-brand-green bg-green-50/50 dark:bg-green-900/20' : 'dark:border-gray-700'}`}>
                  <input
                    type="radio"
                    name="refundMethod"
                    value="wallet"
                    checked={refundMethod === 'wallet'}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="accent-brand-green mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">Rupalsha Wallet <span className="text-xs text-green-700 dark:text-green-400 ml-1">(Instant)</span></p>
                    <p className="text-xs text-gray-500">Get refund credited instantly. Use balance on your next order.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${refundMethod === 'original' ? 'border-brand-green bg-green-50/50 dark:bg-green-900/20' : 'dark:border-gray-700'}`}>
                  <input
                    type="radio"
                    name="refundMethod"
                    value="original"
                    checked={refundMethod === 'original'}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="accent-brand-green mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">Original payment source</p>
                    <p className="text-xs text-gray-500">Refund will be processed to your original payment account in 5–7 business days.</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tip: Upload clear photos of the issue. This helps us approve your return faster.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || availableItems.length === 0}
            className="px-5 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60 transition"
          >
            {submitting ? 'Submitting...' : 'Submit return request'}
          </button>
        </div>
      </form>
    </div>
  );
}
