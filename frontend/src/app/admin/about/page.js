'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { aboutAPI } from '@/lib/api';
import { AdminTableSkeleton } from '@/components/Skeleton';
import { FiSave, FiUpload, FiPlus, FiTrash2, FiImage, FiEdit3, FiAward, FiHeart, FiTruck, FiShield, FiStar, FiPackage, FiGift, FiCheckCircle, FiSmile, FiTag } from 'react-icons/fi';

// Icon options for the customer promise chips on the public About
// page. Keep keys in sync with PROMISE_ICONS in
// frontend/src/app/about/page.js and the `promises` field on the
// About model.
const PROMISE_ICON_OPTIONS = [
  { key: 'award',   label: 'Award',           Icon: FiAward },
  { key: 'heart',   label: 'Heart',           Icon: FiHeart },
  { key: 'truck',   label: 'Truck / Shipping', Icon: FiTruck },
  { key: 'shield',  label: 'Shield / Returns', Icon: FiShield },
  { key: 'star',    label: 'Star',            Icon: FiStar },
  { key: 'package', label: 'Package',         Icon: FiPackage },
  { key: 'gift',    label: 'Gift',            Icon: FiGift },
  { key: 'check',   label: 'Checkmark',       Icon: FiCheckCircle },
  { key: 'smile',   label: 'Smile',           Icon: FiSmile },
  { key: 'tag',     label: 'Tag',             Icon: FiTag },
];

