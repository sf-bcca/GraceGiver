
import React, { useState, useRef } from 'react';
import { Member, FundType, Donation } from '../types';
import { Save, Search, History, CheckCircle2, AlertCircle } from 'lucide-react';

interface DonationEntryProps {
  members: Member[];
  donations: Donation[];
  onAddDonation: (donation: Omit<Donation, 'id' | 'timestamp' | 'enteredBy'>) => void;
}

const DonationEntry: React.FC<DonationEntryProps> = ({ members, donations, onAddDonation }) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');
  const [fund, setFund] = useState<FundType>(FundType.GENERAL);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const filteredMembers = members.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 5);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !amount) return;

    onAddDonation({
      memberId: selectedMember.id,
      amount: parseFloat(amount),
      fund,
      date,
      notes
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);

    // Reset Form for next entry
    setSelectedMember(null);
    setMemberSearch('');
    setAmount('');
    setNotes('');
    searchInputRef.current?.focus();
  };

  const recentDonations = [...donations].reverse().slice(0, 5);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="xl:col-span-2 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rapid Entry</h1>
          <p className="text-slate-500 mt-1">Efficient donation recording for administrative staff.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Select Member</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Type name to find member..." 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium text-slate-900 shadow-sm"
                  value={selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    if (selectedMember) setSelectedMember(null);
                  }}
                  autoComplete="off"
                />
                {selectedMember && (
                  <button 
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    CHANGE
                  </button>
                )}
              </div>
              
              {!selectedMember && memberSearch.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full px-6 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between border-b last:border-0 border-slate-100"
                        onClick={() => {
                          setSelectedMember(m);
                          amountInputRef.current?.focus();
                        }}
                      >
                        <div>
                          <span className="font-bold text-slate-900">{m.firstName} {m.lastName}</span>
                          <span className="ml-2 text-xs text-slate-400">{m.email}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-400">ID: {m.id}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-slate-400 text-sm italic">No members found matching your search.</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Amount ($)</label>
                <input 
                  ref={amountInputRef}
                  required
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-2xl font-bold text-indigo-600 shadow-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">3. Designation Fund</label>
                <select 
                  className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium appearance-none text-slate-900 shadow-sm"
                  value={fund}
                  onChange={(e) => setFund(e.target.value as FundType)}
                >
                  {Object.values(FundType).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">4. Transaction Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium text-slate-900 shadow-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">5. Notes (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Check #1234, Memorial Gift"
                  className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium text-slate-900 shadow-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 flex flex-col md:flex-row items-center gap-4">
              <button 
                type="submit"
                disabled={!selectedMember || !amount}
                className={`
                  flex-1 w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-xl transition-all shadow-xl
                  ${!selectedMember || !amount 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}
                `}
              >
                <Save size={24} />
                Save Transaction (Enter)
              </button>
              {success && (
                <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 size={24} />
                  Transaction Saved!
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <History size={20} className="text-slate-400" />
          Recent Sessions
        </h3>
        <div className="space-y-3">
          {recentDonations.length > 0 ? (
            recentDonations.map(donation => {
              const donor = members.find(m => m.id === donation.memberId);
              return (
                <div key={donation.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-xs uppercase tracking-tighter">
                      {donation.fund.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{donor?.firstName} {donor?.lastName}</div>
                      <div className="text-xs text-slate-400">{donation.fund} • {new Date(donation.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">${donation.amount.toLocaleString()}</div>
                    <button className="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors uppercase tracking-wider opacity-0 group-hover:opacity-100">Void</button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
              No recent entries in this session.
            </div>
          )}
        </div>

        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
            <AlertCircle size={18} />
            Data Entry Tip
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Use the <kbd className="px-1 py-0.5 bg-white border border-amber-200 rounded shadow-sm font-sans">Tab</kbd> key to quickly move between fields. Once the amount is entered, hit <kbd className="px-1 py-0.5 bg-white border border-amber-200 rounded shadow-sm font-sans">Enter</kbd> to save.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DonationEntry;
