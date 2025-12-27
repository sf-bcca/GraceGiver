
import React from 'react';
import { ViewState } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  FileText, 
  ShieldCheck, 
  LogOut,
  Menu,
  X,
  Settings
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  setView: (view: ViewState) => void;
  churchName: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, churchName, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'DASHBOARD' as ViewState, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'MEMBERS' as ViewState, label: 'Members', icon: Users },
    { id: 'ENTRY' as ViewState, label: 'Donation Entry', icon: HandCoins },
    { id: 'REPORTS' as ViewState, label: 'Reports', icon: FileText },
    { id: 'USERS' as ViewState, label: 'User Management', icon: ShieldCheck },
    { id: 'SETTINGS' as ViewState, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">
            {churchName.charAt(0)}
          </div>
          <span className="font-bold text-lg tracking-tight truncate max-w-[200px]">{churchName}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 hidden md:flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-xl shrink-0">
              {churchName.charAt(0)}
            </div>
            <span className="font-bold text-xl tracking-tight truncate leading-tight">{churchName}</span>
          </div>

          <nav className="flex-1 mt-4 px-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${activeView === item.id 
                    ? 'bg-indigo-700 text-white shadow-lg' 
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-indigo-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-xs font-bold">AD</div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate">Admin User</span>
                <span className="text-xs text-indigo-300 truncate">Secretary</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors w-full px-2 py-1"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
