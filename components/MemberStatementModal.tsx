
import React, { useState, useEffect } from 'react';
import { Download, X, Calendar, DollarSign, User, FileText, RefreshCw, Sparkles } from 'lucide-react';
import * as api from '../src/lib/api';

interface MemberStatementModalProps {
  memberId: string;
  onClose: () => void;
}

interface StatementData {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  donations: {
    id: number;
    date: string;
    amount: number;
    fund: string;
    notes: string;
  }[];
  summary: {
    totalAmount: number;
    year: number;
  };
}

const MemberStatementModal: React.FC<MemberStatementModalProps> = ({ memberId, onClose }) => {
  const [data, setData] = useState<StatementData | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.fetchMemberStatement(memberId, year);
        setData(result);
        
        // Fetch narrative as well
        fetchNarrative();
      } catch (err: any) {
        setError(err.message || 'Failed to load statement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [memberId, year]);

  const fetchNarrative = async () => {
    setLoadingNarrative(true);
    try {
      const result = await api.fetchMemberNarrative(memberId, year);
      setNarrative(result.narrative);
    } catch (err) {
      console.error('Failed to fetch narrative', err);
      setNarrative('Unable to load AI narrative at this time.');
    } finally {
      setLoadingNarrative(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await api.downloadMemberStatement(memberId, year);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement-${year}-${data?.member.lastName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download PDF');
    }
  };

  if (loading && !data) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-xl">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-slate-600 font-medium">Generating Statement Preview...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-indigo-600" />
              Annual Contribution Statement
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <User size={14} />
                {data ? `${data.member.firstName} ${data.member.lastName}` : 'Loading...'}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="year-select" className="text-sm font-bold text-slate-600">Tax Year:</label>
                <select
                  id="year-select"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 font-medium"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error ? (
             <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
               <div className="font-bold">Error:</div> {error}
             </div>
          ) : !data ? (
             <div className="text-center py-10 text-slate-500">Loading data...</div>
          ) : (
            <>
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-md">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-indigo-100 text-sm font-medium uppercase tracking-wide mb-1">Total Contributions</div>
                    <div className="text-4xl font-extrabold">
                      ${data.summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-indigo-100 text-sm font-medium uppercase tracking-wide mb-1">Tax Year</div>
                    <div className="text-2xl font-bold">{data.summary.year}</div>
                  </div>
                </div>
              </div>

              {/* Narrative Preview */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 relative">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">AI Insight</span>
                    Impact Summary
                  </h3>
                  <button 
                    onClick={fetchNarrative}
                    disabled={loadingNarrative}
                    className="p-1 text-amber-600 hover:bg-amber-200 rounded transition-colors disabled:opacity-50"
                    title="Regenerate Narrative"
                  >
                    <RefreshCw size={14} className={loadingNarrative ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                {loadingNarrative ? (
                  <div className="py-4 flex items-center gap-3 text-amber-700/60 animate-pulse">
                    <div className="h-2 w-2 bg-amber-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-amber-400 rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <span className="text-xs font-medium italic">Gemini is reflecting on their generosity...</span>
                  </div>
                ) : (
                  <p className="text-amber-900/80 text-sm italic leading-relaxed">
                    "{narrative}"
                  </p>
                )}
              </div>

              {/* Donations Table */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-slate-400" />
                  Donations ({data.donations.length})
                </h3>
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Fund</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.donations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No donations found for this year.</td>
                        </tr>
                      ) : (
                        data.donations.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-700">{new Date(d.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                                {d.fund}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">{d.notes}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              ${d.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={!data || loading}
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>

      </div>
    </div>
  );
};

export default MemberStatementModal;

