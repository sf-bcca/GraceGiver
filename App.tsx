
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

import { fetchMembers, fetchDonations, createMember, createDonation, fetchDonationSummary, fetchSettings, updateSettings } from './src/lib/api';
import { SocketProvider, useSocket } from './src/contexts/SocketContext';

// Inner component to handle socket events (must be inside SocketProvider)
const AppContent: React.FC<{
  token: string | null;
  setToken: (t: string | null) => void;
}> = ({ token, setToken }) => {
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

  // Socket Integration for Real-Time Updates
  const { socket } = useSocket();

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
      // Keep previous data on error to prevent flash
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Listen for global data update events
  React.useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = (event: any) => {
      console.log('Real-time update received:', event);
      // Strategy A: Simple Refetch
      loadData();
    };

    socket.on('member:update', handleDataUpdate);
    socket.on('donation:update', handleDataUpdate);
    socket.on('settings:update', handleDataUpdate); // Might not need full reload for settings but consistency is good
    socket.on('user:update', handleDataUpdate); // Relevant for admins

    return () => {
      socket.off('member:update', handleDataUpdate);
      socket.off('donation:update', handleDataUpdate);
      socket.off('settings:update', handleDataUpdate);
      socket.off('user:update', handleDataUpdate);
    };
  }, [socket, loadData]);

  React.useEffect(() => {
    loadData();
  }, [loadData, token]);

  // Background refresh when switching to Dashboard to ensure real-time data
  React.useEffect(() => {
    if (view === 'DASHBOARD' && token) {
      loadData();
    }
  }, [view, token, loadData]);

  const [churchSettings, setChurchSettings] = useState<ChurchSettings>({
    name: 'GraceGiver',
    address: '',
    phone: '',
    email: '',
    taxId: ''
  });

  const loadSettings = React.useCallback(async () => {
    try {
      const settingsData = await fetchSettings();
      setChurchSettings(settingsData);
    } catch (error) {
      console.error('Failed to load church settings:', error);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdateSettings = async (newSettings: ChurchSettings) => {
    try {
      const updatedSettings = await updateSettings(newSettings);
      setChurchSettings(updatedSettings);
      // Optionally, show a success message to the user
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Optionally, show an error message to the user
    }
  };

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
              return <Settings settings={churchSettings} onUpdate={handleUpdateSettings} onChangePassword={handleOpenPasswordChange} />;
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

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  return (
    <SocketProvider>
      <AppContent token={token} setToken={setToken} />
    </SocketProvider>
  );
};

export default App;
