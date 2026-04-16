'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { adminAPI, categoriesAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');

  // Category state
  const [allCategories, setAllCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [childCategories, setChildCategories] = useState([]);

  const [form, setForm] = useState({
    name: '', description: '', price: '', comparePrice: '', category: '',
    subcategory: '', childCategory: '', categoryRef: '',
    fabric: '', careInstructions: '', isFeatured: false, isTrending: false,
    sizes: SIZES.map(s => ({ size: s, stock: 0 })),
    tags: '', sku: '', lowStockThreshold: '5',
    returnPolicy: '7-day easy return policy. Product must be unused with original tags.',
    shippingCharge: '0',
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

  const fetchCategories = async () => {
    try {
      const data = await adminAPI.getCategories();
      setAllCategories(data.categories);
      setMainCategories(data.categories.filter(c => c.level === 0));
    } catch (err) {
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  // Update subcategories when main category changes
  useEffect(() => {
    if (form.category) {
      const mainCat = allCategories.find(c => c.name === form.category && c.level === 0);
      if (mainCat) {
        const subs = allCategories.filter(c => c.parent === mainCat._id || (c.parent && c.parent.toString() === mainCat._id.toString()));
        setSubCategories(subs);
      } else {
        setSubCategories([]);
      }
    } else {
      setSubCategories([]);
    }
    setChildCategories([]);
  }, [form.category, allCategories]);

  // Update child categories when subcategory changes
  useEffect(() => {
    if (form.subcategory) {
      const subCat = allCategories.find(c => c.name === form.subcategory && c.level === 1);
      if (subCat) {
        const children = allCategories.filter(c => c.parent === subCat._id || (c.parent && c.parent.toString() === subCat._id.toString()));
        setChildCategories(children);
      } else {
        setChildCategories([]);
      }
    } else {
      setChildCategories([]);
    }
  }, [form.subcategory, allCategories]);

  // Set categoryRef when selections change
  useEffect(() => {
    let ref = '';
    if (form.childCategory) {
      const child = allCategories.find(c => c.name === form.childCategory && c.level === 2);
      if (child) ref = child._id;
    } else if (form.subcategory) {
      const sub = allCategories.find(c => c.name === form.subcategory && c.level === 1);
      if (sub) ref = sub._id;
    } else if (form.category) {
      const main = allCategories.find(c => c.name === form.category && c.level === 0);
      if (main) ref = main._id;
    }
    setForm(prev => ({ ...prev, categoryRef: ref }));
  }, [form.category, form.subcategory, form.childCategory, allCategories]);

  const resetForm = () => {
    setForm({
      name: '', description: '', price: '', comparePrice: '', category: '',
      subcategory: '', childCategory: '', categoryRef: '',
      fabric: '', careInstructions: '', isFeatured: false, isTrending: false,
      sizes: SIZES.map(s => ({ size: s, stock: 0 })),
      tags: '', sku: '', lowStockThreshold: '5',
      returnPolicy: '7-day easy return policy. Product must be unused with original tags.',
      shippingCharge: '0',
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
      category: product.category || '',
      subcategory: product.subcategory || '',
      childCategory: product.childCategory || '',
      categoryRef: product.categoryRef || '',
      fabric: product.fabric || '',
      careInstructions: product.careInstructions || '',
      isFeatured: product.isFeatured,
      isTrending: product.isTrending,
      sizes: SIZES.map(s => {
        const existing = product.sizes?.find(ps => ps.size === s);
        return { size: s, stock: existing?.stock || 0 };
      }),
      tags: product.tags?.join(', ') || '',
      sku: product.sku || '',
      lowStockThreshold: product.lowStockThreshold || '5',
      returnPolicy: product.returnPolicy || '7-day easy return policy. Product must be unused with original tags.',
      shippingCharge: product.shippingCharge || '0',
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
    if (form.sku) formData.append('sku', form.sku);
    if (form.lowStockThreshold) formData.append('lowStockThreshold', form.lowStockThreshold);
    formData.append('returnPolicy', form.returnPolicy);
    formData.append('shippingCharge', form.shippingCharge);
    formData.append('category', form.category);
    if (form.subcategory) formData.append('subcategory', form.subcategory);
    if (form.childCategory) formData.append('childCategory', form.childCategory);
    if (form.categoryRef) formData.append('categoryRef', form.categoryRef);
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

              {/* Hierarchical Category Selection */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-semibold text-gray-700">Category Assignment</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Main Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '', childCategory: '' })}
                      className="input-field text-sm py-2"
                      required
                    >
                      <option value="">Select...</option>
                      {mainCategories.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Sub Category</label>
                    <select
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value, childCategory: '' })}
                      className="input-field text-sm py-2"
                      disabled={!form.category || subCategories.length === 0}
                    >
                      <option value="">Select...</option>
                      {subCategories.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Child Category</label>
                    <select
                      value={form.childCategory}
                      onChange={(e) => setForm({ ...form, childCategory: e.target.value })}
                      className="input-field text-sm py-2"
                      disabled={!form.subcategory || childCategories.length === 0}
                    >
                      <option value="">Select...</option>
                      {childCategories.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.category && (
                  <p className="text-xs text-gray-400">
                    Path: {[form.category, form.subcategory, form.childCategory].filter(Boolean).join(' → ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fabric</label>
                <input type="text" value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} className="input-field" />
              </div>

              {/* Inventory Management */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-semibold text-gray-700">Inventory</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">SKU (Stock Keeping Unit)</label>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      className="input-field text-sm py-2"
                      placeholder="e.g. ACC-JWL-EAR-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      value={form.lowStockThreshold}
                      onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                      className="input-field text-sm py-2"
                      min="0"
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-600">Sizes & Stock *</label>
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

                {/* Total Stock Summary */}
                {(() => {
                  const totalStock = form.sizes.reduce((sum, s) => sum + (parseInt(s.stock) || 0), 0);
                  const threshold = parseInt(form.lowStockThreshold) || 5;
                  return (
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                      <div className="text-sm">
                        Total Stock: <span className={`font-semibold ${totalStock === 0 ? 'text-red-500' : totalStock <= threshold ? 'text-amber-500' : 'text-green-600'}`}>{totalStock}</span>
                      </div>
                      {totalStock === 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Out of Stock</span>}
                      {totalStock > 0 && totalStock <= threshold && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Low Stock</span>}
                      {totalStock > threshold && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">In Stock</span>}
                    </div>
                  );
                })()}
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium mb-1">Images (max 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    const existingCount = editingProduct?.images?.length || 0;
                    const maxNew = 5 - existingCount;
                    if (files.length > maxNew) {
                      toast.error(`You can upload up to ${maxNew} more image${maxNew !== 1 ? 's' : ''} (${existingCount} existing)`);
                      setImages(files.slice(0, maxNew));
                    } else {
                      setImages(files);
                    }
                  }}
                  className="input-field"
                />
                {images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {images.map((file, i) => (
                      <div key={i} className="relative w-16 h-20 rounded-lg overflow-hidden border">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-bl"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                {editingProduct?.images?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">{editingProduct.images.length} existing image{editingProduct.images.length !== 1 ? 's' : ''}</p>
                    <div className="flex gap-2 flex-wrap">
                      {editingProduct.images.map((img, i) => (
                        <div key={i} className="relative w-16 h-20 rounded-lg overflow-hidden border">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="wedding, festive, premium" />
              </div>

              {/* Return Policy & Shipping */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Return Policy</label>
                  <textarea
                    value={form.returnPolicy}
                    onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="e.g. 7-day easy return policy..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shipping Charge (₹)</label>
                  <input
                    type="number"
                    value={form.shippingCharge}
                    onChange={(e) => setForm({ ...form, shippingCharge: e.target.value })}
                    className="input-field"
                    min="0"
                    placeholder="0 for free shipping"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{Number(form.shippingCharge) === 0 ? 'Free Shipping' : `₹${form.shippingCharge} shipping`}</p>
                </div>
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
                const catPath = [product.category, product.subcategory, product.childCategory].filter(Boolean).join(' → ');
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
                    <td className="p-4">
                      <span className="text-gray-600 text-xs">{catPath}</span>
                    </td>
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
