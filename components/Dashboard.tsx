
import React, { useState, useEffect } from 'react';
import { Member, Donation, FundType, ChurchSettings } from '../types';
import { 
  TrendingUp, 
  Users, 
  HeartHandshake, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { getFinancialSummary } from '../geminiService';

interface DashboardProps {
  members: Member[];
  donations: Donation[];
  churchSettings: ChurchSettings;
  summary: {
    totalDonations: number;
    donationCount: number;
    avgDonation: number;
    donorCount: number;
  };
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

const Dashboard: React.FC<DashboardProps> = ({ members, donations, churchSettings, summary }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Data for Charts
  const fundData = Object.values(FundType).map((fund) => ({
    name: fund,
    value: donations.filter(d => d.fund === fund).reduce((sum, d) => sum + d.amount, 0)
  })).filter(f => f.value > 0);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const insight = await getFinancialSummary(donations, members);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time overview of {churchSettings.name}'s stewardship.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleGenerateInsight}
            disabled={loadingAi}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-medium disabled:opacity-50"
          >
            {loadingAi ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            AI Insight
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Giving', value: `$${summary.totalDonations.toLocaleString()}`, sub: '+12% from last month', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Members', value: members.length, sub: '2 new this week', icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active Donors', value: summary.donorCount, sub: '75% of membership', icon: HeartHandshake, color: 'bg-purple-50 text-purple-600' },
          { label: 'Avg. Donation', value: `$${summary.avgDonation.toFixed(0)}`, sub: 'Up $15 recently', icon: ArrowUpRight, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight size={12} className="mr-1" /> 12%
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Insight Box */}
      {aiInsight && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2 text-indigo-700 font-bold mb-3">
            <Sparkles size={20} />
            <span>AI Stewardship Insight</span>
          </div>
          <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
            {aiInsight}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Giving by Fund</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {fundData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Stewardship Distribution</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fundData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {fundData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-800">${summary.totalDonations.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-medium">TOTAL GIFTS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
