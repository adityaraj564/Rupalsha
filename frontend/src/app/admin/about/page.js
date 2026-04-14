'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { aboutAPI } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FiSave, FiUpload, FiPlus, FiTrash2, FiImage, FiEdit3 } from 'react-icons/fi';

export default function AdminAboutPage() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingTeam, setUploadingTeam] = useState(null);
  const [form, setForm] = useState({
    companyName: '',
    tagline: '',
    story: '',
    mission: '',
    vision: '',
    foundedYear: '',
  });

  const coverInputRef = useRef(null);
  const teamImageRefs = useRef({});

  useEffect(() => {
    fetchAbout();
  }, []);

  const fetchAbout = async () => {
    try {
      const data = await aboutAPI.get();
      setAbout(data.about);
      setForm({
        companyName: data.about.companyName || '',
        tagline: data.about.tagline || '',
        story: data.about.story || '',
        mission: data.about.mission || '',
        vision: data.about.vision || '',
        foundedYear: data.about.foundedYear || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await aboutAPI.update(form);
      setAbout(data.about);
      showMessage('About section updated successfully!');
    } catch (err) {
      showMessage('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const data = await aboutAPI.uploadCover(formData);
      setAbout(data.about);
      showMessage('Cover image updated!');
    } catch (err) {
      showMessage('Upload failed: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleTeamImageUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTeam(index);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const data = await aboutAPI.uploadTeamImage(index, formData);
      setAbout(data.about);
      showMessage(`${about.team[index].name}'s photo updated!`);
    } catch (err) {
      showMessage('Upload failed: ' + err.message);
    } finally {
      setUploadingTeam(null);
    }
  };

  const handleTeamMemberUpdate = async (index) => {
    const member = about.team[index];
    try {
      const data = await aboutAPI.updateTeamMember(index, {
        name: member.name,
        role: member.role,
        title: member.title,
        bio: member.bio,
      });
      setAbout(data.about);
      showMessage(`${member.name} updated!`);
    } catch (err) {
      showMessage('Update failed: ' + err.message);
    }
  };

  const handleAddMember = async () => {
    try {
      const data = await aboutAPI.addTeamMember({
        name: 'New Member',
        role: 'Team Member',
        title: 'Team Member',
        bio: '',
      });
      setAbout(data.about);
      showMessage('Team member added!');
    } catch (err) {
      showMessage('Failed to add: ' + err.message);
    }
  };

  const handleRemoveMember = async (index) => {
    if (!confirm(`Remove ${about.team[index].name} from the team?`)) return;
    try {
      const data = await aboutAPI.removeTeamMember(index);
      setAbout(data.about);
      showMessage('Team member removed.');
    } catch (err) {
      showMessage('Failed to remove: ' + err.message);
    }
  };

  const updateLocalTeam = (index, field, value) => {
    setAbout((prev) => {
      const updated = { ...prev };
      updated.team = [...updated.team];
      updated.team[index] = { ...updated.team[index], [field]: value };
      return updated;
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-charcoal">About Page</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your company&apos;s about section</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-green text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <FiSave size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.includes('Failed') || message.includes('failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {/* Cover Image */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-lg text-brand-charcoal mb-4 flex items-center gap-2">
          <FiImage size={18} /> Cover Image
        </h2>
        <div className="relative w-full h-48 md:h-64 bg-gray-100 rounded-xl overflow-hidden mb-4">
          {uploadingCover ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-3 border-gray-300 border-t-brand-green rounded-full animate-spin mb-2" />
              <span className="text-sm">Uploading...</span>
            </div>
          ) : about?.coverImage?.url ? (
            <Image src={about.coverImage.url} alt="Cover" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No cover image uploaded
            </div>
          )}
        </div>
        <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverUpload} className="hidden" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => coverInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <FiUpload size={14} /> Upload Cover Image
          </button>
          <span className="text-xs text-gray-400">Recommended: 1920 × 600 px (landscape, 3.2:1 ratio)</span>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-lg text-brand-charcoal mb-4 flex items-center gap-2">
          <FiEdit3 size={18} /> Company Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
            <input
              type="number"
              value={form.foundedYear}
              onChange={(e) => setForm({ ...form, foundedYear: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Our Story</label>
            <textarea
              rows={5}
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mission</label>
            <textarea
              rows={3}
              value={form.mission}
              onChange={(e) => setForm({ ...form, mission: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vision</label>
            <textarea
              rows={3}
              value={form.vision}
              onChange={(e) => setForm({ ...form, vision: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none resize-y"
            />
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg text-brand-charcoal">Team Members</h2>
          <button
            onClick={handleAddMember}
            className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            <FiPlus size={14} /> Add Member
          </button>
        </div>

        <div className="space-y-6">
          {about?.team?.map((member, index) => (
            <div key={index} className="flex gap-5 p-5 bg-gray-50 rounded-xl">
              {/* Photo */}
              <div className="flex-shrink-0">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white border-2 border-gray-200">
                  {uploadingTeam === index ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin" />
                    </div>
                  ) : member.image?.url ? (
                    <Image src={member.image.url} alt={member.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-serif text-brand-green">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => (teamImageRefs.current[index] = el)}
                  onChange={(e) => handleTeamImageUpload(index, e)}
                  className="hidden"
                />
                <button
                  onClick={() => teamImageRefs.current[index]?.click()}
                  className="mt-2 text-xs text-brand-green hover:underline w-full text-center"
                >
                  Upload Photo
                </button>
              </div>

              {/* Fields */}
              <div className="flex-1 grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateLocalTeam(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={member.title || ''}
                    onChange={(e) => updateLocalTeam(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                    placeholder="e.g. Founder & CDO"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => updateLocalTeam(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                    placeholder="e.g. Founder, Co-Founder"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
                  <textarea
                    rows={2}
                    value={member.bio || ''}
                    onChange={(e) => updateLocalTeam(index, 'bio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none resize-y"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2 justify-end">
                  <button
                    onClick={() => handleTeamMemberUpdate(index)}
                    className="flex items-center gap-1 px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    <FiSave size={14} /> Save
                  </button>
                  <button
                    onClick={() => handleRemoveMember(index)}
                    className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"
                  >
                    <FiTrash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
