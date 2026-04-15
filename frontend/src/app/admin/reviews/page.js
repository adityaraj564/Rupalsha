'use client';

import { useEffect, useState } from 'react';
import { FiCheck, FiTrash2, FiStar } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchReviews = async () => {
    try {
      const params = { limit: 50 };
      if (filter) params.approved = filter;
      const data = await adminAPI.getReviews(params);
      setReviews(data.reviews);
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveReview(id);
      setReviews(reviews.map(r => r._id === id ? { ...r, isApproved: true } : r));
      toast.success('Review approved');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review?')) return;
    try {
      await adminAPI.deleteReview(id);
      setReviews(reviews.filter(r => r._id !== id));
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-6">Reviews ({reviews.length})</h1>

      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'All' },
          { value: 'false', label: 'Pending' },
          { value: 'true', label: 'Approved' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === f.value ? 'bg-brand-green text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review._id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{review.user?.name || 'Unknown'}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-sm text-gray-600">{review.product?.name || 'Unknown product'}</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} size={14} className={i < review.rating ? 'text-brand-gold fill-brand-gold' : 'text-gray-300'} />
                  ))}
                </div>
                {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                <p className="text-sm text-gray-600">{review.comment}</p>
                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {review.images.map((img, i) => (
                      <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  {review.isApproved && <span className="ml-2 text-green-600">✓ Approved</span>}
                </p>
              </div>

              <div className="flex gap-2 ml-4">
                {!review.isApproved && (
                  <button
                    onClick={() => handleApprove(review._id)}
                    className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                    title="Approve"
                  >
                    <FiCheck size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review._id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                  title="Delete"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <p className="text-center text-gray-500 py-10">No reviews found</p>
        )}
      </div>
    </div>
  );
}
