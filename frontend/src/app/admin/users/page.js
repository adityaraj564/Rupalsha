'use client';

import { useEffect, useState } from 'react';
import { FiSearch, FiShield, FiSlash } from 'react-icons/fi';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      const data = await adminAPI.getUsers(params);
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleBlock = async (userId) => {
    try {
      const { user } = await adminAPI.toggleBlockUser(userId);
      setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: user.isBlocked } : u));
      toast.success(user.isBlocked ? 'User blocked' : 'User unblocked');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-6">Users ({users.length})</h1>

      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          placeholder="Search users..."
          className="input-field pl-10"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4 text-gray-600">{user.phone || '—'}</td>
                  <td className="p-4 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4">
                    {user.isBlocked ? (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">Blocked</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleBlock(user._id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        user.isBlocked
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                    >
                      {user.isBlocked ? <><FiShield size={12} /> Unblock</> : <><FiSlash size={12} /> Block</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
