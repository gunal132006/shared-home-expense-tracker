import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Plus, List, ArrowLeftRight, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import ExpenseHistory from './pages/ExpenseHistory';
import Settlement from './pages/Settlement';
import SettingsPage from './pages/SettingsPage';
import { Toaster } from 'react-hot-toast';
import { MemberProvider, useMember } from './context/MemberContext';
import axios from 'axios';

// Configure Axios Base URL for Production (Vercel -> Render)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

function TopMemberSelector() {
  const location = useLocation();
  const { activeMember, setActiveMember, MEMBERS } = useMember();
  
  // Hide member selector on Add Expense & Settings screens
  if (['/add', '/settings'].includes(location.pathname)) return null;

  return (
    <div className="pt-12 pb-4 px-2 bg-apple-bg/80 backdrop-blur-md sticky top-0 z-40 border-b border-apple-border/50">
      <div className="flex overflow-x-auto hide-scrollbar gap-3 px-3 snap-x pb-2">
        {MEMBERS.map(member => {
          const isActive = activeMember === member;
          return (
            <button
              key={member}
              onClick={() => setActiveMember(member)}
              className={`snap-center shrink-0 rounded-full px-5 py-2.5 font-bold text-sm transition-all duration-300 ${
                isActive 
                  ? 'bg-apple-text text-white shadow-apple-lg scale-105' 
                  : 'bg-white text-apple-textMuted hover:bg-white/80 border border-apple-border/30'
              }`}
            >
              {member}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  if (location.pathname === '/add') return null;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/history', icon: List, label: 'History' },
    { path: '/add', icon: Plus, label: '', primary: true },
    { path: '/settlement', icon: ArrowLeftRight, label: 'Settle' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="glass-nav rounded-full shadow-apple-xl px-2 py-2 flex justify-between items-center relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            if (item.primary) {
              return (
                <Link key={item.path} to={item.path} className="relative z-10 -top-6">
                  <div className="bg-apple-blue text-white rounded-full p-4 shadow-apple-glow active:scale-90 transition-all duration-200">
                    <Icon size={28} strokeWidth={2.5} />
                  </div>
                </Link>
              );
            }

            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center w-16 h-12 rounded-full transition-colors active:bg-black/5">
                <Icon 
                  size={24} 
                  className={`transition-colors duration-200 ${isActive ? 'text-apple-blue stroke-[2.5px]' : 'text-apple-textMuted stroke-2'}`}
                />
                <span className={`text-[10px] font-semibold mt-1 transition-colors duration-200 ${isActive ? 'text-apple-blue' : 'text-apple-textMuted'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <MemberProvider>
      <Router>
        <div className="min-h-[100dvh] max-w-md mx-auto bg-apple-bg relative selection:bg-apple-blue/20 flex flex-col shadow-2xl overflow-x-hidden">
          <Toaster position="top-center" toastOptions={{ 
            className: '!bg-black/80 !text-white !rounded-full !px-6 !py-3 font-semibold text-sm backdrop-blur-md border border-white/10 shadow-apple-lg',
            duration: 3000
          }} />
          <TopMemberSelector />
          <div className="flex-1 overflow-y-auto pb-32">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/history" element={<ExpenseHistory />} />
              <Route path="/settlement" element={<Settlement />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      </Router>
    </MemberProvider>
  );
}

export default App;
