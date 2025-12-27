
import React, { useState } from 'react';
import { Member, Donation, ChurchSettings } from '../types';
import { FileText, Download, Send, Printer, Calendar, CheckCircle2 } from 'lucide-react';

interface ReportsProps {
  members: Member[];
  donations: Donation[];
  churchSettings: ChurchSettings;
}

const Reports: React.FC<ReportsProps> = ({ members, donations, churchSettings }) => {
  const [year, setYear] = useState('2024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setDone(false);
    setTimeout(() => {
      setIsGenerating(false);
      setDone(true);
    }, 2000);
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
                    <option value="2024">2024 (Current)</option>
                    <option value="2023">2023 (Closed)</option>
                    <option value="2022">2022 (Closed)</option>
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

              {done && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 text-emerald-800 font-bold">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    Batch Generated Successfully!
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-100">
                    <Download size={16} />
                    Download ZIP
                  </button>
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
                'Top 10 Fund Distributions',
                'Quarterly Progress Summary',
                'Missing Email Report',
                'New Donor List',
                'Trend Analysis (3 Year)'
              ].map((report, i) => (
                <button key={i} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl text-left hover:bg-indigo-50 transition-colors group">
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
    </div>
  );
};

export default Reports;
