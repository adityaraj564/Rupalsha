'use client';

import { useEffect, useState } from 'react';
import { FiDownload, FiPackage, FiAlertTriangle, FiXCircle, FiCheckCircle, FiSearch } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchInventory = async (stockFilter) => {
    try {
      setLoading(true);
      const data = await adminAPI.getInventory({ filter: stockFilter || filter });
      setInventory(data.inventory);
      setSummary(data.summary);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchInventory(newFilter);
  };

  const filtered = search
    ? inventory.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.productCode.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
      )
    : inventory;

  const downloadExcel = () => {
    const data = filtered.map(item => ({
      'Product Code': item.productCode,
      'Product Name': item.name,
      'SKU': item.sku,
      'Category': item.category,
      'Price (₹)': item.price,
      'Total Stock': item.totalStock,
      'Size Breakdown': item.sizeBreakdown,
      'Low Stock Threshold': item.lowStockThreshold,
      'Status': item.status === 'out-of-stock' ? 'OUT OF STOCK' : item.status === 'low-stock' ? 'LOW STOCK' : 'IN STOCK',
      'Fabric': item.fabric,
      'Shipping Charge (₹)': item.shippingCharge,
      'Last Updated': new Date(item.updatedAt).toLocaleDateString('en-IN'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 14 }, { wch: 35 }, { wch: 18 }, { wch: 30 }, { wch: 12 },
      { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 15 },
      { wch: 14 }, { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    const filterLabel = filter === 'all' ? 'All' : filter === 'out-of-stock' ? 'OutOfStock' : filter === 'low-stock' ? 'LowStock' : 'InStock';
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Rupalsha_Inventory_${filterLabel}_${date}.xlsx`);
    toast.success('Excel file downloaded!');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-charcoal">Inventory Management</h1>
        <button
          onClick={downloadExcel}
          className="btn-primary text-sm py-2 flex items-center gap-2"
          disabled={filtered.length === 0}
        >
          <FiDownload size={16} /> Download Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => handleFilterChange('all')}
          className={`p-4 rounded-2xl text-left transition-all ${filter === 'all' ? 'ring-2 ring-brand-green bg-white shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FiPackage className="text-gray-500" size={18} />
            <span className="text-sm text-gray-500">Total Products</span>
          </div>
          <p className="text-2xl font-bold text-brand-charcoal">{summary.total}</p>
        </button>
        <button
          onClick={() => handleFilterChange('in-stock')}
          className={`p-4 rounded-2xl text-left transition-all ${filter === 'in-stock' ? 'ring-2 ring-green-500 bg-white shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FiCheckCircle className="text-green-500" size={18} />
            <span className="text-sm text-gray-500">In Stock</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.inStock}</p>
        </button>
        <button
          onClick={() => handleFilterChange('low-stock')}
          className={`p-4 rounded-2xl text-left transition-all ${filter === 'low-stock' ? 'ring-2 ring-amber-500 bg-white shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="text-amber-500" size={18} />
            <span className="text-sm text-gray-500">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{summary.lowStock}</p>
        </button>
        <button
          onClick={() => handleFilterChange('out-of-stock')}
          className={`p-4 rounded-2xl text-left transition-all ${filter === 'out-of-stock' ? 'ring-2 ring-red-500 bg-white shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FiXCircle className="text-red-500" size={18} />
            <span className="text-sm text-gray-500">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.outOfStock}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, SKU or category..."
          className="input-field pl-10"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium">Size Breakdown</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No products found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className={`border-t hover:bg-gray-50 ${item.status === 'out-of-stock' ? 'bg-red-50/50' : item.status === 'low-stock' ? 'bg-amber-50/50' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt="" className="w-12 h-14 object-cover rounded-lg" />
                        )}
                        <div>
                          <p className="font-medium line-clamp-1">{item.name}</p>
                          {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded font-semibold">
                        {item.productCode || '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-xs">{item.category}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">₹{item.price.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${item.totalStock === 0 ? 'text-red-600' : item.totalStock <= item.lowStockThreshold ? 'text-amber-600' : 'text-green-600'}`}>
                        {item.totalStock}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {item.sizes.map((s) => (
                          <span
                            key={s.size}
                            className={`text-xs px-1.5 py-0.5 rounded ${s.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {s.size}: {s.stock}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      {item.status === 'out-of-stock' && (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">Out of Stock</span>
                      )}
                      {item.status === 'low-stock' && (
                        <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded-full text-xs font-medium">Low Stock</span>
                      )}
                      {item.status === 'in-stock' && (
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
