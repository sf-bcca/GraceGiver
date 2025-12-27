
import React, { useState } from 'react';
import { Member, Donation, ChurchSettings } from '../types';
import { FileText, Download, Send, Printer, Calendar, CheckCircle2, X, Mail, UserPlus, Edit2, Save, PieChart, TrendingUp, BarChart3 } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import * as api from '../src/lib/api';

interface ReportsProps {
  members: Member[];
  donations: Donation[];
  churchSettings: ChurchSettings;
}

const Reports: React.FC<ReportsProps> = ({ members, donations, churchSettings }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  // Phase 2 + 3: Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'missing-emails' | 'new-donors' | 'fund-distribution' | 'quarterly-progress' | 'trend-analysis' | null>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');

  // Chart colors for Recharts
  const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

  // Generate range from 2022 to the current year
  const reportingYears = Array.from(
    { length: Math.max(0, currentYear - 2022 + 1) }, 
    (_, i) => (currentYear - i).toString()
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDone(false);
    setError(null);
    try {
      const blob = await api.downloadBatchStatement(year);
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      // Create blob URL and open in new tab (bypasses Chrome download restrictions)
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      window.open(url, '_blank');
      
      setDone(true);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setError(err.message || 'Failed to generate statements');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleExport = async (reportName: string) => {
    if (reportName === 'Full Transaction Log') {
      try {
        const blob = await api.exportTransactions(year);
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch(e: any) {
        console.error(e);
        alert(e.message);
      }
    } else if (reportName === 'Missing Email Report') {
      try {
        setModalLoading(true);
        setModalType('missing-emails');
        setModalOpen(true);
        const data = await api.getMissingEmailsReport();
        setModalData(data);
      } catch(e: any) {
        console.error(e);
        alert(e.message);
        setModalOpen(false);
      } finally {
        setModalLoading(false);
      }
    } else if (reportName === 'New Donor List') {
      try {
        setModalLoading(true);
        setModalType('new-donors');
        setModalOpen(true);
        const data = await api.getNewDonorsReport();
        setModalData(data);
      } catch(e: any) {
        console.error(e);
        alert(e.message);
        setModalOpen(false);
      } finally {
        setModalLoading(false);
      }
    } else if (reportName === 'Top 10 Fund Distributions') {
      try {
        setModalLoading(true);
        setModalType('fund-distribution');
        setModalOpen(true);
        const data = await api.getFundDistribution(year);
        // Format data for Recharts
        setModalData(data.map((d: any) => ({ name: d.fund, value: parseFloat(d.total) })));
      } catch(e: any) {
        console.error(e);
        alert(e.message);
        setModalOpen(false);
      } finally {
        setModalLoading(false);
      }
    } else if (reportName === 'Quarterly Progress Summary') {
      try {
        setModalLoading(true);
        setModalType('quarterly-progress');
        setModalOpen(true);
        const data = await api.getQuarterlyProgress(year);
        // Transform data for line chart: [{ quarter: 'Q1', currentYear: 100, previousYear: 80 }, ...]
        const transformed: any = {};
        data.forEach((d: any) => {
          const qKey = `Q${d.quarter}`;
          if (!transformed[qKey]) transformed[qKey] = { quarter: qKey };
          if (d.year === parseInt(year)) {
            transformed[qKey].currentYear = parseFloat(d.total);
          } else {
            transformed[qKey].previousYear = parseFloat(d.total);
          }
        });
        setModalData(Object.values(transformed));
      } catch(e: any) {
        console.error(e);
        alert(e.message);
        setModalOpen(false);
      } finally {
        setModalLoading(false);
      }
    } else if (reportName === 'Trend Analysis (3 Year)') {
      try {
        setModalLoading(true);
        setModalType('trend-analysis');
        setModalOpen(true);
        const data = await api.getTrendAnalysis();
        setModalData(data.map((d: any) => ({ year: d.year.toString(), total: parseFloat(d.total) })));
      } catch(e: any) {
        console.error(e);
        alert(e.message);
        setModalOpen(false);
      } finally {
        setModalLoading(false);
      }
    } else {
      alert(`${reportName} is not yet implemented.`);
    }
  };

  const handleSaveEmail = async (memberId: number) => {
    try {
      await api.updateMember(String(memberId), { email: editEmail });
      // Update local state
      setModalData(prev => prev.filter(m => m.id !== memberId));
      setEditingId(null);
      setEditEmail('');
    } catch(e: any) {
      alert('Failed to update email: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Statement Center</h1>
          <p className="text-slate-500 mt-1">Generate IRS-compliant donation summaries for {churchSettings.name}.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Annual Contribution Statements
            </h2>
            
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tax Year</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {reportingYears.map((y) => (
                      <option key={y} value={y}>
                        {y} {y === currentYear.toString() ? '(Current)' : '(Closed)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Statement Type</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900">
                    <option>Standard (IRS Complaint)</option>
                    <option>Internal Breakdown (Funds Only)</option>
                    <option>Missions Detailed Report</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <FileText className="text-indigo-600" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Ready for Batch Processing</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    System has detected <strong>{members.length} member records</strong> with <strong>{donations.length} transactions</strong> for {year}. All statements will include {churchSettings.name}'s official heading and required legal disclosure.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {isGenerating ? 'Processing...' : (
                    <>
                      <Printer size={20} />
                      Generate Batch (PDF)
                    </>
                  )}
                </button>
                <button className="flex-1 flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-50 shadow-sm transition-all">
                  <Send size={20} />
                  Email to Members
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
                   <div className="font-bold">Error:</div> {error}
                </div>
              )}

              {done && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 text-emerald-800 font-bold">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    Batch Generated Successfully!
                  </div>
                  <a 
                    href={downloadUrl || '#'}
                    download={`Statement_Batch_${year}.pdf`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-colors"
                  >
                    <Download size={16} />
                    Download PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Quick Reports</h3>
            <div className="space-y-3">
              {[
                'Full Transaction Log', 
                'Top 10 Fund Distributions',
                'Quarterly Progress Summary',
                'Missing Email Report',
                'New Donor List',
                'Trend Analysis (3 Year)'
              ].map((report, i) => (
                <button key={i} onClick={() => handleExport(report)} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl text-left hover:bg-indigo-50 transition-colors group">
                  <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{report}</span>
                  <Download size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="font-bold text-lg mb-2">Compliance Alert</h3>
            <p className="text-xs text-indigo-200 leading-relaxed mb-4">
              Receipts for <strong>{churchSettings.name}</strong> include the required legal disclosure regarding goods and services for valid tax deductions.
            </p>
            <div className="p-3 bg-indigo-800 rounded-lg text-[10px] font-mono leading-tight text-indigo-300">
              "No goods or services were provided in exchange for this contribution other than intangible religious benefits."
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2: Report Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {modalType === 'missing-emails' && <Mail className="text-amber-500" size={24} />}
                {modalType === 'new-donors' && <UserPlus className="text-emerald-500" size={24} />}
                {modalType === 'fund-distribution' && <PieChart className="text-indigo-500" size={24} />}
                {modalType === 'quarterly-progress' && <TrendingUp className="text-blue-500" size={24} />}
                {modalType === 'trend-analysis' && <BarChart3 className="text-purple-500" size={24} />}
                <h2 className="text-xl font-bold text-slate-800">
                  {modalType === 'missing-emails' && 'Missing Email Report'}
                  {modalType === 'new-donors' && 'New Donors (Last 30 Days)'}
                  {modalType === 'fund-distribution' && `Fund Distribution (${year})`}
                  {modalType === 'quarterly-progress' && `Quarterly Progress vs ${parseInt(year) - 1}`}
                  {modalType === 'trend-analysis' && 'Trend Analysis (3 Year)'}
                </h2>
              </div>
              <button 
                onClick={() => { setModalOpen(false); setModalData([]); setEditingId(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {modalLoading ? (
                <div className="text-center py-12 text-slate-500">Loading...</div>
              ) : modalData.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  {modalType === 'missing-emails' && '🎉 All members have email addresses!'}
                  {modalType === 'new-donors' && 'No new donors in the last 30 days.'}
                  {(modalType === 'fund-distribution' || modalType === 'quarterly-progress' || modalType === 'trend-analysis') && 'No donation data available for this period.'}
                </div>
              ) : modalType === 'fund-distribution' ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={modalData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {modalData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : modalType === 'quarterly-progress' ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={modalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="currentYear" stroke="#4f46e5" strokeWidth={2} name={year} />
                      <Line type="monotone" dataKey="previousYear" stroke="#94a3b8" strokeWidth={2} name={String(parseInt(year) - 1)} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : modalType === 'trend-analysis' ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-3">Name</th>
                      {modalType === 'missing-emails' ? (
                        <>
                          <th className="pb-3">Address</th>
                          <th className="pb-3">Email Action</th>
                        </>
                      ) : (
                        <>
                          <th className="pb-3">Email</th>
                          <th className="pb-3">Joined</th>
                          <th className="pb-3">Total Given</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {modalData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-800">
                          {row.first_name} {row.last_name}
                        </td>
                        {modalType === 'missing-emails' ? (
                          <>
                            <td className="py-3 text-slate-600">{row.address || '—'}</td>
                            <td className="py-3">
                              {editingId === row.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="px-2 py-1 border border-slate-200 rounded text-sm w-40"
                                    placeholder="email@example.com"
                                  />
                                  <button 
                                    onClick={() => handleSaveEmail(row.id)}
                                    className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                  >
                                    <Save size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => { setEditingId(row.id); setEditEmail(''); }}
                                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                >
                                  <Edit2 size={14} /> Add Email
                                </button>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 text-slate-600">{row.email || '—'}</td>
                            <td className="py-3 text-slate-600">
                              {new Date(row.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-slate-600">
                              ${parseFloat(row.total_donated).toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <div className="text-sm text-slate-500">
                {modalData.length} {modalData.length === 1 ? 'record' : 'records'} found
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