export default function AdminAboutPage() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingCoverMobile, setUploadingCoverMobile] = useState(false);
  const [uploadingTeam, setUploadingTeam] = useState(null);
  const [savingTeamVisibility, setSavingTeamVisibility] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    tagline: '',
    story: '',
    mission: '',
    vision: '',
    foundedYear: '',
    promises: [],
  });

  const coverInputRef = useRef(null);
  const coverMobileInputRef = useRef(null);
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
        promises: Array.isArray(data.about.promises) ? data.about.promises.map((p) => ({
          icon: p.icon || 'award',
          label: p.label || '',
        })) : [],
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

  // Persist the team-section visibility toggle on its own so the admin
  // doesn't need to also press "Save Changes". Optimistically flips the
  // local UI, reverts on error.
  const handleToggleTeamVisibility = async () => {
    if (!about) return;
    const next = about.showTeam === false;
    setSavingTeamVisibility(true);
    setAbout({ ...about, showTeam: next });
    try {
      const data = await aboutAPI.update({ ...form, showTeam: next });
      setAbout(data.about);
      showMessage(next ? 'Team section is now visible.' : 'Team section is now hidden.');
    } catch (err) {
      // Revert
      setAbout({ ...about, showTeam: !next });
      showMessage('Failed to update visibility: ' + err.message);
    } finally {
      setSavingTeamVisibility(false);
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
      showMessage('Desktop cover image updated!');
    } catch (err) {
      showMessage('Upload failed: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverMobileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCoverMobile(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const data = await aboutAPI.uploadCoverMobile(formData);
      setAbout(data.about);
      showMessage('Mobile cover image updated!');
    } catch (err) {
      showMessage('Upload failed: ' + err.message);
    } finally {
      setUploadingCoverMobile(false);
    }
  };

  const handleRemoveCoverMobile = async () => {
    if (!confirm('Remove the mobile cover image? Phones will fall back to the desktop image.')) return;
    try {
      const data = await aboutAPI.removeCoverMobile();
      setAbout(data.about);
      showMessage('Mobile cover removed.');
    } catch (err) {
      showMessage('Failed to remove: ' + err.message);
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

  if (loading) return <AdminTableSkeleton />;

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

      {/* Cover Image — dual upload: a wide desktop banner and an
          optional portrait mobile banner. The public About page picks
          the right one with a <picture> source query so phones never
          see a desktop image cropped to a tiny strip. */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-lg text-brand-charcoal mb-2 flex items-center gap-2">
          <FiImage size={18} /> Cover Images
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          Upload separate images so the banner fits perfectly on every screen size. Cloudinary auto-crops smartly, but matching the recommended dimensions guarantees nothing important is cut off.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Desktop */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-brand-charcoal">Desktop / tablet</span>
              <span className="text-[11px] text-gray-400">1920 × 800 px (12:5)</span>
            </div>
            <div className="relative w-full aspect-[12/5] bg-gray-100 rounded-xl overflow-hidden mb-3">
              {uploadingCover ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin mb-2" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : about?.coverImage?.url ? (
                <Image src={about.coverImage.url} alt="Desktop cover" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No desktop cover uploaded
                </div>
              )}
            </div>
            <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverUpload} className="hidden" />
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiUpload size={14} /> {about?.coverImage?.url ? 'Replace desktop image' : 'Upload desktop image'}
            </button>
          </div>

          {/* Mobile */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-brand-charcoal">Mobile</span>
              <span className="text-[11px] text-gray-400">800 × 1000 px (4:5 portrait)</span>
            </div>
            <div className="relative w-full aspect-[12/5] bg-gray-100 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
              {uploadingCoverMobile ? (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin mb-2" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : about?.coverImageMobile?.url ? (
                // Constrain the portrait preview so it doesn’t blow out
                // the card height; the card slot is wide so we centre it.
                <div className="relative h-full aspect-[4/5] rounded-md overflow-hidden">
                  <Image src={about.coverImageMobile.url} alt="Mobile cover" fill className="object-cover" />
                </div>
              ) : (
                <span className="text-gray-400 text-sm">No mobile cover uploaded (optional)</span>
              )}
            </div>
            <input type="file" accept="image/*" ref={coverMobileInputRef} onChange={handleCoverMobileUpload} className="hidden" />
            <div className="flex gap-2">
              <button
                onClick={() => coverMobileInputRef.current?.click()}
                disabled={uploadingCoverMobile}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <FiUpload size={14} /> {about?.coverImageMobile?.url ? 'Replace mobile image' : 'Upload mobile image'}
              </button>
              {about?.coverImageMobile?.url && (
                <button
                  onClick={handleRemoveCoverMobile}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
                  title="Remove mobile cover (phones will fall back to the desktop image)"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
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

      {/* Promise Chips \u2014 customer-facing trust badges shown under the
          About hero. Up to 4 are displayed in a single row on desktop;
          extras wrap onto a second row. Saved together with the rest
          of the form via "Save Changes" at the top. */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-lg text-brand-charcoal">Promise Chips</h2>
            <p className="text-xs text-gray-500 mt-1">
              Trust badges shown below the hero on the public About page. Keep labels short \u2014 ideally 2 to 4 words.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({
              ...f,
              promises: [...(f.promises || []), { icon: 'award', label: '' }],
            }))}
            className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex-shrink-0"
          >
            <FiPlus size={14} /> Add Promise
          </button>
        </div>

        {form.promises?.length > 0 ? (
          <div className="space-y-2">
            {form.promises.map((p, index) => {
              const opt = PROMISE_ICON_OPTIONS.find((o) => o.key === p.icon) || PROMISE_ICON_OPTIONS[0];
              const PreviewIcon = opt.Icon;
              return (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-brand-gold ring-1 ring-gray-200 flex-shrink-0">
                    <PreviewIcon size={18} />
                  </div>
                  <select
                    value={p.icon}
                    onChange={(e) => setForm((f) => {
                      const promises = [...f.promises];
                      promises[index] = { ...promises[index], icon: e.target.value };
                      return { ...f, promises };
                    })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  >
                    {PROMISE_ICON_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={p.label}
                    placeholder="e.g. BIS Hallmarked"
                    maxLength={40}
                    onChange={(e) => setForm((f) => {
                      const promises = [...f.promises];
                      promises[index] = { ...promises[index], label: e.target.value };
                      return { ...f, promises };
                    })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      promises: f.promises.filter((_, i) => i !== index),
                    }))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                    aria-label="Remove promise"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No promises configured. The promises row will be hidden on the public About page.
          </p>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h2 className="font-semibold text-lg text-brand-charcoal">Team Members</h2>
            <p className="text-xs text-gray-500 mt-1">
              Controls the &quot;Meet Our Team&quot; section on the public About page.
            </p>
          </div>
          <button
            onClick={handleAddMember}
            className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex-shrink-0"
          >
            <FiPlus size={14} /> Add Member
          </button>
        </div>

        {/* Show / hide toggle for the public "Meet Our Team" section.
            Flips `about.showTeam` and persists immediately so the admin
            doesn't have to remember to click "Save Changes" up top. */}
        <div className="flex items-center justify-between gap-4 mt-4 mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <div className="text-sm font-medium text-brand-charcoal">
              Show &ldquo;Meet Our Team&rdquo; on About page
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {about?.showTeam === false
                ? 'Currently hidden from visitors. Team data is preserved.'
                : 'Visible to all visitors on /about.'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={about?.showTeam !== false}
            disabled={savingTeamVisibility}
            onClick={handleToggleTeamVisibility}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              about?.showTeam === false ? 'bg-gray-300' : 'bg-brand-green'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                about?.showTeam === false ? 'translate-x-0.5' : 'translate-x-[22px]'
              }`}
            />
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
