'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiSend } from 'react-icons/fi';
import { contactAPI } from '@/lib/api';

const SUBJECT_OPTIONS = [
  'Order enquiry',
  'Product question',
  'Return or refund',
  'Wholesale / bulk',
  'Feedback',
  'Other',
];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: SUBJECT_OPTIONS[0],
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await contactAPI.send(form);
      toast.success('Message sent. We will get back to you soon.');
      setForm({ name: '', email: '', subject: SUBJECT_OPTIONS[0], message: '' });
    } catch (err) {
      toast.error(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4">
      <h2 className="font-serif text-xl font-semibold text-brand-charcoal dark:text-white mb-2">
        Send us a message
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={handleChange('name')}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            placeholder="e.g. Riya Sharma"
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={handleChange('email')}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            placeholder="you@example.com"
            maxLength={150}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          value={form.subject}
          onChange={handleChange('subject')}
          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40"
        >
          {SUBJECT_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={handleChange('message')}
          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40 resize-y"
          placeholder="How can we help?"
          maxLength={5000}
        />
        <p className="text-[11px] text-gray-400 mt-1">{form.message.length} / 5000</p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-green text-white text-sm font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FiSend size={16} />
        {submitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
