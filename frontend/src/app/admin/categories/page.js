'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminCategoriesPage() {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [form, setForm] = useState({
    name: '',
    parentId: '',
    level: 0,
  });

  const fetchCategories = async () => {
    try {
      const data = await adminAPI.getCategories();
      setAllCategories(data.categories);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const buildTree = (parentId = null) => {
    return allCategories
      .filter(c => {
        if (parentId === null) return !c.parent;
        return c.parent === parentId || (c.parent && c.parent.toString() === parentId.toString());
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setForm({ name: '', parentId: '', level: 0 });
    setEditingCategory(null);
  };

  const openAddForm = (parentId = null, level = 0) => {
    resetForm();
    setForm({ name: '', parentId: parentId || '', level });
    setShowForm(true);
  };

  const handleEdit = (category) => {
    setForm({
      name: category.name,
      parentId: category.parent || '',
      level: category.level,
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await adminAPI.updateCategory(editingCategory._id, { name: form.name });
        toast.success('Category updated');
      } else {
        await adminAPI.createCategory({
          name: form.name,
          parent: form.parentId || null,
          level: form.level,
        });
        toast.success('Category created');
      }
      setShowForm(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}" and all its subcategories?`)) return;
    try {
      await adminAPI.deleteCategory(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const renderCategory = (category, depth = 0) => {
    const children = buildTree(category._id);
    const isExpanded = expandedIds.has(category._id);
    const hasChildren = children.length > 0;
    const levelLabels = ['Main', 'Sub', 'Child'];
    const levelColors = [
      'bg-brand-green/10 text-brand-green',
      'bg-blue-50 text-blue-600',
      'bg-purple-50 text-purple-600',
    ];

    return (
      <div key={category._id}>
        <div
          className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
            depth > 0 ? 'bg-gray-50/50' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category._id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-6" /> 
            )}
            <span className="font-medium text-sm">{category.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${levelColors[category.level] || ''}`}>
              {levelLabels[category.level]}
            </span>
            {!category.isActive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {category.level < 2 && (
              <button
                onClick={() => openAddForm(category._id, category.level + 1)}
                className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 text-xs flex items-center gap-1"
                title={`Add ${levelLabels[category.level + 1]} Category`}
              >
                <FiPlus size={14} />
              </button>
            )}
            <button
              onClick={() => handleEdit(category)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <FiEdit2 size={14} />
            </button>
            <button
              onClick={() => handleDelete(category._id, category.name)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>
        {isExpanded && children.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  const rootCategories = buildTree(null);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">{allCategories.length} total categories</p>
        </div>
        <button
          onClick={() => openAddForm(null, 0)}
          className="btn-primary text-sm py-2 flex items-center gap-2"
        >
          <FiPlus size={16} /> Add Main Category
        </button>
      </div>

      {/* Expand/Collapse All */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setExpandedIds(new Set(allCategories.map(c => c._id)))}
          className="text-xs text-brand-green hover:underline"
        >
          Expand All
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setExpandedIds(new Set())}
          className="text-xs text-gray-500 hover:underline"
        >
          Collapse All
        </button>
      </div>

      {/* Category Tree */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {rootCategories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No categories yet. Create your first main category.
          </div>
        ) : (
          rootCategories.map(cat => renderCategory(cat, 0))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                  autoFocus
                  placeholder="Enter category name"
                />
              </div>
              {!editingCategory && form.parentId && (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  Adding as a <strong>{['Main', 'Sub', 'Child'][form.level]}</strong> category under{' '}
                  <strong>{allCategories.find(c => c._id === form.parentId)?.name}</strong>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 text-sm py-2.5">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="btn-secondary flex-1 text-sm py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
