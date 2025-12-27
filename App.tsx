
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MemberDirectory from './components/MemberDirectory';
import DonationEntry from './components/DonationEntry';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { ViewState, Member, Donation, ChurchSettings } from './types';
import { INITIAL_MEMBERS as mockMembers, INITIAL_DONATIONS as mockDonations } from './mockData';
import { fetchMembers, fetchDonations, createMember, createDonation } from './src/lib/api';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [members, setMembers] = useState<Member[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [fetchedMembers, fetchedDonations] = await Promise.all([
          fetchMembers(),
          fetchDonations()
        ]);
        setMembers(fetchedMembers.length > 0 ? fetchedMembers : mockMembers);
        setDonations(fetchedDonations.length > 0 ? fetchedDonations : mockDonations);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback to mock data on error
        setMembers(mockMembers);
        setDonations(mockDonations);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
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

  const renderView = () => {
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
  };

  return (
    <Layout activeView={view} setView={setView} churchName={churchSettings.name}>
      {renderView()}
    </Layout>
  );
};

// Re-import icons just for the AUDIT mock screen in this file
import { ShieldCheck } from 'lucide-react';

export default App;
