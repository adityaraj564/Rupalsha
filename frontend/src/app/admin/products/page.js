'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import { adminAPI, categoriesAPI } from '@/lib/api';
import { AdminTableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';

const JEWELRY_SIZES = ['Free Size', '2.2', '2.4', '2.6', '2.8', '2.10'];
const RING_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
const ALL_SIZES = ['Free Size', ...JEWELRY_SIZES.slice(1), ...RING_SIZES];

// Predefined keys for Product Highlights
const DEFAULT_HIGHLIGHT_KEYS = ['Base Material', 'Color', 'Plating', 'Occasion'];

// Predefined specification groups and their keys
const DEFAULT_SPEC_GROUPS = [
  {
    group: 'General',
    keys: ['Base Material', 'Type', 'Color', 'Ideal For', 'Plating', 'Net Quantity', 'Earring Type', 'Kamarband', 'Maang Tikka', 'Necklace & Chain Type', 'Necklace Clasp Type', 'Payal', 'Pendant Shape', 'Trend'],
  },
  {
    group: 'Product Details',
    keys: ['Sales Package', 'Collection', 'Occasion', 'Finish', 'Weight', 'Other Features', 'Earring Clasp Type', 'Earring Length'],
  },
];

const buildDefaultHighlights = () => DEFAULT_HIGHLIGHT_KEYS.map(key => ({ key, value: '' }));

const buildDefaultSpecs = () => DEFAULT_SPEC_GROUPS.map(g => ({
  group: g.group,
  fields: g.keys.map(key => ({ key, value: '' })),
}));

// Merge existing product highlights with predefined defaults
const mergeHighlights = (existing) => {
  const merged = DEFAULT_HIGHLIGHT_KEYS.map(key => {
    const found = existing.find(h => h.key === key);
    return { key, value: found?.value || '' };
  });
  // Add any custom keys from the product that aren't in defaults
  existing.forEach(h => {
    if (!DEFAULT_HIGHLIGHT_KEYS.includes(h.key)) {
      merged.push({ key: h.key, value: h.value });
    }
  });
  return merged;
};

// Merge existing product specifications with predefined defaults
const mergeSpecifications = (existing) => {
  const merged = DEFAULT_SPEC_GROUPS.map(dg => {
    const existingGroup = existing.find(g => g.group === dg.group);
    const fields = dg.keys.map(key => {
      const found = existingGroup?.fields.find(f => f.key === key);
      return { key, value: found?.value || '' };
    });
    // Add custom fields from this group that aren't in defaults
    if (existingGroup) {
      existingGroup.fields.forEach(f => {
        if (!dg.keys.includes(f.key)) {
          fields.push({ key: f.key, value: f.value });
        }
      });
    }
    return { group: dg.group, fields };
  });
  // Add any custom groups from the product that aren't in defaults
  existing.forEach(g => {
    if (!DEFAULT_SPEC_GROUPS.find(dg => dg.group === g.group)) {
      merged.push({ group: g.group, fields: g.fields.map(f => ({ key: f.key, value: f.value })) });
    }
  });
  return merged;
};

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
    sizes: ALL_SIZES.map(s => ({ size: s, stock: 0 })),
    tags: '', sku: '', lowStockThreshold: '5',
    isReturnable: true,
    returnDays: '7',
    returnPolicy: 'Easy return policy. Product must be unused with original tags. Recording an unboxing video while opening the package is mandatory for return claims.',
    shippingCharge: '0',
    highlights: buildDefaultHighlights(),
    specifications: buildDefaultSpecs(),
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);

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
      sizes: ALL_SIZES.map(s => ({ size: s, stock: 0 })),
      tags: '', sku: '', lowStockThreshold: '5',
      isReturnable: true,
      returnDays: '7',
      returnPolicy: 'Easy return policy. Product must be unused with original tags. Recording an unboxing video while opening the package is mandatory for return claims.',
      shippingCharge: '0',
      highlights: buildDefaultHighlights(),
      specifications: buildDefaultSpecs(),
    });
    setImages([]);
    setVideos([]);
    setExistingImages([]);
    setExistingVideos([]);
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
      sizes: ALL_SIZES.map(s => {
        const existing = product.sizes?.find(ps => ps.size === s);
        return { size: s, stock: existing?.stock || 0 };
      }),
      tags: product.tags?.join(', ') || '',
      sku: product.sku || '',
      lowStockThreshold: product.lowStockThreshold || '5',
      isReturnable: product.isReturnable !== false,
      returnDays: product.returnDays || '7',
      returnPolicy: product.returnPolicy || 'Easy return policy. Product must be unused with original tags. Recording an unboxing video while opening the package is mandatory for return claims.',
      shippingCharge: product.shippingCharge || '0',
      highlights: mergeHighlights(product.highlights || []),
      specifications: mergeSpecifications(product.specifications || []),
    });
    setEditingProduct(product);
    setExistingImages(product.images ? [...product.images] : []);
    setExistingVideos(product.videos ? [...product.videos] : []);
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
    formData.append('isReturnable', form.isReturnable);
    formData.append('returnDays', form.returnDays);
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

    // Filter out empty highlights and specifications
    const validHighlights = form.highlights.filter(h => h.key.trim() && h.value.trim());
    formData.append('highlights', JSON.stringify(validHighlights));

    const validSpecs = form.specifications
      .map(g => ({
        group: g.group.trim(),
        fields: g.fields.filter(f => f.key.trim() && f.value.trim()),
      }))
      .filter(g => g.group && g.fields.length > 0);
    formData.append('specifications', JSON.stringify(validSpecs));

    for (const img of images) {
      formData.append('images', img);
    }
    for (const vid of videos) {
      formData.append('videos', vid);
    }

    // Send image order for existing images when editing
    if (editingProduct && existingImages.length > 0) {
      const order = existingImages.map(img => img.public_id || img.url);
      formData.append('imageOrder', JSON.stringify(order));
    }
    // Send video order for existing videos when editing
    if (editingProduct && existingVideos.length > 0) {
      const order = existingVideos.map((v) => v.public_id || v.url);
      formData.append('videoOrder', JSON.stringify(order));
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

  if (loading) return <AdminTableSkeleton />;

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
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl my-8 p-6">
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
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 1000) })} className="input-field" rows={3} required maxLength={1000} />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/1000</p>
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
                <label className="block text-sm font-medium mb-1">Material</label>
                <input type="text" value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} className="input-field" placeholder="e.g. Gold Plated, 925 Sterling Silver, Brass" />
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
                  
                  {/* Free Size */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">General</p>
                    <div className="grid grid-cols-4 gap-2">
                      {form.sizes.filter(s => s.size === 'Free Size').map((s, _i) => {
                        const i = form.sizes.findIndex(fs => fs.size === s.size);
                        return (
                          <div key={s.size} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-16">{s.size}</span>
                            <input type="number" value={s.stock} onChange={(e) => updateSizeStock(i, e.target.value)} className="input-field py-1.5 text-sm" min="0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bangle Sizes */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bangle Sizes</p>
                    <div className="grid grid-cols-4 gap-2">
                      {form.sizes.filter(s => JEWELRY_SIZES.includes(s.size) && s.size !== 'Free Size').map((s) => {
                        const i = form.sizes.findIndex(fs => fs.size === s.size);
                        return (
                          <div key={s.size} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-16">{s.size}</span>
                            <input type="number" value={s.stock} onChange={(e) => updateSizeStock(i, e.target.value)} className="input-field py-1.5 text-sm" min="0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ring Sizes */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ring Sizes</p>
                    <div className="grid grid-cols-4 gap-2">
                      {form.sizes.filter(s => RING_SIZES.includes(s.size)).map((s) => {
                        const i = form.sizes.findIndex(fs => fs.size === s.size);
                        return (
                          <div key={s.size} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-16">{s.size}</span>
                            <input type="number" value={s.stock} onChange={(e) => updateSizeStock(i, e.target.value)} className="input-field py-1.5 text-sm" min="0" />
                          </div>
                        );
                      })}
                    </div>
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
                <label className="block text-sm font-medium mb-1">Images</label>
                <p className="text-xs text-gray-400 mb-1">Recommended: 600×800 px (3:4 ratio). Use portrait orientation for best display. Auto-compressed without quality loss.</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImages(Array.from(e.target.files))}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Drag images to reorder. First image is the main display image.</p>

                {/* New images - drag to reorder */}
                {images.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">New images:</p>
                    <div className="flex gap-2 flex-wrap">
                      {images.map((file, i) => (
                        <div
                          key={i}
                          draggable
                          onDragStart={() => setDragIndex({ type: 'new', index: i })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragIndex?.type === 'new' && dragIndex.index !== i) {
                              const reordered = [...images];
                              const [moved] = reordered.splice(dragIndex.index, 1);
                              reordered.splice(i, 0, moved);
                              setImages(reordered);
                            }
                            setDragIndex(null);
                          }}
                          className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none ${i === 0 ? 'border-brand-green' : 'border-gray-200'} ${dragIndex?.type === 'new' && dragIndex.index === i ? 'opacity-50' : ''}`}
                        >
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <span className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1">{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-bl"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing images (when editing) - drag to reorder */}
                {existingImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">{existingImages.length} existing image{existingImages.length !== 1 ? 's' : ''} (drag to reorder):</p>
                    <div className="flex gap-2 flex-wrap">
                      {existingImages.map((img, i) => (
                        <div
                          key={img.public_id || img.url}
                          draggable
                          onDragStart={() => setDragIndex({ type: 'existing', index: i })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragIndex?.type === 'existing' && dragIndex.index !== i) {
                              const reordered = [...existingImages];
                              const [moved] = reordered.splice(dragIndex.index, 1);
                              reordered.splice(i, 0, moved);
                              setExistingImages(reordered);
                            }
                            setDragIndex(null);
                          }}
                          className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none ${i === 0 ? 'border-brand-green' : 'border-gray-200'} ${dragIndex?.type === 'existing' && dragIndex.index === i ? 'opacity-50' : ''}`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <span className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1">{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Videos */}
              <div>
                <label className="block text-sm font-medium mb-1">Videos</label>
                <p className="text-xs text-gray-400 mb-1">Up to 50MB per file. Auto-compressed by Cloudinary while preserving resolution & quality.</p>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    const tooBig = files.find((f) => f.size > 50 * 1024 * 1024);
                    if (tooBig) {
                      toast.error(`"${tooBig.name}" exceeds the 50MB limit`);
                      return;
                    }
                    setVideos(files);
                  }}
                  className="input-field"
                />

                {videos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">New videos:</p>
                    <div className="flex gap-2 flex-wrap">
                      {videos.map((file, i) => (
                        <div key={i} className="relative w-28 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                          <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted />
                          <span className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1 truncate max-w-full">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setVideos(videos.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-bl"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {existingVideos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">{existingVideos.length} existing video{existingVideos.length !== 1 ? 's' : ''}:</p>
                    <div className="flex gap-2 flex-wrap">
                      {existingVideos.map((v, i) => (
                        <div key={v.public_id || v.url} className="relative w-28 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                          <video src={v.url} className="w-full h-full object-cover" muted />
                          <span className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1">{i + 1}</span>
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

              {/* Product Highlights */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Product Highlights</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const existingKeys = form.highlights.map(h => h.key);
                        const missing = DEFAULT_HIGHLIGHT_KEYS.filter(k => !existingKeys.includes(k));
                        if (missing.length > 0) {
                          setForm({ ...form, highlights: [...form.highlights, ...missing.map(key => ({ key, value: '' }))] });
                          toast.success(`Restored ${missing.length} default key(s)`);
                        } else {
                          toast.success('All default keys present');
                        }
                      }}
                      className="text-xs text-gray-500 font-medium hover:underline"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, highlights: [...form.highlights, { key: '', value: '' }] })}
                      className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline"
                    >
                      <FiPlus size={12} /> Add Custom
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Predefined keys are shown by default. Fill values, remove unused keys, or add custom ones.</p>
                {form.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      {DEFAULT_HIGHLIGHT_KEYS.includes(h.key) ? (
                        <span className="block text-sm py-2 px-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium">{h.key}</span>
                      ) : (
                        <input
                          type="text"
                          value={h.key}
                          onChange={(e) => {
                            const updated = [...form.highlights];
                            updated[i] = { ...updated[i], key: e.target.value };
                            setForm({ ...form, highlights: updated });
                          }}
                          className="input-field text-sm py-2"
                          placeholder="Custom key name"
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) => {
                        const updated = [...form.highlights];
                        updated[i] = { ...updated[i], value: e.target.value };
                        setForm({ ...form, highlights: updated });
                      }}
                      className="input-field text-sm py-2 flex-1"
                      placeholder="Enter value"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, idx) => idx !== i) })}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                      title="Remove this highlight"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* All Details / Specifications */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">All Details (Specifications)</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, specifications: mergeSpecifications(form.specifications) });
                        toast.success('Default groups & keys restored');
                      }}
                      className="text-xs text-gray-500 font-medium hover:underline"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, specifications: [...form.specifications, { group: '', fields: [{ key: '', value: '' }] }] })}
                      className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline"
                    >
                      <FiPlus size={12} /> Add Group
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Predefined groups and keys shown by default. Fill values, remove unused, or add custom fields.</p>
                {form.specifications.map((group, gi) => {
                  const defaultGroup = DEFAULT_SPEC_GROUPS.find(dg => dg.group === group.group);
                  return (
                  <div key={gi} className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex gap-2 items-center">
                      {defaultGroup ? (
                        <span className="text-sm py-1.5 px-3 bg-gray-100 rounded-lg text-gray-700 font-semibold flex-1">{group.group}</span>
                      ) : (
                        <input
                          type="text"
                          value={group.group}
                          onChange={(e) => {
                            const updated = [...form.specifications];
                            updated[gi] = { ...updated[gi], group: e.target.value };
                            setForm({ ...form, specifications: updated });
                          }}
                          className="input-field text-sm py-1.5 font-medium flex-1"
                          placeholder="Group name (e.g. Dimensions)"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, specifications: form.specifications.filter((_, idx) => idx !== gi) })}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                        title="Remove this group"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                    {group.fields.map((f, fi) => {
                      const isDefault = defaultGroup?.keys.includes(f.key);
                      return (
                      <div key={fi} className="flex gap-2 items-center ml-3">
                        <div className="flex-1">
                          {isDefault ? (
                            <span className="block text-xs py-1.5 px-2 bg-gray-50 rounded text-gray-600 font-medium">{f.key}</span>
                          ) : (
                            <input
                              type="text"
                              value={f.key}
                              onChange={(e) => {
                                const updated = [...form.specifications];
                                const fields = [...updated[gi].fields];
                                fields[fi] = { ...fields[fi], key: e.target.value };
                                updated[gi] = { ...updated[gi], fields };
                                setForm({ ...form, specifications: updated });
                              }}
                              className="input-field text-xs py-1.5"
                              placeholder="Custom key name"
                            />
                          )}
                        </div>
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => {
                            const updated = [...form.specifications];
                            const fields = [...updated[gi].fields];
                            fields[fi] = { ...fields[fi], value: e.target.value };
                            updated[gi] = { ...updated[gi], fields };
                            setForm({ ...form, specifications: updated });
                          }}
                          className="input-field text-xs py-1.5 flex-1"
                          placeholder="Enter value"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...form.specifications];
                            updated[gi] = { ...updated[gi], fields: updated[gi].fields.filter((_, idx) => idx !== fi) };
                            setForm({ ...form, specifications: updated });
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                          title="Remove this field"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...form.specifications];
                        updated[gi] = { ...updated[gi], fields: [...updated[gi].fields, { key: '', value: '' }] };
                        setForm({ ...form, specifications: updated });
                      }}
                      className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline ml-3"
                    >
                      <FiPlus size={10} /> Add Custom Field
                    </button>
                  </div>
                  );
                })}
              </div>

              {/* Return Policy & Shipping */}
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isReturnable} onChange={(e) => setForm({ ...form, isReturnable: e.target.checked, returnPolicy: e.target.checked ? form.returnPolicy : 'This product is not eligible for returns.' })} className="accent-brand-green" />
                  Returnable Product
                </label>
                <p className="text-xs text-gray-400 mt-0.5">{form.isReturnable ? 'Customers can request returns for this product' : 'Returns are disabled — customers cannot return this product'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Return Days</label>
                  <input
                    type="number"
                    value={form.returnDays}
                    onChange={(e) => setForm({ ...form, returnDays: e.target.value })}
                    className="input-field"
                    min="0"
                    placeholder="e.g. 7"
                    disabled={!form.isReturnable}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Days from delivery for return</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Return Policy</label>
                  <textarea
                    value={form.returnPolicy}
                    onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="e.g. Easy return policy..."
                    disabled={!form.isReturnable}
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left text-gray-500 dark:text-gray-300">
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
                  <tr key={product._id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
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
