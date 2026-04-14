'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

const CATEGORIES = ['sarees', 'kurtis', 'lehengas', 'dresses', 'tops', 'bottoms', 'dupattas', 'accessories', 'co-ords'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', price: '', comparePrice: '', category: 'sarees',
    fabric: '', careInstructions: '', isFeatured: false, isTrending: false,
    sizes: SIZES.map(s => ({ size: s, stock: 0 })),
    tags: '',
  });
  const [images, setImages] = useState([]);

  const fetchProducts = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const data = await adminAPI.getProducts(params);
      setProducts(data.products);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setForm({
      name: '', description: '', price: '', comparePrice: '', category: 'sarees',
      fabric: '', careInstructions: '', isFeatured: false, isTrending: false,
      sizes: SIZES.map(s => ({ size: s, stock: 0 })),
      tags: '',
    });
    setImages([]);
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice || '',
      category: product.category,
      fabric: product.fabric || '',
      careInstructions: product.careInstructions || '',
      isFeatured: product.isFeatured,
      isTrending: product.isTrending,
      sizes: SIZES.map(s => {
        const existing = product.sizes?.find(ps => ps.size === s);
        return { size: s, stock: existing?.stock || 0 };
      }),
      tags: product.tags?.join(', ') || '',
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', form.price);
    if (form.comparePrice) formData.append('comparePrice', form.comparePrice);
    formData.append('category', form.category);
    formData.append('fabric', form.fabric);
    formData.append('careInstructions', form.careInstructions);
    formData.append('isFeatured', form.isFeatured);
    formData.append('isTrending', form.isTrending);
    formData.append('sizes', JSON.stringify(form.sizes.filter(s => s.stock > 0)));
    formData.append('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));

    for (const img of images) {
      formData.append('images', img);
    }

    try {
      if (editingProduct) {
        await adminAPI.updateProduct(editingProduct._id, formData);
        toast.success('Product updated');
      } else {
        await adminAPI.createProduct(formData);
        toast.success('Product created');
      }
      setShowForm(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await adminAPI.deleteProduct(id);
      setProducts(products.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateSizeStock = (sizeIndex, stock) => {
    const newSizes = [...form.sizes];
    newSizes[sizeIndex].stock = parseInt(stock) || 0;
    setForm({ ...form, sizes: newSizes });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-charcoal">Products ({products.length})</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-sm py-2 flex items-center gap-2"
        >
          <FiPlus size={16} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
          placeholder="Search products..."
          className="input-field pl-10"
        />
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 p-6">
            <h2 className="font-serif text-xl font-semibold mb-6">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Compare Price (₹)</label>
                  <input type="number" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} className="input-field" min="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fabric</label>
                  <input type="text" value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} className="input-field" />
                </div>
              </div>

              {/* Sizes & Stock */}
              <div>
                <label className="block text-sm font-medium mb-2">Sizes & Stock *</label>
                <div className="grid grid-cols-4 gap-2">
                  {form.sizes.map((s, i) => (
                    <div key={s.size} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-12">{s.size}</span>
                      <input
                        type="number"
                        value={s.stock}
                        onChange={(e) => updateSizeStock(i, e.target.value)}
                        className="input-field py-1.5 text-sm"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium mb-1">Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImages(Array.from(e.target.files))}
                  className="input-field"
                />
                {editingProduct?.images?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{editingProduct.images.length} existing images</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="wedding, festive, premium" />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="accent-brand-green" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isTrending} onChange={(e) => setForm({ ...form, isTrending: e.target.checked })} className="accent-brand-green" />
                  Trending
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">{editingProduct ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const totalStock = product.sizes?.reduce((sum, s) => sum + s.stock, 0) || 0;
                return (
                  <tr key={product._id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0].url} alt="" className="w-12 h-14 object-cover rounded-lg" />
                        )}
                        <div>
                          <p className="font-medium line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 capitalize">{product.category}</td>
                    <td className="p-4">
                      <span className="font-medium">₹{product.price.toLocaleString()}</span>
                      {product.comparePrice && <span className="text-xs text-gray-400 line-through ml-1">₹{product.comparePrice}</span>}
                    </td>
                    <td className="p-4">
                      <span className={totalStock > 0 ? 'text-green-600' : 'text-red-500'}>{totalStock}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {product.isFeatured && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-xs">Featured</span>}
                        {product.isTrending && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-xs">Trending</span>}
                        {!product.isActive && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs">Inactive</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(product)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
