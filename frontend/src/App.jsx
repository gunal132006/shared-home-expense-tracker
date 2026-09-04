import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Plus, List, ArrowLeftRight, Settings } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MemberProvider, useMember } from './context/MemberContext';
import { MonthProvider } from './context/MonthContext';
import { ThemeProvider } from './context/ThemeContext';
import { checkAndRecoverSubscription } from './utils/push';
import { triggerHaptic } from './utils/haptics';
import DashboardSkeleton from './components/DashboardSkeleton';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const ExpenseHistory = lazy(() => import('./pages/ExpenseHistory'));
const Settlement = lazy(() => import('./pages/Settlement'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MonthlyAnalytics = lazy(() => import('./pages/MonthlyAnalytics'));

// Configure robust focus listener across mobile browsers, WebViews, and Android TWA
focusManager.setEventListener((handleFocus) => {
  if (typeof window !== 'undefined' && window.addEventListener) {
    const listener = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        handleFocus(true);
      }
    };
    window.addEventListener('visibilitychange', listener, false);
    document.addEventListener('visibilitychange', listener, false);
    window.addEventListener('focus', listener, false);
    window.addEventListener('pageshow', listener, false);
    return () => {
      window.removeEventListener('visibilitychange', listener);
      document.removeEventListener('visibilitychange', listener);
      window.removeEventListener('focus', listener);
      window.removeEventListener('pageshow', listener);
    };
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Mark data as stale immediately so background revalidation always fetches fresh server data
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection retention for instant transitions
      refetchOnWindowFocus: 'always', // Revalidate whenever app becomes active/focused
      refetchOnReconnect: 'always', // Revalidate as soon as network returns
      retry: 1
    },
  },
});

function CrossDeviceSync() {
  useEffect(() => {
    const invalidateAllFinancialQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-analytics'] });
    };

    // 1. Service Worker push / notification-click broadcast
    let swHandler;
    if ('serviceWorker' in navigator) {
      swHandler = (event) => {
        if (event.data && event.data.type === 'REFRESH_EXPENSES') {
          invalidateAllFinancialQueries();
        }
      };
      navigator.serviceWorker.addEventListener('message', swHandler);
    }

    // 2. BroadcastChannel for same-device cross-tab / cross-window instant sync
    let bc;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('homesplit_sync');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'EXPENSE_MUTATED') {
            invalidateAllFinancialQueries();
          }
        };
      }
    } catch (_e) {
      // Ignore if unsupported
    }

    return () => {
      if (swHandler && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', swHandler);
      }
      if (bc) {
        bc.close();
      }
    };
  }, []);

  return null;
}

function PushRecovery() {
  const { activeMember } = useMember();
  useEffect(() => {
    if (!activeMember) return;
    
    const runRecovery = () => {
      checkAndRecoverSubscription(activeMember).catch(console.error);
    };

    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(runRecovery, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(runRecovery, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeMember]);
  return null;
}

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
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={member}
              onClick={() => {
                triggerHaptic('light');
                setActiveMember(member);
              }}
              className={`snap-center shrink-0 rounded-full px-5 py-2.5 font-bold text-sm transition-colors duration-300 ${
                isActive 
                  ? 'bg-apple-text text-apple-card shadow-apple-lg' 
                  : 'bg-apple-card text-apple-textMuted hover:bg-apple-card/80 border border-apple-border/50'
              }`}
            >
              {member}
            </motion.button>
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
                <Link key={item.path} to={item.path} className="relative z-10 -top-6" onClick={() => triggerHaptic('medium')}>
                  <motion.div 
                    whileTap={{ scale: 0.9 }}
                    className="bg-apple-blue text-white rounded-full p-4 shadow-apple-glow transition-colors duration-200"
                  >
                    <Icon size={28} strokeWidth={2.5} />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => { if(!isActive) triggerHaptic('light'); }}
                className="flex flex-col items-center justify-center w-16 h-12 rounded-full relative"
              >
                <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center justify-center w-full h-full">
                  <Icon 
                    size={24} 
                    className={`transition-colors duration-200 ${isActive ? 'text-apple-blue stroke-[2.5px]' : 'text-apple-textMuted stroke-2'}`}
                  />
                  <span className={`text-[10px] font-semibold mt-1 transition-colors duration-200 ${isActive ? 'text-apple-blue' : 'text-apple-textMuted'}`}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/add" element={<PageWrapper isModal><AddExpense /></PageWrapper>} />
        <Route path="/history" element={<PageWrapper><ExpenseHistory /></PageWrapper>} />
        <Route path="/settlement" element={<PageWrapper><Settlement /></PageWrapper>} />
        <Route path="/analytics" element={<PageWrapper><MonthlyAnalytics /></PageWrapper>} />
        <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children, isModal }) {
  return (
    <motion.div
      initial={isModal ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.98 }}
      animate={isModal ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
      exit={isModal ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemberProvider>
          <PushRecovery />
          <CrossDeviceSync />
          <MonthProvider>
            <Router>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="min-h-[100dvh] max-w-md mx-auto bg-apple-bg relative selection:bg-apple-blue/20 flex flex-col shadow-2xl overflow-x-hidden transition-colors duration-300"
              >
                <Toaster position="top-center" toastOptions={{ 
                  className: '!bg-[#1D1D1F] dark:!bg-white dark:!text-[#1D1D1F] !text-white !rounded-full !px-6 !py-3 font-semibold text-sm backdrop-blur-md border border-white/10 dark:border-black/10 shadow-apple-lg',
                  duration: 3000
                }} />
                <TopMemberSelector />
                <div className="flex-1 overflow-y-auto pb-32">
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AnimatedRoutes />
                  </Suspense>
                </div>
                <BottomNav />
              </motion.div>
            </Router>
          </MonthProvider>
        </MemberProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
