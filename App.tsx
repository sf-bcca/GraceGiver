
import React, { useState, Suspense } from 'react';
import Layout from './components/Layout';
import { Member, Donation, ChurchSettings, ViewState } from './types';
import { Loader2, ShieldCheck } from 'lucide-react';

// Lazy load components for performance
const Login = React.lazy(() => import('./components/Login'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const MemberDirectory = React.lazy(() => import('./components/MemberDirectory'));
const DonationEntry = React.lazy(() => import('./components/DonationEntry'));
const Reports = React.lazy(() => import('./components/Reports'));
const Settings = React.lazy(() => import('./components/Settings'));
const PasswordChange = React.lazy(() => import('./components/PasswordChange'));
const UserManagement = React.lazy(() => import('./components/UserManagement'));
const VolunteerMatching = React.lazy(() => import('./components/VolunteerMatching'));
const StewardshipPortal = React.lazy(() => import('./components/StewardshipPortal'));

import { fetchMembers, fetchDonations, createMember, createDonation, fetchDonationSummary } from './src/lib/api';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [showPasswordChange, setShowPasswordChange] = useState<boolean>(false);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationSummary, setDonationSummary] = useState({
    totalDonations: 0,
    donationCount: 0,
    avgDonation: 0,
    donorCount: 0,
    totalMembers: 0,
    newMembersThisWeek: 0,
    currentMonthDonations: 0,
    lastMonthDonations: 0,
    avgRecent: 0,
    avgPrevious: 0
  });

  const [loading, setLoading] = useState(!!token);

  async function loadDonationSummary() {
    try {
      const summaryData = await fetchDonationSummary();
      setDonationSummary(summaryData);
    } catch (error) {
      console.error('Failed to load donation summary:', error);
    }
  }

  const loadData = React.useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [fetchedMembersRes, fetchedDonationsRes, summaryData] = await Promise.all([
        fetchMembers(),
        fetchDonations(),
        fetchDonationSummary(),
      ]);
      const membersData = fetchedMembersRes.data || [];
      const donationsData = fetchedDonationsRes.data || [];

      setMembers(membersData);
      setDonations(donationsData);
      setDonationSummary(summaryData);
    } catch (error) {
      console.error('Failed to load data:', error);
      // TODO: specific error state UI
      setMembers([]);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadData();
  }, [loadData, token]);

  // Background refresh when switching to Dashboard to ensure real-time data
  React.useEffect(() => {
    if (view === 'DASHBOARD' && token) {
      loadData();
    }
  }, [view, token, loadData]);
  
  // Initialize with requested church name
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>({
    name: 'Mt. Herman A.M.E. Church',
    address: '123 Main St, Anytown, ST 12345',
    phone: '(555) 123-4567',
    email: 'office@mthermaname.org',
    taxId: '12-3456789'
  });

  const handleLoginSuccess = (passwordChangeRequired: boolean = false) => {
    setToken(localStorage.getItem('token'));
    setMustChangePassword(passwordChangeRequired);
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    setShowPasswordChange(false);
  };

  const handleOpenPasswordChange = () => {
    setShowPasswordChange(true);
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordChange(false);
  };

  const handleAddMember = async (newMemberData: Omit<Member, 'id' | 'createdAt'>) => {
    // MemberDirectory already handles the mutation and local state
    // We just need to refresh global state for Dashboard/Donation lists
    await loadData();
  };

  const handleAddDonation = async (newDonationData: Omit<Donation, 'id' | 'timestamp' | 'enteredBy'>) => {
    // DonationEntry already handles the mutation and local history
    // We just need to refresh global state for Dashboard summary
    await loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setMustChangePassword(false);
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
              return <Dashboard members={members} donations={donations} churchSettings={churchSettings} summary={donationSummary} />;
            case 'MEMBERS':
              return <MemberDirectory members={members} onAddMember={handleAddMember} setView={setView} setSelectedMemberId={setSelectedMemberId} />;
            case 'ENTRY':
              return <DonationEntry members={members} donations={donations} onAddDonation={handleAddDonation} memberId={selectedMemberId || undefined} />;
            case 'REPORTS':
              return <Reports members={members} donations={donations} churchSettings={churchSettings} />;
            case 'SETTINGS':
              return <Settings settings={churchSettings} onUpdate={setChurchSettings} onChangePassword={handleOpenPasswordChange} />;
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
            case 'USERS':
              return <UserManagement currentUserId={JSON.parse(localStorage.getItem('user') || '{}').id} currentUserRole={JSON.parse(localStorage.getItem('user') || '{}').role} />;
            case 'VOLUNTEER':
              return <VolunteerMatching />;
            case 'STEWARDSHIP':
              return <StewardshipPortal />;
            default:
              return <Dashboard members={members} donations={donations} churchSettings={churchSettings} />;
          }
        })()}
      </Suspense>
    );
  };

  // Not logged in - show login page
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged in but must change password - show password change page (forced)
  if (mustChangePassword) {
    return (
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
        <PasswordChange onSuccess={handlePasswordChanged} isForced={true} />
      </Suspense>
    );
  }

  // User wants to change password voluntarily from Settings
  if (showPasswordChange) {
    return (
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
        <PasswordChange onSuccess={handlePasswordChanged} onCancel={handleCancelPasswordChange} isForced={false} />
      </Suspense>
    );
  }

  // Logged in and password is OK - show main app
  return (
    <Layout activeView={view} setView={setView} churchName={churchSettings.name} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;
