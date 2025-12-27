
import React, { useState, Suspense } from 'react';
import Layout from './components/Layout';
import { Member, Donation, ChurchSettings, ViewState } from './types';
import { Loader2 } from 'lucide-react';
// Lazy load components for performance
const Login = React.lazy(() => import('./components/Login'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const MemberDirectory = React.lazy(() => import('./components/MemberDirectory'));
const DonationEntry = React.lazy(() => import('./components/DonationEntry'));
const Reports = React.lazy(() => import('./components/Reports'));
const Settings = React.lazy(() => import('./components/Settings'));
import { fetchMembers, fetchDonations, createMember, createDonation } from './src/lib/api';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [members, setMembers] = useState<Member[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!token) return;
    async function loadData() {
      try {
        const [fetchedMembersRes, fetchedDonationsRes] = await Promise.all([
          fetchMembers(),
          fetchDonations()
        ]);
        // Handle both array (legacy/mock) and paginated response { data: [] }
        const membersData = Array.isArray(fetchedMembersRes) ? fetchedMembersRes : (fetchedMembersRes.data || []);
        const donationsData = Array.isArray(fetchedDonationsRes) ? fetchedDonationsRes : (fetchedDonationsRes.data || []);

        setMembers(membersData);
        setDonations(donationsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        // TODO: specific error state UI
        setMembers([]);
        setDonations([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);
  
  // Initialize with requested church name
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>({
    name: 'Mt. Herman A.M.E. Church',
    address: '123 Main St, Anytown, ST 12345',
    phone: '(555) 123-4567',
    email: 'office@mthermaname.org',
    taxId: '12-3456789'
  });

  const handleAddMember = async (newMemberData: Omit<Member, 'id' | 'createdAt'>) => {
    const tempId = `m${Date.now()}`;
    const newMember: Member = {
      ...newMemberData,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic update
    setMembers([...members, newMember]);
    
    try {
      await createMember(newMember);
    } catch (error) {
      console.error('Failed to save member:', error);
      // Revert optimization if needed (optional)
    }
  };

  const handleAddDonation = async (newDonationData: Omit<Donation, 'id' | 'timestamp' | 'enteredBy'>) => {
    const tempId = `d${Date.now()}`;
    const newDonation: Omit<Donation, 'id'> = {
      ...newDonationData,
      timestamp: new Date().toISOString(),
      enteredBy: 'Admin',
    };
    
    // Optimistic update (adding temporary ID for list rendering)
    setDonations([{ ...newDonation, id: tempId } as Donation, ...donations]);
    
    try {
      const savedDonation = await createDonation({
        memberId: newDonation.memberId,
        amount: newDonation.amount,
        fund: newDonation.fund,
        notes: newDonation.notes,
        enteredBy: newDonation.enteredBy
      });
      // Replace temp item with saved item if needed
    } catch (error) {
      console.error('Failed to save donation:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setView('DASHBOARD');
  };

  const renderView = () => {
    return (
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }>
        {(() => {
          switch (view) {
            case 'DASHBOARD':
              return <Dashboard members={members} donations={donations} churchSettings={churchSettings} />;
            case 'MEMBERS':
              return <MemberDirectory members={members} onAddMember={handleAddMember} />;
            case 'ENTRY':
              return <DonationEntry members={members} donations={donations} onAddDonation={handleAddDonation} />;
            case 'REPORTS':
              return <Reports members={members} donations={donations} churchSettings={churchSettings} />;
            case 'SETTINGS':
              return <Settings settings={churchSettings} onUpdate={setChurchSettings} />;
            case 'AUDIT':
              return (
                <div className="animate-in fade-in duration-500">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Security Audit Logs</h1>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-8">
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <ShieldCheck size={48} />
                      </div>
                      <p className="text-lg font-medium">Audit logs are restricted to Super-Admin roles.</p>
                      <p className="text-sm">Contact your system administrator for access.</p>
                    </div>
                  </div>
                </div>
              );
            default:
              return <Dashboard members={members} donations={donations} churchSettings={churchSettings} />;
          }
        })()}
      </Suspense>
    );
  };
  if (!token) {
    return (
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
        <Login onLoginSuccess={() => setToken(localStorage.getItem('token'))} />
      </Suspense>
    );
  }

  return (
    <Layout activeView={view} setView={setView} churchName={churchSettings.name} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

// Re-import icons just for the AUDIT mock screen in this file
import { ShieldCheck } from 'lucide-react';

export default App;
