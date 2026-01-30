import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Heart, 
  FileText, 
  Settings, 
  LogOut, 
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Award,
  Download,
  Loader2,
  Clock,
  HeartHandshake
} from 'lucide-react';
import { Member, Donation, ChurchSettings } from '../types';
import { 
  fetchSelfProfile, 
  fetchSelfDonations, 
  fetchSelfStatements,
  fetchSelfOpportunities
} from '../src/lib/api';

interface MemberDashboardProps {
  churchSettings: ChurchSettings;
  onLogout: () => void;
  onOpenSettings: () => void;
}

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

interface Opportunity {
  id: number;
  title: string;
  description: string;
  required_skills: string[];
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ churchSettings, onLogout, onOpenSettings }) => {
  const [profile, setProfile] = useState<Member | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [statements, setStatements] = useState<number[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMemberData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        
        const [profileRes, donationsRes, statementsRes, campaignsRes, opportunitiesRes] = await Promise.all([
          fetchSelfProfile(),
          fetchSelfDonations(),
          fetchSelfStatements(),
          fetch(`${apiUrl}/api/stewardship/campaigns`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.json()),
          fetchSelfOpportunities()
        ]);
        
        setProfile(profileRes);
        setDonations(donationsRes.data);
        setStatements(statementsRes);
        setCampaigns(campaignsRes);
        setOpportunities(opportunitiesRes);
      } catch (err) {
        console.error('Failed to load member data:', err);
        setError('Failed to load your profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadMemberData();
  }, []);

  const totalGivenThisYear = donations
    .filter(d => new Date(d.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, d) => sum + d.amount, 0);

  const getCampaignProgress = (campaign: Campaign) => {
    const memberGivingToFund = donations
      .filter(d => d.fund === campaign.fund_name)
      .reduce((sum, d) => sum + d.amount, 0);
    
    return {
      memberAmount: memberGivingToFund,
      totalAmount: campaign.current_amount,
      goal: campaign.goal_amount,
      percent: (campaign.current_amount / campaign.goal_amount) * 100,
      memberPercent: (memberGivingToFund / campaign.current_amount) * 100
    };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
          <p className="text-slate-600 mb-6">{error || 'Could not find your member record.'}</p>
          <button 
            onClick={onLogout}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Member Header */}
      <header className="bg-indigo-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Logo" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="font-bold text-xl tracking-tight leading-none">{churchSettings.name}</h1>
              <span className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Member Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={onOpenSettings}
              className="p-2.5 hover:bg-indigo-800 rounded-xl transition-colors text-indigo-100"
              title="Settings"
            >
              <Settings size={22} />
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-800/50 hover:bg-indigo-800 text-white rounded-xl transition-all border border-indigo-700/50 font-medium"
            >
              <LogOut size={18} className="hidden sm:block" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Welcome & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold shrink-0">
              {profile.firstName[0]}{profile.lastName[0]}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome, {profile.firstName}!</h2>
              <p className="text-slate-500 mt-1 flex items-center gap-2 font-medium">
                <Calendar size={16} />
                Member since {profile.joinedAt ? new Date(profile.joinedAt).getFullYear() : new Date(profile.createdAt).getFullYear()}
              </p>
            </div>
          </div>

          <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg shadow-emerald-100 text-white flex flex-col justify-center">
            <div className="flex items-center gap-2 text-emerald-100 font-bold text-xs uppercase tracking-widest mb-2">
              <TrendingUp size={16} />
              <span>Giving This Year</span>
            </div>
            <div className="text-4xl font-bold tracking-tight">${totalGivenThisYear.toLocaleString()}</div>
          </div>
        </div>

        {/* Campaign Progress */}
        {campaigns.length > 0 && (
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <Target size={20} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-lg">Stewardship Goals</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {campaigns.map(campaign => {
                const stats = getCampaignProgress(campaign);
                return (
                  <div key={campaign.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="font-bold text-slate-800">{campaign.title}</h4>
                        <p className="text-xs text-slate-500 font-medium">Total Raised: ${stats.totalAmount.toLocaleString()} / ${stats.goal.toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-black text-emerald-600">{stats.percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, stats.percent)}%` }}
                      />
                    </div>
                    {stats.memberAmount > 0 && (
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        Your Impact: ${stats.memberAmount.toLocaleString()} ({stats.memberPercent.toFixed(1)}% of total raised)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-1 space-y-8">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <User size={18} className="text-indigo-600" />
                  My Profile
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                      <p className="text-slate-700 font-medium">{profile.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telephone</p>
                      <p className="text-slate-700 font-medium">{profile.telephone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</p>
                      <p className="text-slate-700 font-medium">
                        {profile.address}<br />
                        {profile.city}, {profile.state} {profile.zip}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Award size={14} className="text-indigo-600" />
                    Skills & Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills && profile.skills.length > 0 ? (
                      profile.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No skills listed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Ministry Matches Section */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <HeartHandshake size={18} className="text-emerald-600" />
                  Ministry Matches
                </h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider">AI Powered</span>
              </div>
              <div className="p-6">
                {opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {opportunities.slice(0, 3).map(opp => (
                      <div key={opp.id} className="group cursor-pointer">
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{opp.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{opp.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {opp.required_skills.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded uppercase tracking-tighter border border-slate-100">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg transition-all mt-2">
                      View All Opportunities
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-400 italic leading-relaxed">
                      Add more skills to your profile to see matched ministry roles!
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Statements Section */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  Tax Statements
                </h3>
              </div>
              <div className="p-6">
                {statements.length > 0 ? (
                  <div className="space-y-3">
                    {statements.map(year => (
                      <button 
                        key={year}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl transition-all group border border-transparent hover:border-indigo-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 font-bold shadow-sm">
                            {year}
                          </div>
                          <span className="font-bold text-slate-700">Annual Statement</span>
                        </div>
                        <Download size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400 italic">No statements available.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Giving History */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-full">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Heart size={18} className="text-rose-500" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-0">
                {donations.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {donations.slice(0, 5).map((donation) => (
                      <div key={donation.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-indigo-600">
                             <TrendingUp size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">${donation.amount.toLocaleString()}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">{donation.fund}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                              <Calendar size={12} />
                              <span>{new Date(donation.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        {donation.notes && (
                          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 max-w-[200px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Info size={12} />
                            <p className="truncate italic">"{donation.notes}"</p>
                          </div>
                        )}
                        <ChevronRight className="text-slate-300" size={20} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Heart size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No donation records found.</p>
                    <p className="text-sm">Your contributions will appear here once recorded.</p>
                  </div>
                )}
              </div>
              {donations.length > 5 && (
                <div className="p-6 border-t border-slate-50 text-center">
                   <button className="text-indigo-600 font-bold text-sm hover:underline">View All History</button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-xs border-t border-slate-200 mt-auto bg-white">
        <p>&copy; {new Date().getFullYear()} Mt. Herman A.M.E. Church. All rights reserved.</p>
        <p className="mt-1">Secure stewardship powered by GraceGiver.</p>
      </footer>
    </div>
  );
};

// Internal small components
const ChevronRight = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export default MemberDashboard;
