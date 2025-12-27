
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MemberDirectory from './components/MemberDirectory';
import DonationEntry from './components/DonationEntry';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { ViewState, Member, Donation, ChurchSettings } from './types';
import { INITIAL_MEMBERS as mockMembers, INITIAL_DONATIONS as mockDonations } from './mockData';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [donations, setDonations] = useState<Donation[]>(mockDonations);
  
  // Initialize with requested church name
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>({
    name: 'Mt. Herman A.M.E. Church',
    address: '123 Main St, Anytown, ST 12345',
    phone: '(555) 123-4567',
    email: 'office@mthermaname.org',
    taxId: '12-3456789'
  });

  const handleAddMember = (newMemberData: Omit<Member, 'id' | 'createdAt'>) => {
    const newMember: Member = {
      ...newMemberData,
      id: `m${members.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    setMembers([...members, newMember]);
  };

  const handleAddDonation = (newDonationData: Omit<Donation, 'id' | 'timestamp' | 'enteredBy'>) => {
    const newDonation: Donation = {
      ...newDonationData,
      id: `d${donations.length + 1}`,
      timestamp: new Date().toISOString(),
      enteredBy: 'Admin',
    };
    setDonations([...donations, newDonation]);
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
