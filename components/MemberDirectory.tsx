
import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { fetchMembers, updateMember, deleteMember, createMember } from '../src/lib/api';
import { Search, UserPlus, Mail, Phone, MoreVertical, Edit2, Trash2, Filter, X, AlertCircle } from 'lucide-react';

const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  ZIP: /^\d{5}(-\d{4})?$/,
  STATE: /^[A-Z]{2}$/
};

import { ViewState } from '../types';

interface MemberDirectoryProps {
  members: Member[];
  onAddMember: (member: Omit<Member, 'id' | 'createdAt'>) => void;
  setView: (view: ViewState) => void;
  setSelectedMemberId: (id: string) => void;
}

const MemberDirectory: React.FC<MemberDirectoryProps> = ({ members: initialMembers, onAddMember, setView, setSelectedMemberId }) => {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // Reset to page 1 on new search term
        const result = await fetchMembers(searchTerm ? 1 : page, 50, searchTerm);
        setMembers(result.data);
        setTotalPages(result.pagination.totalPages);
        if (searchTerm) setPage(1);
      } catch (error) {
        console.error('Failed to search members:', error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Pagination effect (only when page changes, not search)
  useEffect(() => {
    if (searchTerm) return; // Search effect handles fetching
    const loadPage = async () => {
      try {
        const result = await fetchMembers(page, 50, '');
        setMembers(result.data);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        console.error('Failed to load members:', error);
      }
    };
    loadPage();
  }, [page]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!REGEX.EMAIL.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.phone && !REGEX.PHONE.test(formData.phone)) newErrors.phone = 'Invalid phone format (e.g. +14155552671)';
    if (!REGEX.STATE.test(formData.state)) newErrors.state = 'Must be 2 uppercase letters (e.g., MS)';
    if (!REGEX.ZIP.test(formData.zip)) newErrors.zip = 'Invalid Zip (12345 or 12345-6789)';
    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cleanInput = (field: string, value: string) => {
    switch (field) {
      case 'state':
        return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
      case 'zip':
        return value.replace(/[^\d-]/g, '').slice(0, 10);
      case 'phone':
        return value.replace(/[^\d+]/g, '').slice(0, 15);
      default:
        return value;
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone || '',
      address: member.address,
      city: member.city,
      state: member.state,
      zip: member.zip
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      try {
        await deleteMember(id);
        setMembers(members.filter(m => m.id !== id));
      } catch (error) {
        console.error('Failed to delete member:', error);
        alert('Failed to delete member');
      }
    }
  };

  const handleOpenModal = () => {
    setEditingMember(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: ''
    });
    setIsModalOpen(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (editingMember) {
        const updated = await updateMember(editingMember.id, { ...formData, familyId: editingMember.familyId });
        setMembers(members.map(m => m.id === editingMember.id ? updated : m));
      } else {
        const created = await createMember({ ...formData, familyId: 'f' + Date.now() }); // Mock familyId
        setMembers([...members, created]);
        // Also call parent onAddMember if needed for global state, but local state is enough here
      }
      setIsModalOpen(false);
      setErrors({});
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: ''
      });
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Failed to save member');
    }
  };

  const handleDonationClick = (member: Member) => {
    setSelectedMemberId(member.id);
    setView('ENTRY');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Member Directory</h1>
          <p className="text-slate-500 mt-1">Manage family records and contact information.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-medium"
        >
          <UserPlus size={18} />
          New Member
        </button>
      </header>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium">
          <Filter size={18} />
          Filters
        </button>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center px-2">
         <span className="text-sm font-bold text-slate-500">
           Page {page} of {totalPages}
         </span>
         <div className="flex gap-2">
           <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
           >
             Previous
           </button>
           <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
           >
             Next
           </button>
         </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Join Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map(member => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{member.firstName} {member.lastName}</div>
                      <div className="text-xs text-slate-500">ID: {member.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Mail size={14} />
                    {member.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600 leading-tight">
                    {member.address}<br />
                    <span className="text-slate-400">{member.city}, {member.state} {member.zip}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(member)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(member.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card - Mobile View */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        {members.map(member => (
          <div key={member.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{member.firstName} {member.lastName}</h3>
                  <p className="text-xs text-slate-500">Joined {new Date(member.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="p-2 text-slate-400"><MoreVertical size={20} /></button>
            </div>
            <div className="space-y-2 text-sm text-slate-600 mb-4">
              <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {member.email}</div>
              {member.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {member.phone}</div>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditClick(member)}
                className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-100"
              >
                Edit Profile
              </button>
              <button
                onClick={() => handleDonationClick(member)}
                className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100"
              >
                Donations
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                  <input 
                    required 
                    type="text" 
                    className={`w-full px-4 py-2 bg-white border ${errors.firstName ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all`} 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                  {errors.firstName && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                  <input 
                    required 
                    type="text" 
                    className={`w-full px-4 py-2 bg-white border ${errors.lastName ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all`} 
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                  {errors.lastName && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.lastName}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    className={`w-full px-4 py-2 bg-white border ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all`}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  {errors.email && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    className={`w-full px-4 py-2 bg-white border ${errors.phone ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all`}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: cleanInput('phone', e.target.value)})}
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Home Address</label>
                <input 
                  required 
                  type="text" 
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="MS"
                    className={`w-full px-4 py-2 bg-white border ${errors.state ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all`} 
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: cleanInput('state', e.target.value)})}
                  />
                  {errors.state && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.state}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ZIP</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="38930"
                    className={`w-full px-4 py-2 bg-white border ${errors.zip ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all`} 
                    value={formData.zip}
                    onChange={(e) => setFormData({...formData, zip: cleanInput('zip', e.target.value)})}
                  />
                  {errors.zip && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.zip}</p>}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  {editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDirectory;
