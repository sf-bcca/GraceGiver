
import React, { useState, useEffect } from 'react';
import { Download, X, Calendar, DollarSign, User } from 'lucide-react';
import * as api from '../src/lib/api';

interface MemberReportModalProps {
  memberId: string;
  onClose: () => void;
}

interface ReportData {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    joinedAt?: string;
  };
  stats: {
    lifetimeGiving: number;
    lastDonationDate: string | null;
    lastDonationAmount: number;
    donationCount: number;
    yearsOfMembership: number;
  };
  recentActivity: {
    id: string;
    amount: number;
    fund: string;
    date: string;
  }[];
}

const MemberReportModal: React.FC<MemberReportModalProps> = ({ memberId, onClose }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.fetchMemberReport(memberId);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [memberId]);

  const handleDownload = async () => {
    try {
      const blob = await api.downloadMemberReportPDF(memberId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `member-report-${memberId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download PDF');
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-xl">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-slate-600 font-medium">Generating Report...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-sm text-center">
        <div className="text-red-500 mb-4 text-xl font-bold">Error Loading Report</div>
        <p className="text-slate-600 mb-6">{error}</p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold">Close</button>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{data.member.firstName} {data.member.lastName}</h2>
            <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm">
              <User size={14} />
              <span>Member since {data.member.joinedAt ? new Date(data.member.joinedAt).toLocaleDateString() : 'N/A'}</span>
              <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs font-bold text-slate-600">
                {data.stats.yearsOfMembership} Years
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-2">
                <DollarSign size={16} /> Lifetime Giving
              </div>
              <div className="text-3xl font-extrabold text-indigo-900">
                ${data.stats.lifetimeGiving.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-indigo-600/70 text-xs mt-1">{data.stats.donationCount} total contributions</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider mb-2">
                <Calendar size={16} /> Last Donation
              </div>
              <div className="text-3xl font-extrabold text-emerald-900">
                ${data.stats.lastDonationAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-emerald-600/70 text-xs mt-1">
                {data.stats.lastDonationDate
                  ? new Date(data.stats.lastDonationDate).toLocaleDateString()
                  : 'No donations yet'}
              </p>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              Recent Activity (Last 20)
            </h3>
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Fund</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">No recent activity.</td>
                    </tr>
                  ) : (
                    data.recentActivity.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-700">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                            {d.fund}
                          </span>
                        </td>
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
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Download PDF Report
          </button>
        </div>

      </div>
    </div>
  );
};

export default MemberReportModal;
