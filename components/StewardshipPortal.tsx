import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Info, History, Calendar, CheckCircle2, LayoutDashboard, FileText, ArrowUpRight } from 'lucide-react';
import { fetchCampaigns, createCampaign } from '../src/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Campaign {
  id: number;
  fund_name: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  end_date?: string;
  is_active: boolean;
}

const StewardshipPortal: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    fundName: 'Offering',
    title: '',
    description: '',
    goalAmount: '',
    endDate: ''
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCampaign({
        ...newCampaign,
        goalAmount: parseFloat(newCampaign.goalAmount)
      });
      setIsModalOpen(false);
      setNewCampaign({ fundName: 'Offering', title: '', description: '', goalAmount: '', endDate: '' });
      loadCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            CommunityBridge Stewardship <Target className="text-emerald-500" size={28} />
          </h1>
          <p className="text-slate-500 mt-1">Transparent progress tracking for our shared ministry goals.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-medium"
        >
          <Target size={18} />
          New Campaign
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <TrendingUp className="animate-bounce text-emerald-500" size={48} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center text-slate-400">
          <Info size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold">No Active Campaigns</h3>
          <p className="mt-2 text-slate-500">Launch a new fundraising campaign to track progress here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {campaigns.map(campaign => {
            const progress = (campaign.current_amount / campaign.goal_amount) * 100;
            const remaining = Math.max(0, campaign.goal_amount - campaign.current_amount);
            
            const chartData = [
              { name: 'Raised', value: parseFloat(campaign.current_amount.toString()), color: '#10b981' },
              { name: 'Remaining', value: parseFloat(remaining.toString()), color: '#f1f5f9' }
            ];

            return (
              <div key={campaign.id} className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <div className="p-8 border-b border-slate-50">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                         <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                           {campaign.fund_name} Fund
                         </span>
                         {progress >= 100 && (
                           <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                             <CheckCircle2 size={10} /> Goal Reached
                           </span>
                         )}
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{campaign.title}</h3>
                      <p className="text-slate-500 mt-2 leading-relaxed">{campaign.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="mb-6">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Progress</div>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black text-slate-900">${parseFloat(campaign.current_amount.toString()).toLocaleString()}</span>
                          <span className="text-slate-400 text-sm mb-1">/ ${parseFloat(campaign.goal_amount.toString()).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-slate-500">Progress</span>
                            <span className="text-emerald-600 font-black">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <div className="flex items-center gap-1.5"><Calendar size={14} /> Ends {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}</div>
                           <div className="flex items-center gap-1.5"><History size={14} /> Updated Recently</div>
                        </div>
                      </div>
                    </div>

                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50/50 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shareable Impact Page</span>
                  <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                    <ArrowUpRight size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-emerald-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">New Stewardship Campaign</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:opacity-75 transition-opacity">
                 <XAxis hide />
                 <TrendingUp size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign Title</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g., Roof Repair 2024"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  value={newCampaign.title}
                  onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Fund</label>
                  <select 
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    value={newCampaign.fundName}
                    onChange={e => setNewCampaign({...newCampaign, fundName: e.target.value})}
                  >
                    <option value="Benevolence">Benevolence</option>
                    <option value="Church School">Church School</option>
                    <option value="Lay">Lay</option>
                    <option value="Offering">Offering</option>
                    <option value="Other">Other</option>
                    <option value="Revival">Revival</option>
                    <option value="Tithes">Tithes</option>
                    <option value="Upkeep">Upkeep</option>
                    <option value="WMS">WMS</option>
                    <option value="YPD">YPD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Goal Amount ($)</label>
                  <input 
                    required
                    type="number" 
                    placeholder="5000"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    value={newCampaign.goalAmount}
                    onChange={e => setNewCampaign({...newCampaign, goalAmount: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Explain the impact of this goal..."
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  value={newCampaign.description}
                  onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date (Optional)</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  value={newCampaign.endDate}
                  onChange={e => setNewCampaign({...newCampaign, endDate: e.target.value})}
                />
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
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  <Target size={18} />
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StewardshipPortal;
