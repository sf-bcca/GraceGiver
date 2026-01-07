
import React, { useState, useRef, useEffect } from 'react';
import { Member, FundType, Donation } from '../types';
import { Save, Search, History, CheckCircle2, AlertCircle, Trash2, Edit2, X, Filter, Loader2 } from 'lucide-react';
import { createDonation, fetchDonations, updateDonation, deleteDonation, fetchMembers, getMember } from '../src/lib/api';

interface DonationEntryProps {
  members: Member[]; // Still passed for initial render or fallback, but we'll rely on async search
  donations: Donation[];
  onAddDonation: (donation: Omit<Donation, 'id' | 'timestamp' | 'enteredBy'>) => void;
  memberId?: string;
}

const DonationEntry: React.FC<DonationEntryProps> = ({ onAddDonation, members: initialMembers, memberId: preselectedMemberId }) => {
  // Form State
  const [memberSearch, setMemberSearch] = useState('');
  const [searchedMembers, setSearchedMembers] = useState<Member[]>([]);
  const [isSearchingMember, setIsSearchingMember] = useState(false);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');
  const [fund, setFund] = useState<FundType>(FundType.TITHES);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // History State
  const [historyDonations, setHistoryDonations] = useState<Donation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Cache for members resolved from history to avoid repeated fetches
  const [resolvedMembers, setResolvedMembers] = useState<Record<string, Member>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedMemberId) {
      const fetchPreselectedMember = async () => {
        try {
          const member = await getMember(preselectedMemberId);
          setSelectedMember(member);
        } catch (error) {
          console.error('Failed to fetch preselected member:', error);
        }
      };
      fetchPreselectedMember();
    }
  }, [preselectedMemberId]);

  // Async Member Search with Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (memberSearch.trim().length === 0) {
        setSearchedMembers([]);
        return;
      }

      setIsSearchingMember(true);
      try {
        // Search API
        const result = await fetchMembers(1, 10, memberSearch);
        setSearchedMembers(result.data);
      } catch (error) {
        console.error('Failed to search members:', error);
      } finally {
        setIsSearchingMember(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearch]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const result = await fetchDonations(page, 10);
      setHistoryDonations(result.data);
      setTotalPages(result.pagination.totalPages);

      // Resolve members for history items that aren't in our cache
      const uniqueMemberIds = Array.from(new Set(result.data.map((d: Donation) => d.memberId))) as string[];
      const missingIds = uniqueMemberIds.filter(id => !resolvedMembers[id]);

      if (missingIds.length > 0) {
        // Fetch missing members in parallel
        const newResolved = { ...resolvedMembers };
        await Promise.all(missingIds.map(async (id) => {
          try {
            const member = await getMember(id);
            newResolved[id] = member;
          } catch (e) {
            console.error(`Failed to resolve member ${id}`, e);
            // Placeholder for unknown/deleted member
            newResolved[id] = { id, firstName: 'Unknown', lastName: 'Member' } as Member;
          }
        }));
        setResolvedMembers(newResolved);
      }
    } catch (error) {
      console.error('Failed to load donation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !amount) return;

    try {
      if (isEditing) {
        await updateDonation(isEditing, {
          amount: parseFloat(amount),
          fund,
          notes,
          enteredBy: 'Admin',
          donationDate: date
        });
        setIsEditing(null);
      } else {
        await createDonation({
          memberId: selectedMember.id,
          amount: parseFloat(amount),
          fund,
          notes,
          enteredBy: 'Admin'
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadHistory();
      
      // Notify parent to refresh global state (Dashboard)
      onAddDonation({} as any);

      // Reset Form
      if (!isEditing) {
        setSelectedMember(null);
        setMemberSearch('');
        setAmount('');
        setNotes('');
        setSearchedMembers([]);
        searchInputRef.current?.focus();
      } else {
        setSelectedMember(null);
        setMemberSearch('');
        setAmount('');
        setNotes('');
        setSearchedMembers([]);
        setIsEditing(null);
      }
    } catch (error) {
      console.error('Failed to save donation:', error);
      alert('Failed to save donation');
    }
  };

  const handleEditClick = async (donation: Donation) => {
    // Try to find member in resolved cache, or fetch it
    let member = resolvedMembers[donation.memberId];
    if (!member) {
      try {
        member = await getMember(donation.memberId);
        setResolvedMembers(prev => ({ ...prev, [member.id]: member }));
      } catch (e) {
        console.error("Could not fetch member for edit", e);
        return;
      }
    }

    if (member) setSelectedMember(member);
    setAmount(donation.amount.toString());
    setFund(donation.fund);
    setNotes(donation.notes || '');
    // Populate the date field from the donation's date or timestamp
    const donationDate = donation.date || donation.timestamp;
    if (donationDate) {
      setDate(new Date(donationDate).toISOString().split('T')[0]);
    }
    setIsEditing(donation.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Are you sure you want to void this transaction?')) {
      try {
        await deleteDonation(id);
        loadHistory();
        // Notify parent to refresh global state (Dashboard)
        onAddDonation({} as any); // Trigger refresh even without full data
      } catch (error) {
        console.error('Failed to delete donation:', error);
        alert('Failed to delete donation');
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setSelectedMember(null);
    setMemberSearch('');
    setAmount('');
    setNotes('');
    setSearchedMembers([]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="xl:col-span-1 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Donation Entry</h1>
          <p className="text-slate-500 mt-1">Record and manage donations.</p>
        </header>

        <div className={`bg-white rounded-2xl shadow-sm border ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-100'} p-6 transition-all`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 text-lg">{isEditing ? 'Edit Transaction' : 'New Transaction'}</h2>
            {isEditing && (
              <button onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <X size={14} /> CANCEL
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Select Member</label>
              {isEditing ? (
                 <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium">
                   {selectedMember?.firstName} {selectedMember?.lastName}
                   <div className="text-xs font-normal opacity-70">Member cannot be changed during edit</div>
                 </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by name..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-900 shadow-sm"
                    value={selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (selectedMember) setSelectedMember(null);
                    }}
                    autoComplete="off"
                  />
                  {isSearchingMember && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                    </div>
                  )}
                  {selectedMember && !isSearchingMember && (
                    <button
                      type="button"
                      onClick={() => { setSelectedMember(null); setMemberSearch(''); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      CHANGE
                    </button>
                  )}
                </div>
              )}
              
              {!selectedMember && memberSearch.length > 0 && !isEditing && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto">
                  {searchedMembers.length > 0 ? (
                    searchedMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between border-b last:border-0 border-slate-100"
                        onClick={() => {
                          setSelectedMember(m);
                          amountInputRef.current?.focus();
                        }}
                      >
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{m.firstName} {m.lastName}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-400">ID: {m.id}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-slate-400 text-sm italic">
                      {isSearchingMember ? 'Searching...' : 'No members found.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Amount ($)</label>
              <input
                ref={amountInputRef}
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-xl font-bold text-indigo-600 shadow-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">3. Fund</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium appearance-none text-slate-900 shadow-sm"
                value={fund}
                onChange={(e) => setFund(e.target.value as FundType)}
              >
                {Object.values(FundType).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">4. Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-900 shadow-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">5. Notes</label>
              <input
                type="text"
                placeholder="Optional notes..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-900 shadow-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={!selectedMember || !amount}
                className={`
                  w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg transition-all shadow-lg
                  ${!selectedMember || !amount 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}
                `}
              >
                <Save size={20} />
                {isEditing ? 'Update Transaction' : 'Save Transaction'}
              </button>
              {success && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold mt-3 animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 size={18} />
                  Saved!
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="xl:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-slate-400" />
            Transaction History
          </h3>
          {totalPages > 0 && (
            <div className="flex gap-2">
               <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
               >
                 Prev
               </button>
               <span className="px-3 py-1 text-xs font-bold text-slate-500 flex items-center">
                 Page {page} of {totalPages}
               </span>
               <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
               >
                 Next
               </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Donor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fund</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingHistory ? (
                <tr><td colSpan={5} className="text-center py-16 text-slate-500"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : historyDonations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-500">
                    <AlertCircle className="mx-auto mb-2" size={32} />
                    No transactions found.
                  </td>
                </tr>
              ) : (
                historyDonations.map(donation => {
                  const donor = resolvedMembers[donation.memberId] || initialMembers.find(m => m.id === donation.memberId);
                  return (
                    <tr key={donation.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600">
                         {new Date(donation.timestamp || donation.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{donor ? `${donor.firstName} ${donor.lastName}` : `Member ${donation.memberId}`}</div>
                        <div className="text-xs text-slate-400">ID: {donation.memberId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">{donation.fund}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        ${donation.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(donation)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors bg-white border border-slate-200 rounded-lg shadow-sm"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(donation.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors bg-white border border-slate-200 rounded-lg shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DonationEntry;
